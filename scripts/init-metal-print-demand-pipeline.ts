import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "ops", "metal-print-vip", "demand-pipeline.csv");

if (fs.existsSync(output)) {
  throw new Error(`[init-metal-print-demand] refusing to overwrite ${output}`);
}

const segments = [
  ["existing_fan", 45],
  ["private_collector", 40],
  ["space_business", 40],
  ["corporate_gift", 25]
] as const;
const header = [
  "prospectId", "segment", "source", "owner", "consentState", "interestedWork", "desiredSpace",
  "budgetBand", "purchaseTiming", "decisionMaker", "stage", "dossierId", "quotedPriceYen",
  "priceAuthority", "nextAction", "nextActionAt", "lostReason", "paymentState", "editionId", "serialNumber"
];
const rows: string[][] = [];
let sequence = 1;
for (const [segment, count] of segments) {
  for (let index = 0; index < count; index += 1) {
    rows.push([
      `MP-${String(sequence).padStart(4, "0")}`, segment, "", "", "unknown", "", "", "", "", "",
      "research_required", "", "", "unassigned", "identify_real_prospect", "", "", "not_started", "", ""
    ]);
    sequence += 1;
  }
}

fs.writeFileSync(output, [header, ...rows].map((row) => row.join(",")).join("\n") + "\n");
console.log(`[init-metal-print-demand] CREATED rows=${rows.length} path=${output}`);
