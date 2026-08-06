import crypto from "node:crypto";
import fs from "node:fs";
import type { MetalPrintActualOrderEvidence } from "./metal-print-economics-actuals";

export type MetalPrintOrderEvidenceSource = Omit<
  MetalPrintActualOrderEvidence,
  "orderReferenceHmac" | "vendorInvoiceSha256" | "stripeSettlementSha256" | "fulfillmentEvidenceSha256" | "trackingReferenceHash" | "reviewToken"
> & {
  internalOrderReference: string;
  trackingReference: string;
  vendorInvoicePath: string;
  stripeSettlementPath: string;
  fulfillmentEvidencePath: string;
};

const expectedKeys = new Set([
  "evidenceId", "editionId", "region", "paidAt", "fulfilledAt", "grossPaidYen",
  "internalOrderReference", "trackingReference", "vendorInvoicePath", "stripeSettlementPath",
  "fulfillmentEvidencePath", "productionYen", "shippingYen", "packagingYen", "customsDutyYen",
  "indirectTaxLiabilityYen", "physicalProofId", "stripeFeeYen", "fxCostYen",
  "replacementRequired", "replacementCostYen",
]);

function fileSha256(filePath: string, label: string) {
  if (!filePath.startsWith("/") || !fs.statSync(filePath, { throwIfNoEntry: false })?.isFile()) throw new Error(`${label} must be an existing absolute file`);
  const bytes = fs.readFileSync(filePath);
  if (bytes.byteLength === 0) throw new Error(`${label} is empty`);
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function referenceHmac(secret: string, domain: "order" | "tracking", value: string) {
  if (secret.length < 32) throw new Error("METAL_PRINT_EVIDENCE_HMAC_SECRET must be at least 32 characters");
  if (value.trim().length < 6 || value.length > 300) throw new Error(`${domain} reference length is invalid`);
  return crypto.createHmac("sha256", secret).update(`metal-print:${domain}:v1\0${value}`).digest("hex");
}

export function buildMetalPrintOrderEvidenceCandidate(raw: Record<string, unknown>, hmacSecret: string) {
  for (const key of Object.keys(raw)) {
    if (!expectedKeys.has(key)) throw new Error(`unknown source field: ${key}`);
  }
  const source = raw as unknown as MetalPrintOrderEvidenceSource;
  const candidate = {
    evidenceId: source.evidenceId,
    editionId: source.editionId,
    region: source.region,
    paidAt: source.paidAt,
    fulfilledAt: source.fulfilledAt,
    grossPaidYen: source.grossPaidYen,
    orderReferenceHmac: referenceHmac(hmacSecret, "order", source.internalOrderReference),
    vendorInvoiceSha256: fileSha256(source.vendorInvoicePath, "vendor invoice"),
    productionYen: source.productionYen,
    shippingYen: source.shippingYen,
    packagingYen: source.packagingYen,
    customsDutyYen: source.customsDutyYen,
    indirectTaxLiabilityYen: source.indirectTaxLiabilityYen,
    stripeSettlementSha256: fileSha256(source.stripeSettlementPath, "Stripe settlement"),
    fulfillmentEvidenceSha256: fileSha256(source.fulfillmentEvidencePath, "fulfillment evidence"),
    trackingReferenceHash: referenceHmac(hmacSecret, "tracking", source.trackingReference),
    ...(source.physicalProofId ? { physicalProofId: source.physicalProofId } : {}),
    stripeFeeYen: source.stripeFeeYen,
    fxCostYen: source.fxCostYen,
    replacementRequired: source.replacementRequired,
    replacementCostYen: source.replacementCostYen,
  } satisfies Omit<MetalPrintActualOrderEvidence, "reviewToken">;
  return candidate;
}
