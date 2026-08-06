import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getMetalPrintOfferFromApprovalSnapshot, METAL_PRINT_OFFER_LOCKS } from "../src/lib/metal-print-offers.server";
import { calculateMetalPrintUnitEconomics } from "../src/lib/metal-print-unit-economics";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ops = path.join(root, "ops", "metal-print-vip");
const economics = JSON.parse(fs.readFileSync(path.join(ops, "economics-evidence-ledger.json"), "utf8"));
const assurance = JSON.parse(fs.readFileSync(path.join(ops, "assurance.json"), "utf8"));
const madeToOrderApproval = JSON.parse(fs.readFileSync(path.join(ops, "made-to-order-sales-approval-2026-07-24.json"), "utf8"));
const editionPage = fs.readFileSync(path.join(root, "src", "app", "metal-print", "[slug]", "page.tsx"), "utf8");
const quoteScenario = economics.scenarios.find((scenario: { id: string }) => scenario.id === economics.quoteScenarioId);
const requiredRegions = new Set<string>(economics.requiredRegions);

assert.ok(quoteScenario, "current quote scenario missing");
assert.equal(quoteScenario.priceYen, 330_000, "quote scenario price differs from Offer");
assert.ok(Number.isFinite(Date.parse(quoteScenario.quoteExpiresAt)) && Date.parse(quoteScenario.quoteExpiresAt) > Date.now(), "quote scenario expired");
assert.deepEqual(new Set(quoteScenario.regions.map((region: { region: string }) => region.region)), requiredRegions, "quote scenario region coverage mismatch");
assert.ok(assurance.supply.productionCapacityUnitsConfirmed >= 12, "12-unit production capacity not evidenced");
assert.equal(assurance.supply.replacementPolicyConfirmed, true, "replacement policy not confirmed");
assert.equal(assurance.supply.deliverySlaConfirmed, true, "delivery SLA not confirmed");
assert.ok(editionPage.includes('isPublicOffer ? "FORMAL OFFER" : "COLLECTOR PREVIEW"'), "formal Offer is mislabeled as a preview");
assert.ok(editionPage.includes('isPublicOffer ? "正式Collector価格・税込" : "予定Collector価格・税込"'), "formal Offer price is mislabeled as planned");

for (const region of quoteScenario.regions) {
  const result = calculateMetalPrintUnitEconomics({
    priceYen: quoteScenario.priceYen,
    productionYen: Number(region.productionYen),
    shippingYen: Number(region.shippingYen),
    packagingYen: Number(region.packagingYen),
    customsDutyYen: Number(region.customsDutyYen),
    indirectTaxLiabilityYen: Number(region.indirectTaxLiabilityYen),
    paymentFeeRate: Number(region.paymentFeeRate),
    paymentFixedFeeYen: Number(region.paymentFixedFeeYen),
    replacementRate: Number(region.replacementRate),
    customerAcquisitionCostYen: Number(region.customerAcquisitionCostYen),
    fxRiskReserveYen: Number(region.fxRiskReserveYen),
  });
  assert.ok(result.maximumCacAt60MarginYen >= 0, `${region.region}: no CAC headroom at 60% margin`);
}

let approved = 0;
for (const offer of Object.values(METAL_PRINT_OFFER_LOCKS)) {
  assert.equal(offer.amountJpy, 330_000, `${offer.editionId}: unauthorized price`);
  assert.equal(offer.currency, "jpy", `${offer.editionId}: unauthorized currency`);
  const expectedToken = `APPROVE_METAL_PRINT_OFFER:${offer.editionId}:${offer.amountJpy}`;
  if (!offer.approved) {
    assert.equal(offer.approvalToken, null, `${offer.editionId}: closed Offer retains approval token`);
    assert.equal(offer.approvedAt, null, `${offer.editionId}: closed Offer retains approval time`);
    continue;
  }
  approved += 1;
  assert.equal(offer.approvalToken, expectedToken, `${offer.editionId}: exact Human approval token required`);
  assert.ok(offer.approvedAt && Number.isFinite(Date.parse(offer.approvedAt)), `${offer.editionId}: approval time required`);
  assert.equal(madeToOrderApproval.status, "APPROVED_FOR_CONTROLLED_SALE", "made-to-order approval is not active");
  assert.equal(madeToOrderApproval.fulfillmentModel, "CUSTOMER_PAYMENT_THEN_SINGLE_ITEM_VENDOR_ORDER", "made-to-order model mismatch");
  assert.ok(madeToOrderApproval.approvedEditionIds.includes(offer.editionId), `${offer.editionId}: missing made-to-order approval`);
  assert.equal(madeToOrderApproval.offer.amountJpy, offer.amountJpy, `${offer.editionId}: approved amount mismatch`);
  assert.equal(madeToOrderApproval.offer.currency, offer.currency, `${offer.editionId}: approved currency mismatch`);
  const editionApproval = madeToOrderApproval.editionApprovals.find((item: { editionId: string }) => item.editionId === offer.editionId);
  assert.ok(editionApproval, `${offer.editionId}: per-Edition approval evidence missing`);
  assert.equal(editionApproval.approvalToken, expectedToken, `${offer.editionId}: registry token mismatch`);
  assert.equal(editionApproval.approvedAt, offer.approvedAt, `${offer.editionId}: registry approval time mismatch`);
}

const lockedOffer = Object.values(METAL_PRINT_OFFER_LOCKS)[0];
const historicalSnapshot = getMetalPrintOfferFromApprovalSnapshot({
  editionId: lockedOffer.editionId,
  approvalToken: `APPROVE_METAL_PRINT_OFFER:${lockedOffer.editionId}:${lockedOffer.amountJpy}`,
  approvedAt: "2026-07-23T00:00:00.000Z",
  checkoutCreatedAtMs: Date.parse("2026-07-23T00:01:00.000Z"),
});
assert.equal(historicalSnapshot?.editionId, lockedOffer.editionId, "relocked Offer invalidates an already-created approved Checkout");
assert.equal(getMetalPrintOfferFromApprovalSnapshot({
  editionId: lockedOffer.editionId,
  approvalToken: "invalid",
  approvedAt: "2026-07-23T00:00:00.000Z",
  checkoutCreatedAtMs: Date.parse("2026-07-23T00:01:00.000Z"),
}), null, "invalid historical Offer token accepted");
assert.equal(getMetalPrintOfferFromApprovalSnapshot({
  editionId: lockedOffer.editionId,
  approvalToken: `APPROVE_METAL_PRINT_OFFER:${lockedOffer.editionId}:${lockedOffer.amountJpy}`,
  approvedAt: "2026-07-23T00:02:00.000Z",
  checkoutCreatedAtMs: Date.parse("2026-07-23T00:01:00.000Z"),
}), null, "Offer approved after Checkout creation accepted");

console.log(`metal-print offer approval: PASS — ${approved} made-to-order Offer approved, ${Object.keys(METAL_PRINT_OFFER_LOCKS).length - approved} safely closed; historical Checkout survives relock`);
