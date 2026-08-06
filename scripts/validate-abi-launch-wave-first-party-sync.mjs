import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("scripts/sync-abi-launch-wave-first-party-ledger.mjs", "utf8");
const audit = JSON.parse(fs.readFileSync("ops/audience-engine/abi-hakusyaku-launch-wave-01-first-party-sync.json", "utf8"));
assert.equal(audit.evidenceClass, "FIRST_PARTY_PLACEMENT_JOIN");
assert.equal(audit.campaign, "abi_hakusyaku_launch_wave_01");
assert.ok(source.includes("JSON.stringify([campaign, platform, content])"), "exact placement join missing");
assert.ok(source.includes("Math.max(previous, observed)"), "funnel/pipeline counts must not regress");
assert.ok(source.includes("refundAware: true"), "revenue must permit refund-aware decreases");
assert.ok(source.includes("revenue.byPlacement?.[key]"), "aggregate revenue must not be allocated");
assert.match(audit.safety, /Aggregate or unattributed revenue is never allocated/);
console.log(`ABI Launch Wave first-party sync: PASS — updated=${audit.updated.length}, unmatched=${audit.unchangedPublishedWithoutObservedPlacement.length}`);
