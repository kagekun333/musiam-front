import { METAL_PRINT_PUBLIC_OFFER_EDITION_ID, METAL_PRINT_VIP_EDITIONS } from "./metal-print-vip";
import type { OfferLock } from "./metal-print-sales-lifecycle";
import approvalRegistry from "../../ops/metal-print-vip/made-to-order-sales-approval-2026-07-24.json";

const registryApprovals = new Map(
  approvalRegistry.editionApprovals.map((approval) => [approval.editionId, approval]),
);

export const METAL_PRINT_OFFER_LOCKS: Record<string, OfferLock> = Object.fromEntries(
  Array.from(new Set([
    ...METAL_PRINT_VIP_EDITIONS.map((edition) => edition.id),
    ...approvalRegistry.editionApprovals.map((approval) => approval.editionId),
  ])).map((editionId) => {
    const approval = registryApprovals.get(editionId);
    return [editionId, {
    editionId,
    amountJpy: 330_000,
    currency: "jpy" as const,
    approved: Boolean(approval),
    approvalToken: approval?.approvalToken ?? null,
    approvedAt: approval?.approvedAt ?? null,
  }];
  }),
);

if (!registryApprovals.has(METAL_PRINT_PUBLIC_OFFER_EDITION_ID)) {
  throw new Error(`Public metal-print Offer approval missing: ${METAL_PRINT_PUBLIC_OFFER_EDITION_ID}`);
}

export function getApprovedMetalPrintOffer(editionId: string): OfferLock | null {
  const offer = METAL_PRINT_OFFER_LOCKS[editionId];
  const expectedToken = offer ? `APPROVE_METAL_PRINT_OFFER:${offer.editionId}:${offer.amountJpy}` : "";
  const approvedAtMs = offer?.approvedAt ? Date.parse(offer.approvedAt) : Number.NaN;
  return offer?.approved
    && offer.approvalToken === expectedToken
    && Number.isFinite(approvedAtMs)
    && approvedAtMs <= Date.now()
    ? offer
    : null;
}

export function getMetalPrintApprovedOfferCapacity() {
  const approvedEditions = Object.keys(METAL_PRINT_OFFER_LOCKS).flatMap((editionId) => {
    const offer = getApprovedMetalPrintOffer(editionId);
    return offer ? [{ editionId, units: approvalRegistry.offer.editionSize, amountJpy: offer.amountJpy }] : [];
  });
  return {
    approvedEditionIds: approvedEditions.map((item) => item.editionId),
    approvedOfferUnits: approvedEditions.reduce((total, item) => total + item.units, 0),
    maximumApprovedOfferGrossYen: approvedEditions.reduce((total, item) => total + item.units * item.amountJpy, 0),
  };
}

export function getMetalPrintOfferFromApprovalSnapshot(input: {
  editionId: string;
  approvalToken: string;
  approvedAt: string;
  checkoutCreatedAtMs: number;
}): OfferLock | null {
  const offer = METAL_PRINT_OFFER_LOCKS[input.editionId];
  if (!offer) return null;
  const expectedToken = `APPROVE_METAL_PRINT_OFFER:${offer.editionId}:${offer.amountJpy}`;
  const approvedAtMs = Date.parse(input.approvedAt);
  return input.approvalToken === expectedToken
    && Number.isFinite(approvedAtMs)
    && approvedAtMs <= input.checkoutCreatedAtMs
    ? offer
    : null;
}
