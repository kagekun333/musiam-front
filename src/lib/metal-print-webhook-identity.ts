const METAL_PRINT_PRODUCT = "vip-metal-print";

type Metadata = Record<string, string> | null | undefined;

export type MetalPrintCheckoutWebhookRouting =
  | "process_metal_print"
  | "process_verification_expiry"
  | "ignore_non_metal_print";

function hasRequiredMetalPrintMetadata(metadata: Metadata): boolean {
  return metadata?.product === METAL_PRINT_PRODUCT
    && typeof metadata.editionId === "string"
    && metadata.editionId.length > 0
    && typeof metadata.orderId === "string"
    && metadata.orderId.length > 0;
}

export function isMetalPrintCheckoutMetadata(metadata: Metadata): boolean {
  return hasRequiredMetalPrintMetadata(metadata);
}

export function isMetalPrintRefundMetadata(metadata: Metadata): boolean {
  return hasRequiredMetalPrintMetadata(metadata);
}

export function isMetalPrintVerificationMetadata(metadata: Metadata): boolean {
  return metadata?.product === "vip-metal-print-verification"
    && metadata.verification === "true"
    && typeof metadata.verificationRunId === "string"
    && /^verify_[A-Za-z0-9_-]{16,100}$/.test(metadata.verificationRunId)
    && typeof metadata.editionId === "string"
    && metadata.editionId.length > 0
    && typeof metadata.orderId === "string"
    && metadata.orderId.length > 0;
}

export function routeMetalPrintCheckoutWebhook(
  eventType: string,
  metadata: Metadata,
): MetalPrintCheckoutWebhookRouting {
  if (isMetalPrintCheckoutMetadata(metadata)) return "process_metal_print";
  if (eventType === "checkout.session.expired" && isMetalPrintVerificationMetadata(metadata)) {
    return "process_verification_expiry";
  }
  return "ignore_non_metal_print";
}
