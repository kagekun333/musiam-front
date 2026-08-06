import assert from "node:assert/strict";
import { summarizeMetalPrintRevenue, type MetalPrintPaymentRecord } from "../src/lib/metal-print-revenue";

const records: MetalPrintPaymentRecord[] = [
  { paymentIntentId: "pi_1", editionId: "E1", orderId: "O1", amountJpy: 330_000, refundedAmountJpy: 0, paidAt: "2026-07-01T00:00:00Z", status: "paid", campaign: "abi_hakusyaku_launch_wave_01", source: "instagram", medium: "organic_social", content: "ABI-LW01-01" },
  { paymentIntentId: "pi_2", editionId: "E2", orderId: "O2", amountJpy: 330_000, refundedAmountJpy: 100_000, paidAt: "2026-07-15T00:00:00Z", refundedAt: "2026-07-18T00:00:00Z", status: "partially_refunded" },
  { paymentIntentId: "pi_3", editionId: "E3", orderId: "O3", amountJpy: 330_000, refundedAmountJpy: 330_000, paidAt: "2026-07-31T23:59:59Z", refundedAt: "2026-08-01T00:00:00Z", status: "refunded" },
  { paymentIntentId: "pi_4", editionId: "E4", orderId: "O4", amountJpy: 330_000, refundedAmountJpy: 0, paidAt: "2026-08-01T00:00:00Z", status: "paid" },
];

const july = summarizeMetalPrintRevenue(records, "2026-07");
assert.equal(july.paymentCount, 3);
assert.equal(july.paidNonRefundedOrders, 2);
assert.equal(july.grossPaidYen, 990_000);
assert.equal(july.refundedYen, 430_000);
assert.equal(july.netNonRefundedYen, 560_000);
assert.equal(july.targetProven, false);
assert.equal(july.byPlacement['["abi_hakusyaku_launch_wave_01","instagram","ABI-LW01-01"]'].netNonRefundedYen, 330_000);
assert.equal(july.unattributedNetNonRefundedYen, 230_000);

const target = summarizeMetalPrintRevenue(Array.from({ length: 10 }, (_, index) => ({
  paymentIntentId: `pi_target_${index}`,
  editionId: `E${index}`,
  orderId: `O${index}`,
  amountJpy: 330_000,
  refundedAmountJpy: index === 0 ? 300_000 : 0,
  paidAt: "2026-07-20T00:00:00Z",
  status: index === 0 ? "partially_refunded" as const : "paid" as const,
})), "2026-07");
assert.equal(target.netNonRefundedYen, 3_000_000);
assert.equal(target.targetProven, true);

assert.throws(() => summarizeMetalPrintRevenue([], "2026-7"), /YYYY-MM/);
console.log("metal-print revenue validation PASS");
