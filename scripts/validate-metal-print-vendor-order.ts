import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildVendorOrderPacket } from "../src/lib/metal-print-vendor-order";

const order = {
  checkoutSessionId: "cs_test_paid_12345678",
  paymentIntentId: "pi_paid_12345678",
  orderId: "mp_order_12345678",
  editionId: "VIP-METAL-2026-07-NATURA",
  amountJpy: 330000,
  currency: "jpy",
  paymentStatus: "paid",
  customerEmail: "collector@example.invalid",
  customerPhone: "+81000000000",
  recipientName: "Test Collector",
  shippingAddress: { country: "JP", postal_code: "0000000", line1: "test", city: "test" },
  checkoutCreatedAt: "2026-07-24T11:26:00.000Z",
  offerApprovalToken: "APPROVE_METAL_PRINT_OFFER:VIP-METAL-2026-07-NATURA:330000",
  offerApprovedAt: "2026-07-24T11:25:41.000Z",
};
const specification = {
  vendorId: "whitewall-jp",
  product: "ChromaLuxe HD Metal Print",
  widthMm: 600,
  heightMm: 600,
  quantity: 1,
  surface: "glossy",
  base: "white",
  frame: "none",
  border: "none",
  hangingHardware: "aluminium rails",
  uploadMasterRelativePath: "ops/metal-print-vip/proof-assets/deus-sive-natura-whitewall-3000x3000.tiff",
  uploadMasterSha256: "a".repeat(64),
  landedCostCeilingJpy: 40000,
};

const redacted = buildVendorOrderPacket({ order, specification, generatedAt: "2026-07-26T00:00:00.000Z", includeShipping: false });
assert.equal(redacted.status, "PAID_ORDER_VERIFIED_REDACTED");
assert.deepEqual(redacted.customer, { redacted: true });
assert.equal(redacted.vendor.purchaseAuthorized, false);
const actionable = buildVendorOrderPacket({ order, specification, generatedAt: "2026-07-26T00:00:00.000Z", includeShipping: true });
assert.equal(actionable.status, "READY_FOR_VENDOR_CART_HUMAN_PAYMENT_GATE");
assert.equal("recipientName" in actionable.customer, true);
assert.throws(() => buildVendorOrderPacket({ order: { ...order, paymentStatus: "unpaid" }, specification, generatedAt: "2026-07-26T00:00:00.000Z", includeShipping: true }), /not paid/);
assert.throws(() => buildVendorOrderPacket({ order: { ...order, amountJpy: 329999 }, specification, generatedAt: "2026-07-26T00:00:00.000Z", includeShipping: true }), /amount mismatch/);
assert.throws(() => buildVendorOrderPacket({ order: { ...order, shippingAddress: null }, specification, generatedAt: "2026-07-26T00:00:00.000Z", includeShipping: true }), /shipping details missing/);
assert.throws(() => buildVendorOrderPacket({ order: { ...order, offerApprovalToken: "invalid" }, specification, generatedAt: "2026-07-26T00:00:00.000Z", includeShipping: true }), /approval snapshot/);
const futureIgnition = buildVendorOrderPacket({
  order: {
    ...order,
    editionId: "VIP-METAL-2026-07-IGNITION",
    offerApprovalToken: "APPROVE_METAL_PRINT_OFFER:VIP-METAL-2026-07-IGNITION:330000",
    offerApprovedAt: "2026-07-26T00:00:00.000Z",
    checkoutCreatedAt: "2026-07-26T00:01:00.000Z",
  },
  specification: { ...specification, uploadMasterRelativePath: "ops/metal-print-vip/proof-assets/expansion-candidates/ignition-whitewall-3000x3000.tiff" },
  generatedAt: "2026-07-26T00:02:00.000Z",
  includeShipping: false,
});
assert.equal(futureIgnition.paymentEvidence.editionId, "VIP-METAL-2026-07-IGNITION");
assert.throws(() => buildVendorOrderPacket({ order: { ...order, editionId: "UNKNOWN" }, specification, generatedAt: "2026-07-26T00:00:00.000Z", includeShipping: true }), /approval snapshot/);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runner = fs.readFileSync(path.join(root, "scripts/prepare-metal-print-vendor-order.ts"), "utf8");
assert.ok(runner.includes("paymentIntents.retrieve"), "live paid PaymentIntent verification missing");
assert.ok(runner.includes("checkout.sessions.list"), "paid Checkout Session lookup missing");
assert.ok(runner.includes('mode: 0o600, flag: "wx"'), "sensitive packet must be private and overwrite-safe");
assert.ok(runner.includes("locked upload master hash mismatch"), "master hash verification missing");
assert.ok(runner.includes("expansion-master-manifest.json"), "expansion Edition manifest lookup missing");
assert.ok(runner.includes("candidate.outputSha256"), "expansion Edition hash lock missing");
assert.ok(!runner.includes("whitewall.com"), "runner must not place or automate a vendor order");
console.log("metal-print vendor order preparation: PASS — paid Stripe order, locked master, ephemeral PII, per-order vendor payment gate");
