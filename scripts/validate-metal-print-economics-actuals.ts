import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { summarizeMetalPrintEconomicsActuals, type MetalPrintEconomicsActualLedger } from "../src/lib/metal-print-economics-actuals";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ledger = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip/economics-evidence-ledger.json"), "utf8"));
const actuals = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip/economics-actuals-evidence.json"), "utf8"));
const scenario = ledger.scenarios.find((item: { id: string }) => item.id === ledger.approvedScenarioId);

assert.ok(scenario, "approved launch scenario missing");
assert.equal(scenario.approvalStatus, "APPROVED_WITH_ENFORCED_CAC_CAP");
for (const region of scenario.regions) {
  assert.equal(region.customerAcquisitionCostEvidenceClass, "ENFORCED_CAMPAIGN_CAC_CAP");
  assert.notEqual(region.customerAcquisitionCostEvidenceClass, "MEASURED_ACTUAL");
}
assert.equal(actuals.gates.paidInvoiceAndFulfillment, actuals.observed.paidFulfilledOrders >= actuals.thresholds.paidFulfilledOrdersMin && actuals.observed.vendorPaidInvoices >= 1);
assert.equal(actuals.gates.actualStripeFee, actuals.observed.stripeSettlementSamples >= actuals.thresholds.stripeSettlementSamplesMin);
assert.equal(actuals.gates.measuredCac, actuals.observed.maturedPaidCustomers >= actuals.thresholds.maturedPaidCustomersForMeasuredCacMin && Number.isFinite(actuals.observed.measuredCustomerAcquisitionCostYen));
assert.equal(actuals.gates.replacementObservation, actuals.observed.fulfilledUnitsObserved >= actuals.thresholds.fulfilledUnitsForReplacementObservationMin && Number.isFinite(actuals.observed.measuredReplacementRate));
assert.equal(actuals.gates.observedContributionMargin60, actuals.observed.measuredContributionMarginRate !== null && actuals.observed.measuredContributionMarginRate >= 0.6);

const hash = "a".repeat(64);
const synthetic: MetalPrintEconomicsActualLedger = {
  schemaVersion: 1,
  privacy: "synthetic",
  orders: Array.from({ length: 10 }, (_, index) => ({
    evidenceId: `ACTUAL-ORDER-${String(index + 1).padStart(2, "0")}`,
    editionId: "VIP-METAL-2026-07-NATURA",
    region: "JP" as const,
    paidAt: "2026-07-01T00:00:00.000Z",
    fulfilledAt: "2026-07-10T00:00:00.000Z",
    grossPaidYen: 330_000,
    orderReferenceHmac: String(index + 10).padStart(64, "0"),
    vendorInvoiceSha256: hash,
    productionYen: 26_400,
    shippingYen: 5_100,
    packagingYen: 0,
    customsDutyYen: 0,
    indirectTaxLiabilityYen: 30_000,
    stripeSettlementSha256: hash,
    fulfillmentEvidenceSha256: hash,
    trackingReferenceHash: hash,
    physicalProofId: index === 0 ? "proof_order_00000001" : undefined,
    stripeFeeYen: 11_880,
    fxCostYen: 0,
    replacementRequired: index === 0,
    replacementCostYen: index === 0 ? 31_500 : 0,
    reviewToken: `APPROVE_ECONOMICS_ACTUAL:ACTUAL-ORDER-${String(index + 1).padStart(2, "0")}`,
  })),
  cacCohorts: [{
    cohortId: "CAC-COHORT-01",
    maturedAt: "2026-07-20T00:00:00.000Z",
    uniquePaidCustomerHmacs: ["1".repeat(64), "2".repeat(64), "3".repeat(64)],
    attributedAcquisitionSpendYen: 30_000,
    measuredOperatingCostYen: 30_000,
    evidenceSha256: hash,
    reviewToken: "APPROVE_ECONOMICS_CAC:CAC-COHORT-01",
  }],
};
const summary = summarizeMetalPrintEconomicsActuals(synthetic);
assert.equal(summary.paidFulfilledOrders, 10);
assert.equal(summary.maturedPaidCustomers, 3);
assert.equal(summary.measuredCustomerAcquisitionCostYen, 20_000);
assert.equal(summary.measuredReplacementRate, 0.1);
assert.ok((summary.measuredContributionMarginRate ?? 0) >= 0.6);
assert.throws(() => summarizeMetalPrintEconomicsActuals({ ...synthetic, orders: [{ ...synthetic.orders[0], reviewToken: "invalid" }] }), /Human review token missing/);
assert.throws(() => summarizeMetalPrintEconomicsActuals({ ...synthetic, orders: [synthetic.orders[0], { ...synthetic.orders[1], orderReferenceHmac: synthetic.orders[0].orderReferenceHmac }] }), /duplicate order-reference HMAC/);
assert.throws(() => summarizeMetalPrintEconomicsActuals({ ...synthetic, orders: [{ ...synthetic.orders[0], fulfillmentEvidenceSha256: "invalid" }] }), /evidence SHA-256 missing/);
assert.throws(() => summarizeMetalPrintEconomicsActuals({ ...synthetic, orders: [{ ...synthetic.orders[0], productionYen: 0 }] }), /zero production cost/);
assert.throws(() => summarizeMetalPrintEconomicsActuals({ ...synthetic, orders: [{ ...synthetic.orders[0], stripeFeeYen: 0 }] }), /zero Stripe fee/);

console.log(`[validate-metal-print-economics-actuals] PASS — hash-reviewed ledger aggregation; current fulfilled=${actuals.observed.paidFulfilledOrders}, synthetic margin=${(summary.measuredContributionMarginRate! * 100).toFixed(2)}%`);
