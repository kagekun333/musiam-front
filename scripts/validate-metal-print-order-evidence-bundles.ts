import assert from "node:assert/strict";
import fs from "node:fs";
import { summarizeMetalPrintEconomicsActuals, type MetalPrintEconomicsActualLedger } from "../src/lib/metal-print-economics-actuals";
import { buildRegisteredMetalPrintOrderLedger, validateMetalPrintOrderProofLink } from "../src/lib/metal-print-order-evidence-registration";

const actuals = JSON.parse(fs.readFileSync("ops/metal-print-vip/economics-actuals-ledger.json", "utf8")) as MetalPrintEconomicsActualLedger;
const proofs = JSON.parse(fs.readFileSync("ops/metal-print-vip/proof-evidence-ledger.json", "utf8")) as { proofs: Array<{ id: string; editionId: string; approved: boolean }> };
summarizeMetalPrintEconomicsActuals(actuals);

function validateProofLinks(orders: MetalPrintEconomicsActualLedger["orders"], proofRecords: Array<{ id: string; editionId: string; approved: boolean }>) {
  for (const order of orders) {
    validateMetalPrintOrderProofLink(order, proofRecords);
  }
}
validateProofLinks(actuals.orders, proofs.proofs);

const hash = "a".repeat(64);
const syntheticLedger: MetalPrintEconomicsActualLedger = {
  schemaVersion: 1,
  privacy: "synthetic",
  orders: [{
    evidenceId: "ACTUAL-BUNDLE-01",
    editionId: "VIP-METAL-2026-07-NATURA",
    region: "JP",
    paidAt: "2026-07-01T00:00:00.000Z",
    fulfilledAt: "2026-07-10T00:00:00.000Z",
    grossPaidYen: 330000,
    orderReferenceHmac: "1".repeat(64),
    vendorInvoiceSha256: hash,
    productionYen: 26400,
    shippingYen: 5100,
    packagingYen: 0,
    customsDutyYen: 0,
    indirectTaxLiabilityYen: 30000,
    stripeSettlementSha256: hash,
    fulfillmentEvidenceSha256: hash,
    trackingReferenceHash: hash,
    physicalProofId: "proof_bundle_00000001",
    stripeFeeYen: 11880,
    fxCostYen: 0,
    replacementRequired: false,
    replacementCostYen: 0,
    reviewToken: "APPROVE_ECONOMICS_ACTUAL:ACTUAL-BUNDLE-01"
  }],
  cacCohorts: []
};
summarizeMetalPrintEconomicsActuals(syntheticLedger);
const syntheticProof = { id: "proof_bundle_00000001", editionId: "VIP-METAL-2026-07-NATURA", approved: true };
validateProofLinks(syntheticLedger.orders, [syntheticProof]);
assert.throws(() => validateProofLinks(syntheticLedger.orders, []), /referenced physical proof missing/);
assert.throws(() => validateProofLinks(syntheticLedger.orders, [{ ...syntheticProof, editionId: "OTHER" }]), /physical proof Edition mismatch/);
assert.throws(() => validateProofLinks(syntheticLedger.orders, [{ ...syntheticProof, approved: false }]), /not Human-approved/);

const candidate = { ...syntheticLedger.orders[0] } as Record<string, unknown>;
delete candidate.reviewToken;
const emptyLedger: MetalPrintEconomicsActualLedger = { schemaVersion: 1, privacy: "synthetic", orders: [], cacCohorts: [] };
const registered = buildRegisteredMetalPrintOrderLedger({
  ledger: emptyLedger,
  candidate,
  proofs: [syntheticProof],
  humanApprovalToken: "APPROVE_ECONOMICS_ACTUAL:ACTUAL-BUNDLE-01",
});
assert.equal(registered.orders.length, 1);
assert.equal(emptyLedger.orders.length, 0, "registration must not mutate the existing ledger");
assert.throws(() => buildRegisteredMetalPrintOrderLedger({ ledger: registered, candidate, proofs: [syntheticProof], humanApprovalToken: "APPROVE_ECONOMICS_ACTUAL:ACTUAL-BUNDLE-01" }), /already registered/);
assert.throws(() => buildRegisteredMetalPrintOrderLedger({ ledger: emptyLedger, candidate, proofs: [syntheticProof], humanApprovalToken: "wrong" }), /approval token/);
assert.throws(() => buildRegisteredMetalPrintOrderLedger({ ledger: emptyLedger, candidate: { ...candidate, customerEmail: "forbidden@example.test" }, proofs: [syntheticProof], humanApprovalToken: "APPROVE_ECONOMICS_ACTUAL:ACTUAL-BUNDLE-01" }), /privacy-sensitive field forbidden/);

console.log(`metal-print order evidence bundles: PASS — current=${actuals.orders.length}, proof-linked=${actuals.orders.filter((order) => order.physicalProofId).length}; synthetic complete bundle PASS`);
