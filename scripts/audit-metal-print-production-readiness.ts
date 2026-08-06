import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(root, "ops", "metal-print-vip", "production-connection-state.json");
const required = [
  "STRIPE_SECRET_KEY",
  "STRIPE_METAL_PRINT_WEBHOOK_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "METAL_PRINT_IDENTITY_SECRET",
  "NEXT_PUBLIC_SITE_URL",
] as const;

function parseEnvFile(filePath: string) {
  const result: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return result;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match) continue;
    const value = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
    result[match[1]] = value;
  }
  return result;
}

const fileValues = {
  ...parseEnvFile(path.join(root, ".env")),
  ...parseEnvFile(path.join(root, ".env.local")),
};
const value = (name: typeof required[number]) => process.env[name] ?? fileValues[name] ?? "";
const redisUrl = () => value("UPSTASH_REDIS_REST_URL") || process.env.KV_REST_API_URL || fileValues.KV_REST_API_URL || "";
const redisToken = () => value("UPSTASH_REDIS_REST_TOKEN") || process.env.KV_REST_API_TOKEN || fileValues.KV_REST_API_TOKEN || "";
const placeholder = (candidate: string) => !candidate || /REPLACE|YOUR_|placeholder/i.test(candidate);
const checks = {
  STRIPE_SECRET_KEY: /^sk_(test|live)_/.test(value("STRIPE_SECRET_KEY")) && !placeholder(value("STRIPE_SECRET_KEY")),
  STRIPE_METAL_PRINT_WEBHOOK_SECRET: /^whsec_/.test(value("STRIPE_METAL_PRINT_WEBHOOK_SECRET")) && !placeholder(value("STRIPE_METAL_PRINT_WEBHOOK_SECRET")),
  UPSTASH_REDIS_REST_URL: /^https:\/\//.test(redisUrl()) && !placeholder(redisUrl()),
  UPSTASH_REDIS_REST_TOKEN: redisToken().length >= 20 && !placeholder(redisToken()),
  METAL_PRINT_IDENTITY_SECRET: value("METAL_PRINT_IDENTITY_SECRET").length >= 32 && !placeholder(value("METAL_PRINT_IDENTITY_SECRET")),
  NEXT_PUBLIC_SITE_URL: /^https?:\/\//.test(value("NEXT_PUBLIC_SITE_URL")) && !placeholder(value("NEXT_PUBLIC_SITE_URL")),
};
const stripeMode = value("STRIPE_SECRET_KEY").startsWith("sk_live_") ? "live"
  : value("STRIPE_SECRET_KEY").startsWith("sk_test_") ? "test"
    : "unconfigured";
const readyForSandboxE2e = Object.values(checks).every(Boolean) && stripeMode === "test";

const report = {
  generatedAt: new Date().toISOString(),
  evidenceClass: "LOCAL_SECRET_PRESENCE_ONLY",
  checks,
  stripeMode,
  readyForSandboxE2e,
  readyForLiveSales: false,
  reason: readyForSandboxE2e
    ? "Local formats are present; provider connectivity and signed test events are still required."
    : "One or more required server-side settings are missing or placeholder values.",
  safety: "Secret values are never serialized or printed. Live-sales readiness cannot be granted by this local presence audit.",
};

fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!readyForSandboxE2e) process.exitCode = 2;
