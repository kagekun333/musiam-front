import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getMetalPrintOpsHealth } from "../src/lib/metal-print-redis.server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(root, "ops/metal-print-vip/daily-ops-health-snapshot.json");

async function main() {
  const health = await getMetalPrintOpsHealth();
  const output = { generatedAt: new Date().toISOString(), evidenceClass: "DURABLE_DAILY_OPS_RECORDS", ...health };
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify(output, null, 2));
}

void main();
