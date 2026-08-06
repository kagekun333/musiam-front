import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ledgerPath = path.join(root, "ops/audience-engine/abi-hakusyaku-launch-wave-01-ledger.csv");
const funnel = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip/first-party-funnel-snapshot.json"), "utf8"));
const pipeline = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip/pipeline-evidence-snapshot.json"), "utf8"));
const revenue = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip/revenue-evidence-snapshot.json"), "utf8"));
const auditPath = path.join(root, "ops/audience-engine/abi-hakusyaku-launch-wave-01-first-party-sync.json");

if (funnel.evidenceClass !== "FIRST_PARTY_REDIS_OBSERVED") throw new Error("production first-party funnel evidence required");
if (pipeline.evidenceClass !== "DURABLE_CONSULTATION_RECORDS") throw new Error("durable consultation evidence required");
if (revenue.evidenceClass !== "DURABLE_STRIPE_PAYMENT_LEDGER") throw new Error("durable Stripe revenue evidence required");

function parseCsv(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) { values.push(value); value = ""; }
    else value += character;
  }
  values.push(value);
  return values;
}

const escapeCsv = (value) => `"${String(value).replaceAll('"', '""')}"`;
const lines = fs.readFileSync(ledgerPath, "utf8").trim().split("\n");
const header = parseCsv(lines[0]);
const index = Object.fromEntries(header.map((name, position) => [name, position]));
const campaign = "abi_hakusyaku_launch_wave_01";
const updated = [];
const unmatched = [];
const output = [header.map(escapeCsv).join(",")];

for (const line of lines.slice(1)) {
  const values = parseCsv(line);
  if (values[index.status] !== "PUBLISHED") {
    output.push(values.map(escapeCsv).join(","));
    continue;
  }
  const placementId = values[index.placement_id];
  const platform = values[index.platform];
  const content = values[index.post_id];
  const key = JSON.stringify([campaign, platform, content]);
  const funnelPlacement = funnel.byPlacement?.[key];
  const pipelinePlacement = pipeline.byPlacement?.[key];
  const revenuePlacement = revenue.byPlacement?.[key];
  const changes = {};
  const setMonotonic = (field, observed) => {
    if (!Number.isFinite(observed)) return;
    const previous = values[index[field]] === "" ? null : Number(values[index[field]]);
    const next = previous === null ? observed : Math.max(previous, observed);
    if (String(next) !== values[index[field]]) { values[index[field]] = String(next); changes[field] = { previous, next }; }
  };
  if (funnelPlacement) {
    setMonotonic("chat_sessions", Number(funnelPlacement.metrics?.metal_chat_start ?? 0));
    setMonotonic("first_messages", Number(funnelPlacement.metrics?.metal_first_message ?? 0));
    setMonotonic("consultations", Number(funnelPlacement.metrics?.metal_consultation_submitted ?? 0));
  }
  if (pipelinePlacement) {
    setMonotonic("dossier_accepted", Number(pipelinePlacement.dossierAccepted));
    setMonotonic("purchase_intent", Number(pipelinePlacement.purchaseIntent));
  }
  if (revenuePlacement && Number.isFinite(Number(revenuePlacement.netNonRefundedYen))) {
    const previous = values[index.net_non_refunded_yen] === "" ? null : Number(values[index.net_non_refunded_yen]);
    const next = Number(revenuePlacement.netNonRefundedYen);
    if (String(next) !== values[index.net_non_refunded_yen]) {
      values[index.net_non_refunded_yen] = String(next);
      changes.net_non_refunded_yen = { previous, next, refundAware: true };
    }
  }
  if (Object.keys(changes).length > 0) updated.push({ placementId, key, changes });
  if (!funnelPlacement && !pipelinePlacement && !revenuePlacement) unmatched.push(placementId);
  output.push(values.map(escapeCsv).join(","));
}

fs.writeFileSync(ledgerPath, `${output.join("\n")}\n`);
const audit = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  evidenceClass: "FIRST_PARTY_PLACEMENT_JOIN",
  campaign,
  updated,
  unchangedPublishedWithoutObservedPlacement: unmatched,
  revenueAttributionAvailable: revenue.byPlacement !== undefined,
  unattributedNetNonRefundedYen: Number(revenue.unattributedNetNonRefundedYen ?? revenue.netNonRefundedYen),
  safety: "Only exact campaign/source/content joins are written. Aggregate or unattributed revenue is never allocated to a placement. Verification traffic is absent from production snapshots.",
};
fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify({ status: "PASS", updatedPlacements: updated.length, unmatchedPublished: unmatched.length, revenueAttributionAvailable: audit.revenueAttributionAvailable, unattributedNetNonRefundedYen: audit.unattributedNetNonRefundedYen }, null, 2));
