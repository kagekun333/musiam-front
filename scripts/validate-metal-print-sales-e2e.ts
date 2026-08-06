import assert from "node:assert/strict";
import fs from "node:fs";
import { applyInventoryEvent, availableUnits, createInventory, paidUnits } from "../src/lib/metal-print-inventory";
import { confirmPayment, reserveCheckout, type OfferLock } from "../src/lib/metal-print-sales-lifecycle";

const editionId = "VIP-METAL-E2E-01";
const approvedOffer: OfferLock = {
  editionId,
  amountJpy: 330_000,
  currency: "jpy",
  approved: true,
  approvalToken: `APPROVE_METAL_PRINT_OFFER:${editionId}:330000`,
  approvedAt: "2026-07-23T00:00:00.000Z",
};
const offers = { [editionId]: approvedOffer };
let state = createInventory([editionId]);

assert.throws(() => reserveCheckout(state, { [editionId]: { ...approvedOffer, approved: false } }, {
  eventId: "evt-rejected", checkoutId: "chk-rejected", editionId, amount: 330_000, currency: "jpy", expiresAt: "2026-07-20T12:00:00Z",
}), /offer not approved/);
assert.throws(() => reserveCheckout(state, offers, {
  eventId: "evt-wrong-price", checkoutId: "chk-wrong-price", editionId, amount: 300_000, currency: "jpy", expiresAt: "2026-07-20T12:00:00Z",
}), /amount mismatch/);

for (let index = 1; index <= 3; index += 1) {
  state = reserveCheckout(state, offers, {
    eventId: `evt-reserve-${index}`,
    checkoutId: `chk-${index}`,
    editionId,
    amount: 330_000,
    currency: "JPY",
    expiresAt: "2026-07-20T12:00:00Z",
  });
}
assert.equal(availableUnits(state, editionId), 0);
assert.throws(() => reserveCheckout(state, offers, {
  eventId: "evt-reserve-4", checkoutId: "chk-4", editionId, amount: 330_000, currency: "jpy", expiresAt: "2026-07-20T12:00:00Z",
}), /sold out/);

state = confirmPayment(state, offers, {
  eventId: "evt-paid-1", checkoutId: "chk-1", paymentId: "pay-1", editionId, amount: 330_000, currency: "jpy",
});
const paidDuplicate = confirmPayment(state, offers, {
  eventId: "evt-paid-1", checkoutId: "chk-1", paymentId: "pay-1", editionId, amount: 330_000, currency: "jpy",
});
assert.equal(paidDuplicate, state, "duplicate provider webhook must be idempotent");
assert.equal(paidUnits(state, editionId), 1);

state = applyInventoryEvent(state, { id: "evt-expire-2", type: "checkout_expired", checkoutId: "chk-2" });
assert.equal(availableUnits(state, editionId), 1);
state = reserveCheckout(state, offers, {
  eventId: "evt-reserve-4", checkoutId: "chk-4", editionId, amount: 330_000, currency: "jpy", expiresAt: "2026-07-20T13:00:00Z",
});
state = confirmPayment(state, offers, {
  eventId: "evt-paid-4", checkoutId: "chk-4", paymentId: "pay-4", editionId, amount: 330_000, currency: "jpy",
});
state = applyInventoryEvent(state, { id: "evt-fulfill-4", type: "fulfillment_completed", paymentId: "pay-4" });
state = applyInventoryEvent(state, { id: "evt-refund-4", type: "payment_refunded", paymentId: "pay-4" });
assert.equal(state.payments["pay-4"].status, "refunded");
assert.equal(state.editions[editionId].find((slot) => slot.paymentId === "pay-4")?.status, "retired");
assert.equal(availableUnits(state, editionId), 0, "fulfilled and refunded serial must not return to sale");

const redisServer = fs.readFileSync("src/lib/metal-print-redis.server.ts", "utf8");
assert.ok(redisServer.includes('"metal-print:proof-review-candidates"'), "fulfillment does not create a durable physical-proof review candidate");
assert.ok(redisServer.includes("AWAITING_RECEIPT_REVIEW"), "proof candidate lacks a non-approved review state");
assert.ok(redisServer.includes("eight quality scores"), "proof review candidate omits the required quality scoring evidence");
assert.ok(redisServer.includes("It is not an approved physical proof"), "fulfillment candidate can be misrepresented as approved proof");
assert.ok(redisServer.includes("PAID_AWAITING_VENDOR_ORDER"), "payment does not create a durable vendor-order action");
assert.ok(redisServer.includes('"metal-print:vendor-order-queue"'), "paid vendor-order queue is missing");
assert.ok(redisServer.includes("summarizeMetalPrintVendorOrderQueue"), "paid-unfulfilled queue cannot be observed by operations");
assert.ok(redisServer.includes("stale: awaitingVendorOrder && ageHours >= 24"), "vendor-order queue has no 24-hour stall detection");
assert.ok(redisServer.includes("MARK_VENDOR_ORDER_LUA"), "vendor order cannot transition atomically to production");
assert.ok(redisServer.includes("PRODUCTION_IN_PROGRESS"), "vendor order lacks a production state");
assert.ok(redisServer.includes("dispatchOverdue"), "production queue has no expected-dispatch breach detection");
assert.ok(redisServer.includes("HDEL', KEYS[5]"), "fulfilled or fully refunded orders remain stuck in the vendor-order queue");
const vendorOrderRoute = fs.readFileSync("src/app/api/metal-print/vendor-order/route.ts", "utf8");
assert.ok(vendorOrderRoute.includes('authorization") !== `Bearer ${secret}`'), "vendor-order transition lacks bearer authorization");
assert.ok(vendorOrderRoute.includes("vendorOrderEvidenceSha256"), "vendor-order transition accepts no evidence hash");
assert.ok(vendorOrderRoute.includes("dispatchMs > orderedMs + 60 * 86_400_000"), "vendor expected dispatch date is unbounded");
const webhookRoute = fs.readFileSync("src/app/api/metal-print/webhook/route.ts", "utf8");
assert.ok(webhookRoute.includes('confirmation === "confirmed"'), "duplicate Stripe webhooks can repeat vendor-order notifications");
assert.ok(webhookRoute.includes("saveMetalPrintVendorOrderNotification"), "vendor-order notification result is not durable");
assert.ok(webhookRoute.includes("顧客PIIと決済識別子は含みません"), "vendor-order email can expose customer or payment identifiers");
assert.ok(redisServer.includes("vendor-order-notifications"), "vendor-order notification failures cannot be reconciled");

console.log("metal-print sales E2E: PASS — offer lock, amount/currency, reservation, sold-out, webhook idempotency, fulfillment and refund");
