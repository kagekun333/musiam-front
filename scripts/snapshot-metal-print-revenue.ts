import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { summarizeMetalPrintRevenue } from "../src/lib/metal-print-redis.server";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = path.join(root, "ops", "metal-print-vip", "revenue-evidence-snapshot.json");
const failurePath = path.join(root, "ops", "metal-print-vip", "revenue-evidence-refresh-failure.json");
const month = process.env.METAL_PRINT_REVENUE_MONTH ?? new Date().toISOString().slice(0, 7);

function save(filePath: string, snapshot: Record<string, unknown>) {
  fs.writeFileSync(filePath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(JSON.stringify(snapshot, null, 2));
}

void summarizeMetalPrintRevenue(month).then((summary) => {
  save(snapshotPath, {
    generatedAt: new Date().toISOString(),
    evidenceClass: "DURABLE_STRIPE_PAYMENT_LEDGER",
    ...summary,
    privacy: "Only aggregate payment amounts and counts are included.",
  });
}).catch((error) => {
  save(failurePath, {
    generatedAt: new Date().toISOString(),
    evidenceClass: "EVIDENCE_UNAVAILABLE",
    month,
    reason: error instanceof Error ? error.message : "revenue snapshot failed",
    paymentCount: null,
    netNonRefundedYen: null,
    targetProven: false,
    privacy: "Only aggregate payment amounts and counts are included.",
    preservation: "The last durable revenue snapshot was not overwritten.",
  });
  process.exitCode = 1;
});
