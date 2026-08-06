import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const config of [
  { file: "campaign-distribution-plan-2026-07.csv", campaign: "metal_print_inbound" },
  { file: "campaign-distribution-plan-en-2026-07.csv", campaign: "metal_print_inbound_en" },
]) {
  const file = path.join(root, "ops/metal-print-vip", config.file);
  const rows = parse(fs.readFileSync(file, "utf8"), { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  assert.equal(rows.length, 60, "12 assets x 5 channels required");
  assert.equal(new Set(rows.map((row) => row.tracked_url)).size, 60, "tracked URLs must be unique");
  assert.equal(new Set(rows.map((row) => row.asset_id)).size, 12, "all assets required");
  assert.equal(new Set(rows.map((row) => row.channel)).size, 5, "all channels required");
  for (const row of rows) {
    const url = new URL(row.tracked_url);
    assert.equal(url.origin, "https://www.hakusyaku.xyz");
    assert.equal(url.searchParams.get("utm_source"), row.channel);
    assert.equal(url.searchParams.get("utm_medium"), "organic_social");
    assert.equal(url.searchParams.get("utm_campaign"), config.campaign);
    assert.equal(url.searchParams.get("utm_content"), row.asset_id);
    assert.equal(row.external_post_state, "HUMAN_APPROVAL_REQUIRED");
    assert.ok(fs.existsSync(path.join(root, "public", row.visual_path.replace(/^\//, ""))), `${row.asset_id}: visual missing`);
  }
}
console.log("metal-print growth ops: PASS — 120 JA/EN tracked placements, 24 visuals, 5 channels, external-post gate");
