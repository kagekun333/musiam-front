import { summarizeMetalPrintConsultations } from "../src/lib/metal-print-redis.server";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = path.join(root, "ops", "metal-print-vip", "pipeline-evidence-snapshot.json");
const failurePath = path.join(root, "ops", "metal-print-vip", "pipeline-evidence-refresh-failure.json");

function save(filePath: string, snapshot: Record<string, unknown>) {
  fs.writeFileSync(filePath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(JSON.stringify(snapshot, null, 2));
}

async function main() {
  const summary = await summarizeMetalPrintConsultations();
  save(snapshotPath, {
    generatedAt: new Date().toISOString(),
    evidenceClass: "DURABLE_CONSULTATION_RECORDS",
    ...summary,
    privacy: "No email address, free text, or individual consultation record is included in this snapshot.",
  });
}

void main().catch((error) => {
  const reason = error instanceof Error ? error.message : "pipeline snapshot failed";
  save(failurePath, {
    generatedAt: new Date().toISOString(),
    evidenceClass: "EVIDENCE_UNAVAILABLE",
    reason,
    qualified: null,
    nurture: null,
    pipelineValueJpy: null,
    maturedQualified: null,
    maturedQualifiedPaid: null,
    privacy: "No email address, free text, or individual consultation record is included in this snapshot.",
    preservation: "The last durable pipeline snapshot was not overwritten.",
  });
  process.exitCode = 1;
});
