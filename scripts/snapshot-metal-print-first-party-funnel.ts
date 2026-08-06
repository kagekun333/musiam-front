import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { summarizeMetalPrintFunnel } from "../src/lib/metal-print-redis.server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const days = Number(process.env.METAL_PRINT_FUNNEL_DAYS ?? "30");
const mode = process.env.METAL_PRINT_FUNNEL_MODE === "verification" ? "verification" : "production";
const outputPath = path.join(root, "ops/metal-print-vip", mode === "verification" ? "first-party-funnel-verification-snapshot.json" : "first-party-funnel-snapshot.json");

async function main() {
  if (!Number.isInteger(days) || days < 1 || days > 90) throw new Error("METAL_PRINT_FUNNEL_DAYS must be 1..90");
  const summary = await summarizeMetalPrintFunnel(days, mode);
  const output = { generatedAt: new Date().toISOString(), evidenceClass: "FIRST_PARTY_REDIS_OBSERVED", ...summary };
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify(output, null, 2));
}

void main();
