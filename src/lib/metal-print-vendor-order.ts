import { getMetalPrintOfferFromApprovalSnapshot } from "./metal-print-offers.server";
import { METAL_PRINT_SHIPPING_POLICY, METAL_PRINT_VERIFIED_SHIPPING_COUNTRIES } from "./metal-print-shipping-policy";

export type PaidMetalPrintOrder = {
  checkoutSessionId: string;
  paymentIntentId: string;
  orderId: string;
  editionId: string;
  amountJpy: number;
  currency: string;
  paymentStatus: string;
  customerEmail: string | null;
  customerPhone: string | null;
  recipientName: string | null;
  shippingAddress: Record<string, string | null> | null;
  checkoutCreatedAt: string;
  offerApprovalToken: string;
  offerApprovedAt: string;
};

export type VendorOrderSpecification = {
  vendorId: string;
  product: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  surface: string;
  base: string;
  frame: string;
  border: string;
  hangingHardware: string;
  uploadMasterRelativePath: string;
  uploadMasterSha256: string;
  landedCostCeilingJpy: number;
};

export function buildVendorOrderPacket(input: {
  order: PaidMetalPrintOrder;
  specification: VendorOrderSpecification;
  generatedAt: string;
  includeShipping: boolean;
}) {
  const { order, specification } = input;
  if (order.paymentStatus !== "paid") throw new Error("checkout is not paid");
  const checkoutCreatedAtMs = Date.parse(order.checkoutCreatedAt);
  if (!Number.isFinite(checkoutCreatedAtMs)) throw new Error("invalid checkout creation time");
  const offer = getMetalPrintOfferFromApprovalSnapshot({
    editionId: order.editionId,
    approvalToken: order.offerApprovalToken,
    approvedAt: order.offerApprovedAt,
    checkoutCreatedAtMs,
  });
  if (!offer) throw new Error("edition approval snapshot is not vendor-order eligible");
  if (order.currency.toLowerCase() !== offer.currency) throw new Error("currency mismatch");
  if (order.amountJpy !== offer.amountJpy) throw new Error("amount mismatch");
  if (!/^pi_[A-Za-z0-9_]{8,200}$/.test(order.paymentIntentId)) throw new Error("invalid payment intent");
  if (!/^mp_[A-Za-z0-9_-]{8,100}$/.test(order.orderId)) throw new Error("invalid order id");
  if (!/^[a-f0-9]{64}$/.test(specification.uploadMasterSha256)) throw new Error("invalid master hash");
  if (input.includeShipping && (!order.recipientName || !order.shippingAddress)) throw new Error("shipping details missing");
  const shippingCountry = order.shippingAddress?.country?.toUpperCase();
  if (input.includeShipping && (!shippingCountry || !METAL_PRINT_VERIFIED_SHIPPING_COUNTRIES.includes(shippingCountry as never))) {
    throw new Error("shipping destination is outside the verified vendor coverage");
  }

  return {
    schemaVersion: 1,
    generatedAt: input.generatedAt,
    status: input.includeShipping ? "READY_FOR_VENDOR_CART_HUMAN_PAYMENT_GATE" : "PAID_ORDER_VERIFIED_REDACTED",
    paymentEvidence: {
      checkoutSessionId: order.checkoutSessionId,
      paymentIntentId: order.paymentIntentId,
      orderId: order.orderId,
      editionId: order.editionId,
      amountJpy: order.amountJpy,
      currency: "jpy",
      paymentStatus: "paid",
      offerApprovalToken: order.offerApprovalToken,
      offerApprovedAt: order.offerApprovedAt,
    },
    customer: input.includeShipping ? {
      email: order.customerEmail,
      phone: order.customerPhone,
      recipientName: order.recipientName,
      shippingAddress: order.shippingAddress,
    } : { redacted: true },
    vendor: {
      id: specification.vendorId,
      orderingModel: "self_service_single_item",
      contractRequired: false,
      purchaseAuthorized: false,
      finalPaymentGate: "HUMAN_APPROVAL_REQUIRED_PER_ORDER",
    },
    specification,
    operatorChecks: [
      "Stripe Checkout is paid and amount/currency match the approved Offer",
      "Redis payment ledger contains the same PaymentIntent before vendor purchase",
      "upload master SHA-256 matches the locked proof-order packet",
      "600x600mm, glossy white base, no frame, no border, aluminium rails, quantity one",
      "full-square crop and SuperResolution preview are visually checked",
      "recipient and address are copied exactly from Stripe Checkout",
      METAL_PRINT_SHIPPING_POLICY.orderRule,
      "outside the EU, disclose that WhiteWall and merchandise value may appear on customs documents",
      "landed vendor total is at or below JPY 40,000",
      "final vendor purchase receives order-specific Human approval"
    ],
    privacy: input.includeShipping
      ? "Contains customer delivery data. Store only in the requested temporary path, mode 0600, and delete within 24 hours."
      : "Customer delivery data omitted.",
    truthBoundary: "This packet verifies a paid customer order and prepares one vendor cart. It does not authorize or prove a WhiteWall purchase, shipment, delivery, physical proof or fulfillment."
  };
}
