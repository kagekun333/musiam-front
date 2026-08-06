import crypto from "node:crypto";

type ContactVerificationPayload = { consultationId: string; expiresAt: string };

function secret() {
  const value = process.env.METAL_PRINT_IDENTITY_SECRET ?? "";
  if (value.length < 32) throw new Error("contact verification secret unavailable");
  return value;
}

export function createMetalPrintContactVerificationToken(payload: ContactVerificationPayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", secret()).update(`metal-contact-v1.${encoded}`).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyMetalPrintContactVerificationToken(token: string): ContactVerificationPayload | null {
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) return null;
  const expected = crypto.createHmac("sha256", secret()).update(`metal-contact-v1.${encoded}`).digest();
  const supplied = Buffer.from(suppliedSignature, "base64url");
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as ContactVerificationPayload;
    if (!/^[0-9a-f-]{36}$/.test(payload.consultationId) || !Number.isFinite(Date.parse(payload.expiresAt)) || Date.parse(payload.expiresAt) <= Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
