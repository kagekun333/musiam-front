import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const value = process.env.METAL_PRINT_IDENTITY_SECRET;
  if (!value || value.length < 32) throw new Error("metal print identity secret is not configured");
  return value;
}

function signature(consultationId: string) {
  return createHmac("sha256", secret()).update(`metal-print-consultation:${consultationId}`).digest("base64url");
}

export function createMetalPrintConsultationToken(consultationId: string) {
  return `${consultationId}.${signature(consultationId)}`;
}

export function verifyMetalPrintConsultationToken(token: string) {
  const separator = token.lastIndexOf(".");
  if (separator < 1) return null;
  const consultationId = token.slice(0, separator);
  const providedBytes = Buffer.from(token.slice(separator + 1));
  const expectedBytes = Buffer.from(signature(consultationId));
  if (providedBytes.length !== expectedBytes.length || !timingSafeEqual(providedBytes, expectedBytes)) return null;
  return consultationId;
}
