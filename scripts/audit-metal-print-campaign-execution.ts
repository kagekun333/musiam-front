import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ops = path.join(root, "ops", "metal-print-vip");
const locale = process.env.METAL_PRINT_CAMPAIGN_LOCALE === "en" ? "en" : "ja";
const suffix = locale === "en" ? "-en" : "";
const plan = parse(fs.readFileSync(path.join(ops, `campaign-distribution-plan${suffix}-2026-07.csv`), "utf8"), { columns: true, skip_empty_lines: true }) as Record<string, string>[];
const ledger = parse(fs.readFileSync(path.join(ops, `campaign-execution-ledger${suffix}-2026-07.csv`), "utf8"), { columns: true, skip_empty_lines: true }) as Record<string, string>[];
const funnel = JSON.parse(fs.readFileSync(path.join(ops, "first-party-funnel-snapshot.json"), "utf8"));
const pipeline = JSON.parse(fs.readFileSync(path.join(ops, "pipeline-evidence-snapshot.json"), "utf8"));
const validStates = new Set(["HUMAN_APPROVAL_REQUIRED", "APPROVED", "PUBLISHED", "PAUSED"]);
const planIds = new Set(plan.map((row) => `${row.asset_id}:${row.channel}`));

assert.equal(ledger.length, plan.length, "execution ledger must cover every planned placement");
assert.equal(new Set(ledger.map((row) => row.placement_id)).size, ledger.length, "duplicate placement_id");
assert.deepEqual(new Set(ledger.map((row) => row.placement_id)), planIds, "execution ledger and distribution plan differ");

for (const row of ledger) {
  assert.ok(validStates.has(row.approval_state), `${row.placement_id}: invalid approval_state`);
  const expectedToken = `APPROVE_EXTERNAL_POST:${row.asset_id}:${row.channel}`;
  const spend = Number(row.spend_yen);
  assert.ok(Number.isFinite(spend) && spend >= 0, `${row.placement_id}: spend_yen must be nonnegative`);
  if (["APPROVED", "PUBLISHED", "PAUSED"].includes(row.approval_state)) {
    assert.equal(row.approval_token, expectedToken, `${row.placement_id}: exact approval token required`);
  }
  if (row.scheduled_at) assert.ok(Number.isFinite(Date.parse(row.scheduled_at)), `${row.placement_id}: scheduled_at is invalid`);
  if (["PUBLISHED", "PAUSED"].includes(row.approval_state)) {
    assert.ok(Number.isFinite(Date.parse(row.published_at)), `${row.placement_id}: published_at required`);
    const publishedUrl = new URL(row.published_url);
    assert.ok(["http:", "https:"].includes(publishedUrl.protocol), `${row.placement_id}: public post URL required`);
  } else {
    assert.equal(row.published_at, "", `${row.placement_id}: non-published row cannot claim published_at`);
    assert.equal(row.published_url, "", `${row.placement_id}: non-published row cannot claim published_url`);
  }
  if (!["PUBLISHED", "PAUSED"].includes(row.approval_state)) assert.equal(spend, 0, `${row.placement_id}: spend requires a published placement`);
}

const age = (generatedAt: string) => Date.now() - Date.parse(generatedAt);
const funnelAge = age(funnel.generatedAt);
const pipelineAge = age(pipeline.generatedAt);
const funnelLive = funnel.evidenceClass === "FIRST_PARTY_REDIS_OBSERVED" && funnel.mode === "production" && Number.isFinite(funnelAge) && funnelAge >= 0 && funnelAge <= 24 * 60 * 60 * 1000;
const pipelineLive = pipeline.evidenceClass === "DURABLE_CONSULTATION_RECORDS" && Number.isFinite(pipelineAge) && pipelineAge >= 0 && pipelineAge <= 24 * 60 * 60 * 1000;
const totalSpendYen = ledger.reduce((sum, row) => sum + Number(row.spend_yen), 0);
const qualified = pipelineLive ? Number(pipeline.qualified) : null;
const measuredCacYen = qualified && qualified > 0 ? Math.round(totalSpendYen / qualified) : null;
const published = ledger.filter((row) => row.approval_state === "PUBLISHED").length;

console.log(JSON.stringify({
  decision: published === 0 ? "AWAITING_EXTERNAL_POST_APPROVAL" : funnelLive && pipelineLive ? "MEASUREMENT_LIVE" : "REFRESH_EVIDENCE",
  locale,
  placements: ledger.length,
  approved: ledger.filter((row) => ["APPROVED", "PUBLISHED", "PAUSED"].includes(row.approval_state)).length,
  published,
  paused: ledger.filter((row) => row.approval_state === "PAUSED").length,
  totalSpendYen,
  qualified,
  measuredCacYen,
  controllingCacCeilingYen: 24728,
  cacWithinCeiling: measuredCacYen === null ? null : measuredCacYen <= 24728,
  funnelEvidenceLive: funnelLive,
  pipelineEvidenceLive: pipelineLive,
  truthBoundary: "CAC is emitted only from recorded spend and durable qualified consultations; zero qualified never becomes zero CAC.",
}, null, 2));
