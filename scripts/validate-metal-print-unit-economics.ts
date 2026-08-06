import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculateMetalPrintUnitEconomics } from "../src/lib/metal-print-unit-economics";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ledger = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip/economics-evidence-ledger.json"), "utf8"));
assert.deepEqual(ledger.requiredRegions, ["JP", "US", "EU"]);
assert.equal(ledger.approvedScenarioId, ledger.quoteScenarioId);
assert.ok(ledger.scenarios.length >= 1, "at least one candidate quote scenario is required");
assert.ok(ledger.quoteScenarioId, "quoteScenarioId is required once regional quotes exist");

const requiredNumericFields = [
  "productionYen", "shippingYen", "packagingYen", "customsDutyYen",
  "indirectTaxLiabilityYen", "paymentFeeRate", "paymentFixedFeeYen",
  "replacementRate", "customerAcquisitionCostYen", "fxRiskReserveYen",
];
for (const scenario of ledger.scenarios) {
  assert.ok(scenario.id);
  assert.ok(scenario.quoteReference);
  assert.ok(scenario.quoteIssuedAt);
  assert.ok(scenario.quoteExpiresAt);
  assert.deepEqual(new Set(scenario.regions.map((region: { region: string }) => region.region)), new Set(ledger.requiredRegions));
  if (scenario.id === ledger.quoteScenarioId) {
    assert.equal(scenario.approvalStatus, "APPROVED_WITH_ENFORCED_CAC_CAP");
    assert.equal(scenario.inputsComplete, true);
    assert.equal(scenario.controlAssumptions.customerAcquisitionCostCapYen, 20_000);
    assert.equal(scenario.controlAssumptions.enforcement, "STOP_NEW_PAID_ACQUISITION_IF_TRAILING_ATTRIBUTED_CAC_EXCEEDS_CAP");
  }
  for (const region of scenario.regions) {
    assert.ok(ledger.acceptedEvidenceClasses.includes(region.evidenceClass));
    for (const field of requiredNumericFields) assert.ok(Number.isFinite(region[field]), `${scenario.id}/${region.region}: ${field}`);
    if (scenario.id === ledger.approvedScenarioId) {
      assert.equal(region.customerAcquisitionCostYen, 20_000, `${scenario.id}/${region.region}: CAC cap not modeled`);
      assert.equal(region.customerAcquisitionCostEvidenceClass, "ENFORCED_CAMPAIGN_CAC_CAP", `${scenario.id}/${region.region}: CAC cap evidence missing`);
      const result = calculateMetalPrintUnitEconomics({
        priceYen: scenario.priceYen,
        productionYen: region.productionYen,
        shippingYen: region.shippingYen,
        packagingYen: region.packagingYen,
        customsDutyYen: region.customsDutyYen,
        indirectTaxLiabilityYen: region.indirectTaxLiabilityYen,
        paymentFeeRate: region.paymentFeeRate,
        paymentFixedFeeYen: region.paymentFixedFeeYen,
        replacementRate: region.replacementRate,
        customerAcquisitionCostYen: region.customerAcquisitionCostYen,
        fxRiskReserveYen: region.fxRiskReserveYen,
      });
      assert.equal(result.margin60Pass, true, `${scenario.id}/${region.region}: 60% margin fails at enforced CAC cap`);
    }
  }
}
assert.ok(ledger.scenarios.some((scenario: { id: string }) => scenario.id === ledger.quoteScenarioId));
if (ledger.approvedScenarioId !== null) {
  assert.ok(ledger.scenarios.some((scenario: { id: string }) => scenario.id === ledger.approvedScenarioId));
}

const strong = calculateMetalPrintUnitEconomics({
  priceYen: 330_000,
  productionYen: 20_000,
  shippingYen: 10_000,
  packagingYen: 2_000,
  customsDutyYen: 3_000,
  indirectTaxLiabilityYen: 30_000,
  paymentFeeRate: 0.036,
  paymentFixedFeeYen: 0,
  replacementRate: 0.05,
  customerAcquisitionCostYen: 40_000,
  fxRiskReserveYen: 5_000,
});
assert.equal(strong.landedCostYen, 35_000);
assert.equal(strong.paymentFeeYen, 11_880);
assert.equal(strong.replacementReserveYen, 1_750);
assert.equal(strong.margin60Pass, true);
assert.equal(strong.maximumCacAt60MarginYen, 48_370);

const taxAndFxOmitted = calculateMetalPrintUnitEconomics({
  priceYen: 165_000,
  productionYen: 50_000,
  shippingYen: 20_000,
  packagingYen: 5_000,
  customsDutyYen: 5_000,
  indirectTaxLiabilityYen: 15_000,
  paymentFeeRate: 0.036,
  paymentFixedFeeYen: 0,
  replacementRate: 0.1,
  customerAcquisitionCostYen: 30_000,
  fxRiskReserveYen: 5_000,
});
assert.equal(taxAndFxOmitted.margin60Pass, false);
assert.ok(taxAndFxOmitted.maximumCacAt60MarginYen < 0, "negative CAC ceiling must block paid acquisition");

console.log("metal-print unit economics validation PASS");
