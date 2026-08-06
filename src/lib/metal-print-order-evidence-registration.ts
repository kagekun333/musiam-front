import type { MetalPrintActualOrderEvidence, MetalPrintEconomicsActualLedger } from "./metal-print-economics-actuals";
import { summarizeMetalPrintEconomicsActuals } from "./metal-print-economics-actuals";

const allowedInputKeys = new Set([
  "evidenceId", "editionId", "region", "paidAt", "fulfilledAt", "grossPaidYen",
  "orderReferenceHmac", "vendorInvoiceSha256", "productionYen", "shippingYen",
  "packagingYen", "customsDutyYen", "indirectTaxLiabilityYen", "stripeSettlementSha256",
  "fulfillmentEvidenceSha256", "trackingReferenceHash", "physicalProofId", "stripeFeeYen",
  "fxCostYen", "replacementRequired", "replacementCostYen",
]);

const forbiddenPrivacyKeys = /(?:name|email|address|phone|stripe(?:Id|Customer|PaymentIntent)|trackingNumber|invoiceBody|freeText)$/i;

export type ProofEvidenceRecord = { id: string; editionId: string; approved: boolean };

export function validateMetalPrintOrderProofLink(order: MetalPrintActualOrderEvidence, proofs: ProofEvidenceRecord[]) {
  if (!order.physicalProofId) return;
  const proof = proofs.find((entry) => entry.id === order.physicalProofId);
  if (!proof) throw new Error(`${order.evidenceId}: referenced physical proof missing`);
  if (proof.editionId !== order.editionId) throw new Error(`${order.evidenceId}: physical proof Edition mismatch`);
  if (!proof.approved) throw new Error(`${order.evidenceId}: referenced physical proof is not Human-approved`);
}

export function buildRegisteredMetalPrintOrderLedger(args: {
  ledger: MetalPrintEconomicsActualLedger;
  candidate: Record<string, unknown>;
  proofs: ProofEvidenceRecord[];
  humanApprovalToken: string;
}) {
  for (const key of Object.keys(args.candidate)) {
    if (!allowedInputKeys.has(key)) {
      if (forbiddenPrivacyKeys.test(key)) throw new Error(`privacy-sensitive field forbidden: ${key}`);
      throw new Error(`unknown order evidence field: ${key}`);
    }
  }
  const evidenceId = typeof args.candidate.evidenceId === "string" ? args.candidate.evidenceId : "";
  const expectedToken = `APPROVE_ECONOMICS_ACTUAL:${evidenceId}`;
  if (args.humanApprovalToken !== expectedToken) throw new Error("matching Human approval token required");
  const order = { ...args.candidate, reviewToken: args.humanApprovalToken } as MetalPrintActualOrderEvidence;
  if (args.ledger.orders.some((entry) => entry.evidenceId === order.evidenceId)) throw new Error("actual-order evidenceId already registered");
  if (args.ledger.orders.some((entry) => entry.orderReferenceHmac === order.orderReferenceHmac)) throw new Error("underlying order already registered");
  validateMetalPrintOrderProofLink(order, args.proofs);
  const nextLedger: MetalPrintEconomicsActualLedger = { ...args.ledger, orders: [...args.ledger.orders, order] };
  summarizeMetalPrintEconomicsActuals(nextLedger);
  return nextLedger;
}
