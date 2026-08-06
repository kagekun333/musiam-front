import { METAL_PRINT_PUBLIC_OFFER_EDITION_ID, METAL_PRINT_VIP_EDITIONS } from "./metal-print-vip";
import type { OfferLock } from "./metal-print-sales-lifecycle";
import approvalRegistry from "../../ops/metal-print-vip/made-to-order-sales-approval-2026-07-24.json";
import allCatalogApproval from "../../ops/metal-print-vip/all-catalog-sales-approval-2026-08-07.json";

const registryApprovals = new Map(
  approvalRegistry.editionApprovals.map((approval) => [approval.editionId, approval]),
);

const catalogApprovalActive = allCatalogApproval.status === "APPROVED_FOR_PUBLIC_SALE"
  && allCatalogApproval.scope === "ALL_CANONICAL_CATALOG_WORKS"
  && allCatalogApproval.amountJpy === 330_000
  && allCatalogApproval.currency === "jpy"
  && allCatalogApproval.editionSize === 3
  && Number.isFinite(Date.parse(allCatalogApproval.approvedAt))
  && Date.parse(allCatalogApproval.approvedAt) <= Date.now();

export const METAL_PRINT_OFFER_LOCKS: Record<string, OfferLock> = Object.fromEntries(
  Array.from(new Set([
    ...METAL_PRINT_VIP_EDITIONS.map((edition) => edition.id),
    ...approvalRegistry.editionApprovals.map((approval) => approval.editionId),
  ])).map((editionId) => {
    const approval = registryApprovals.get(editionId);
    const catalogApproved = editionId.startsWith("CATALOG-WORK:") && catalogApprovalActive;
    return [editionId, {
    editionId,
    amountJpy: 330_000,
    currency: "jpy" as const,
    approved: Boolean(approval) || catalogApproved,
    approvalToken: approval?.approvalToken ?? (catalogApproved ? `APPROVE_METAL_PRINT_OFFER:${editionId}:330000` : null),
    approvedAt: approval?.approvedAt ?? (catalogApproved ? allCatalogApproval.approvedAt : null),
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
    return offer ? [{ editionId, units: 3, amountJpy: offer.amountJpy }] : [];
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
