import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Redis } from "@upstash/redis";
import Stripe from "stripe";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidencePath = path.join(root, "ops", "metal-print-vip", "production-provider-connectivity-evidence.json");

const stripeSecret = process.env.STRIPE_SECRET_KEY ?? "";
const redisUrl = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

if (!/^sk_(test|live)_/.test(stripeSecret)) throw new Error("Stripe key missing or invalid");
if (!/^https:\/\//.test(redisUrl) || redisToken.length < 20) throw new Error("Redis credentials missing or invalid");
if (!/^https:\/\//.test(siteUrl)) throw new Error("site URL missing or invalid");

async function main() {
  const stripe = new Stripe(stripeSecret);
  const redis = new Redis({ url: redisUrl, token: redisToken });
  const stripeMode = stripeSecret.startsWith("sk_live_") ? "live" : "test";
  const expectedWebhookPath = "/api/metal-print/webhook";
  const canaryKey = `metal-print:connectivity-canary:${randomUUID()}`;
  const canaryValue = randomUUID();

  const balance = await stripe.balance.retrieve();
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const matchingEndpoints = endpoints.data.filter((endpoint) => {
    try {
      return new URL(endpoint.url).pathname === expectedWebhookPath;
    } catch {
      return false;
    }
  });
  const requiredEvents = new Set(["checkout.session.completed", "checkout.session.expired", "charge.refunded"]);
  const matchingEnabledEndpoint = matchingEndpoints.some((endpoint) =>
    endpoint.status === "enabled" && [...requiredEvents].every((event) => endpoint.enabled_events.includes(event as Stripe.WebhookEndpointCreateParams.EnabledEvent)),
  );

  let redisRoundTripPassed = false;
  let canaryDeleted = false;
  try {
    await redis.set(canaryKey, canaryValue, { ex: 60 });
    redisRoundTripPassed = await redis.get<string>(canaryKey) === canaryValue;
  } finally {
    await redis.del(canaryKey);
    canaryDeleted = await redis.get(canaryKey) === null;
  }

  const report = {
  generatedAt: new Date().toISOString(),
  evidenceClass: "LIVE_PROVIDER_READ_AND_EPHEMERAL_REDIS_CANARY",
  stripeMode,
  stripeApiReachable: balance.object === "balance",
  webhookPath: expectedWebhookPath,
  matchingWebhookEndpointCount: matchingEndpoints.length,
  matchingWebhookEndpointOrigins: [...new Set(matchingEndpoints.map((endpoint) => new URL(endpoint.url).origin))],
  matchingEnabledEndpoint,
  requiredWebhookEvents: [...requiredEvents],
  redisRoundTripPassed,
  canaryDeleted,
  siteOriginConfigured: new URL(siteUrl).origin,
  safety: "No secret values, account IDs, endpoint IDs, customer data or payment data are serialized. The Redis canary has a 60-second TTL and is explicitly deleted.",
  claimBoundary: "This proves live provider connectivity and endpoint registration. It does not prove a Stripe-delivered signed event, a paid Checkout Session or a production inventory transition.",
  };

  fs.writeFileSync(evidencePath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!report.stripeApiReachable || !redisRoundTripPassed || !canaryDeleted) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "production connectivity probe failed");
  process.exitCode = 1;
});
