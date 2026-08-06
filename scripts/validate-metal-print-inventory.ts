import assert from "node:assert/strict";
import { applyInventoryEvent, availableUnits, createInventory, paidUnits } from "../src/lib/metal-print-inventory";

const editionId = "VIP-METAL-TEST-A";
let state = createInventory([editionId]);

state = applyInventoryEvent(state, { id: "evt-reserve", type: "checkout_reserved", checkoutId: "chk-reserve", editionId, expiresAt: "2026-07-20T12:00:00Z" });
assert.equal(availableUnits(state, editionId), 2);
state = applyInventoryEvent(state, { id: "evt-expire", type: "checkout_expired", checkoutId: "chk-reserve" });
assert.equal(availableUnits(state, editionId), 3, "expired checkout must release its serial");

state = applyInventoryEvent(state, { id: "evt-1", type: "payment_succeeded", paymentId: "pay-1", editionId });
assert.equal(paidUnits(state, editionId), 1);
assert.equal(state.payments["pay-1"].serial, "1/3");

const duplicate = applyInventoryEvent(state, { id: "evt-1", type: "payment_succeeded", paymentId: "pay-1", editionId });
assert.equal(duplicate, state, "duplicate webhook must be idempotent");

state = applyInventoryEvent(state, { id: "evt-2", type: "payment_succeeded", paymentId: "pay-2", editionId });
state = applyInventoryEvent(state, { id: "evt-3", type: "payment_succeeded", paymentId: "pay-3", editionId });
assert.equal(paidUnits(state, editionId), 3);
assert.throws(() => applyInventoryEvent(state, { id: "evt-4", type: "payment_succeeded", paymentId: "pay-4", editionId }), /sold out/);

state = applyInventoryEvent(state, { id: "evt-5", type: "payment_refunded", paymentId: "pay-2" });
assert.equal(paidUnits(state, editionId), 2);
state = applyInventoryEvent(state, { id: "evt-6", type: "payment_succeeded", paymentId: "pay-4", editionId });
assert.equal(state.payments["pay-4"].serial, "2/3", "unfulfilled refund may release its serial");

state = applyInventoryEvent(state, { id: "evt-7", type: "fulfillment_completed", paymentId: "pay-1" });
state = applyInventoryEvent(state, { id: "evt-8", type: "payment_refunded", paymentId: "pay-1" });
assert.equal(state.editions[editionId][0].status, "retired", "fulfilled serial must never be resold after refund");
assert.equal(paidUnits(state, editionId), 2);

console.log("[validate-metal-print-inventory] PASS — reservation expiry, idempotency, 3-unit cap, refund release, fulfilled serial retirement");
