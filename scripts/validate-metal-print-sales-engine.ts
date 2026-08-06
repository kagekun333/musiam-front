import assert from "node:assert/strict";
import { routeVendor, scoreSalesCandidate } from "../src/lib/metal-print-sales-engine";

const candidate = scoreSalesCandidate({
  id: "test-ignition",
  title: "IGNITION",
  moodTags: ["future", "energy", "abstract"],
  narrative: "A vivid ignition point for a design office and a technology founder's meeting room.".repeat(3),
  hasLocalCover: true,
  previewLongSide: 3000,
  hasPrintMaster: true,
});

assert.equal(candidate.evidenceClass, "CATALOG_HYPOTHESIS");
assert.equal(candidate.segments[0], "design-office");
assert.equal(candidate.blockers.length, 0);
assert.ok(candidate.score >= 70);

assert.deepEqual(routeVendor({ destination: "JP", tier: "COLLECTOR" }), {
  vendor: "metal-print-japan",
  status: "PROOF_REQUIRED",
});
assert.deepEqual(routeVendor({ destination: "US", tier: "COLLECTOR" }), {
  vendor: "prodigi",
  status: "PROOF_REQUIRED",
});
assert.deepEqual(routeVendor({ destination: "EU", tier: "GLOBAL_STANDARD" }), {
  vendor: "gelato",
  status: "QUOTE_REQUIRED",
});
assert.deepEqual(routeVendor({ destination: "OTHER", tier: "LARGE_CUSTOM" }), {
  vendor: "pictorem",
  status: "API_CLARIFICATION_REQUIRED",
});

console.log("metal-print sales engine validation: PASS");
