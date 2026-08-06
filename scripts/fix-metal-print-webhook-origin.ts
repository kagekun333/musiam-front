import Stripe from "stripe";

const secret = process.env.STRIPE_SECRET_KEY ?? "";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
if (!/^sk_live_/.test(secret)) throw new Error("live Stripe key required");
if (new URL(siteUrl).origin !== "https://www.hakusyaku.xyz") throw new Error("unexpected production site origin");

async function main() {
  const stripe = new Stripe(secret);
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const matches = endpoints.data.filter((endpoint) => {
    const url = new URL(endpoint.url);
    return url.origin === "https://hakusyaku.xyz" && url.pathname === "/api/metal-print/webhook";
  });
  if (matches.length !== 1) throw new Error(`expected exactly one legacy metal-print webhook, found ${matches.length}`);
  const endpoint = matches[0];
  const updated = await stripe.webhookEndpoints.update(endpoint.id, {
    url: "https://www.hakusyaku.xyz/api/metal-print/webhook",
  });
  const updatedUrl = new URL(updated.url);
  if (updatedUrl.origin !== "https://www.hakusyaku.xyz" || updatedUrl.pathname !== "/api/metal-print/webhook") {
    throw new Error("webhook origin update did not persist");
  }
  console.log(JSON.stringify({
    ok: true,
    webhookOrigin: updatedUrl.origin,
    webhookPath: updatedUrl.pathname,
    status: updated.status,
    enabledEventsPreserved: updated.enabled_events,
    secretRotated: false,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "webhook origin update failed");
  process.exitCode = 1;
});
