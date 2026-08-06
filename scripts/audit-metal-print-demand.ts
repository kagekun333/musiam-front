import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pipelinePath = path.join(root, "ops", "metal-print-vip", "demand-pipeline.csv");

if (!fs.existsSync(pipelinePath)) throw new Error("[audit-metal-print-demand] run init:metal-print-demand first");

type Prospect = Record<string, string>;
const rows = parse(fs.readFileSync(pipelinePath, "utf8"), { columns: true, skip_empty_lines: true, trim: true }) as Prospect[];
const requiredHeaders = ["prospectId", "segment", "source", "owner", "consentState", "stage", "nextAction", "paymentState"];
for (const header of requiredHeaders) {
  if (!rows.every((row) => Object.prototype.hasOwnProperty.call(row, header))) throw new Error(`[audit-metal-print-demand] missing column ${header}`);
}

const ids = new Set(rows.map((row) => row.prospectId));
if (ids.size !== rows.length) throw new Error("[audit-metal-print-demand] duplicate prospectId");

const isRealNamed = (row: Prospect) => Boolean(row.source && row.owner && row.nextAction && row.stage !== "research_required");
const isContactable = (row: Prospect) => isRealNamed(row) && ["opted_in", "existing_relationship", "approved_outreach"].includes(row.consentState);
const stages = ["qualified", "dossier_accepted", "purchase_intent", "checkout_started", "paid"];
const countStageOrLater = (stage: string) => {
  const threshold = stages.indexOf(stage);
  return rows.filter((row) => stages.indexOf(row.stage) >= threshold).length;
};

const report = {
  slots: rows.length,
  realNamedProspects: rows.filter(isRealNamed).length,
  contactableProspects: rows.filter(isContactable).length,
  qualified: countStageOrLater("qualified"),
  dossierAccepted: countStageOrLater("dossier_accepted"),
  purchaseIntent: countStageOrLater("purchase_intent"),
  paid: rows.filter((row) => row.stage === "paid" && row.paymentState === "paid_non_refunded").length,
  segmentSlots: Object.fromEntries([...new Set(rows.map((row) => row.segment))].map((segment) => [segment, rows.filter((row) => row.segment === segment).length])),
  decision: rows.filter(isRealNamed).length >= 150 ? "NAMED_TARGET_MET" : "RESEARCH_REQUIRED"
};

console.log(JSON.stringify(report, null, 2));
