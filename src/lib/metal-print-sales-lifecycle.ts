import {
  applyInventoryEvent,
  availableUnits,
  type MetalPrintInventory,
} from "./metal-print-inventory";

export type OfferLock = {
  editionId: string;
  amountJpy: number;
  currency: "jpy";
  approved: boolean;
  approvalToken: string | null;
  approvedAt: string | null;
};

export type CheckoutRequest = {
  eventId: string;
  checkoutId: string;
  editionId: string;
  amount: number;
  currency: string;
  expiresAt: string;
};

export type PaymentWebhook = {
  eventId: string;
  checkoutId: string;
  paymentId: string;
  editionId: string;
  amount: number;
  currency: string;
};

function assertOffer(offer: OfferLock | undefined, editionId: string, amount: number, currency: string) {
  if (!offer || offer.editionId !== editionId) throw new Error(`offer lock missing: ${editionId}`);
  if (!offer.approved) throw new Error(`offer not approved: ${editionId}`);
  if (offer.approvalToken !== `APPROVE_METAL_PRINT_OFFER:${editionId}:${offer.amountJpy}`) throw new Error(`offer approval token invalid: ${editionId}`);
  if (!offer.approvedAt || !Number.isFinite(Date.parse(offer.approvedAt))) throw new Error(`offer approval time invalid: ${editionId}`);
  if (currency.toLowerCase() !== offer.currency) throw new Error(`currency mismatch: ${currency}`);
  if (amount !== offer.amountJpy) throw new Error(`amount mismatch: ${amount}`);
}

export function reserveCheckout(
  state: MetalPrintInventory,
  offers: Record<string, OfferLock>,
  request: CheckoutRequest,
): MetalPrintInventory {
  assertOffer(offers[request.editionId], request.editionId, request.amount, request.currency);
  if (availableUnits(state, request.editionId) < 1) throw new Error(`edition sold out: ${request.editionId}`);
  return applyInventoryEvent(state, {
    id: request.eventId,
    type: "checkout_reserved",
    checkoutId: request.checkoutId,
    editionId: request.editionId,
    expiresAt: request.expiresAt,
  });
}

export function confirmPayment(
  state: MetalPrintInventory,
  offers: Record<string, OfferLock>,
  webhook: PaymentWebhook,
): MetalPrintInventory {
  assertOffer(offers[webhook.editionId], webhook.editionId, webhook.amount, webhook.currency);
  return applyInventoryEvent(state, {
    id: webhook.eventId,
    type: "payment_succeeded",
    checkoutId: webhook.checkoutId,
    paymentId: webhook.paymentId,
    editionId: webhook.editionId,
  });
}
