import assert from "node:assert/strict";
import { calculatePipelineRequirement, wilsonLowerBound } from "../src/lib/metal-print-pipeline-requirement";

const base = { targetGrossPaidYen: 3_000_000, unitPriceYen: 330_000 };

const noEvidence = calculatePipelineRequirement({ ...base, maturedQualified: 0, maturedPaid: 0 });
assert.equal(noEvidence.paidOrdersNeeded, 10);
assert.equal(noEvidence.planningCloseRate, 0.1);
assert.equal(noEvidence.requiredQualifiedProspects, 100);

const smallLuckyCohort = calculatePipelineRequirement({ ...base, maturedQualified: 5, maturedPaid: 5 });
assert.equal(smallLuckyCohort.observedRateEligible, false);
assert.equal(smallLuckyCohort.requiredQualifiedProspects, 100);

const matureStrongCohort = calculatePipelineRequirement({ ...base, maturedQualified: 100, maturedPaid: 30 });
assert.equal(matureStrongCohort.planningCloseRate, 0.1, "observed success must not weaken the conservative 10% gate");

const matureWeakCohort = calculatePipelineRequirement({ ...base, maturedQualified: 100, maturedPaid: 8 });
assert.ok(matureWeakCohort.planningCloseRate < 0.1);
assert.ok(matureWeakCohort.requiredQualifiedProspects > 100);

const noConversions = calculatePipelineRequirement({ ...base, maturedQualified: 30, maturedPaid: 0 });
assert.equal(noConversions.requiredQualifiedProspects, Number.POSITIVE_INFINITY);
assert.equal(noConversions.requiredQualifiedPipelineYen, null);

assert.ok(wilsonLowerBound(8, 100) < 0.08);
console.log("metal-print pipeline requirement validation PASS");
