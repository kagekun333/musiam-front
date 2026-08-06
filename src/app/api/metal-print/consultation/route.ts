import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomUUID } from "node:crypto";
import { sendEmail } from "@/lib/email";
import {
  METAL_BUDGET_BANDS,
  METAL_ATTRIBUTION_FIELDS,
  METAL_DECISION_ROLES,
  METAL_PURCHASE_TIMINGS,
  METAL_SPACE_TYPES,
  metalPrintConsultationExpiresAt,
  qualifyMetalPrintConsultation,
  type MetalPrintConsultation,
} from "@/lib/metal-print-consultation";
import { isMetalPrintVerificationTraffic, saveMetalPrintConsultation, saveMetalPrintConsultationNotification, saveMetalPrintContactVerificationDelivery } from "@/lib/metal-print-redis.server";
import { METAL_PRINT_VIP_EDITIONS } from "@/lib/metal-print-vip";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import { ipFromRequest, rateLimit } from "@/lib/rate";
import { SITE_CONFIG } from "@/lib/site-config";
import { siteUrl } from "@/lib/site-url";
import { createMetalPrintContactVerificationToken } from "@/lib/metal-print-contact-verification.server";
import { getApprovedMetalPrintOffer } from "@/lib/metal-print-offers.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const has = <T extends readonly string[]>(values: T, value: unknown): value is T[number] => typeof value === "string" && values.includes(value);
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
const cleanAttribution = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 80).replace(/[^a-zA-Z0-9._:/-]/g, "") : "";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(siteUrl()).origin) {
    return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403 });
  }
  const rl = rateLimit(`metal-consultation:${ipFromRequest(request)}`, 3, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const email = String(body?.email ?? "").trim().toLowerCase();
  const editionId = String(body?.editionId ?? "");
  const workTitle = String(body?.workTitle ?? "").slice(0, 120);
  const fixedEdition = METAL_PRINT_VIP_EDITIONS.find((candidate) => candidate.id === editionId && candidate.title === workTitle);
  const catalogWorkId = editionId.startsWith("CATALOG-WORK:") ? editionId.slice("CATALOG-WORK:".length) : "";
  const catalogWork = !fixedEdition && catalogWorkId
    ? (await loadMergedWorksServer()).find((candidate) => String(candidate.id) === catalogWorkId && candidate.title === workTitle)
    : null;
  if (!emailPattern.test(email) || email.length > 254 || (!fixedEdition && !catalogWork)) return NextResponse.json({ ok: false, error: "invalid_identity" }, { status: 400 });
  if (!has(METAL_SPACE_TYPES, body?.spaceType) || !has(METAL_BUDGET_BANDS, body?.budgetBand) || !has(METAL_PURCHASE_TIMINGS, body?.purchaseTiming) || !has(METAL_DECISION_ROLES, body?.decisionRole) || body?.dossierRequested !== true || typeof body?.purchaseIntentIndicated !== "boolean" || body?.contactConsent !== true) {
    return NextResponse.json({ ok: false, error: "invalid_qualification" }, { status: 400 });
  }

  const consultation: MetalPrintConsultation = {
    email,
    editionId,
    workTitle,
    spaceType: body.spaceType,
    budgetBand: body.budgetBand,
    purchaseTiming: body.purchaseTiming,
    decisionRole: body.decisionRole,
    dossierRequested: true,
    purchaseIntentIndicated: body.purchaseIntentIndicated,
    contactConsent: true,
  };
  for (const field of METAL_ATTRIBUTION_FIELDS) {
    const value = cleanAttribution(body?.[field]);
    if (value) consultation[field] = value;
  }
  if (isMetalPrintVerificationTraffic({
    campaign: consultation.campaign ?? "direct",
    source: consultation.source ?? "direct",
    medium: consultation.medium,
  })) {
    return NextResponse.json({ ok: false, error: "verification_traffic_not_accepted" }, { status: 400 });
  }
  const approvedOffer = getApprovedMetalPrintOffer(editionId);
  const offerState = approvedOffer ? "approved" as const : "preflight_required" as const;
  const qualification = qualifyMetalPrintConsultation(consultation, offerState);
  const identitySecret = process.env.METAL_PRINT_IDENTITY_SECRET;
  if (!identitySecret || identitySecret.length < 32) {
    return NextResponse.json({ ok: false, error: "consultation_storage_unavailable" }, { status: 503 });
  }
  const consultationId = randomUUID();
  const createdAtDate = new Date();
  const createdAt = createdAtDate.toISOString();
  const expiresAt = metalPrintConsultationExpiresAt(createdAtDate, consultation.purchaseTiming).toISOString();
  const identityHash = createHmac("sha256", identitySecret).update(email).digest("hex");
  try {
    await saveMetalPrintConsultation({ consultationId, identityHash, createdAt, expiresAt, ...consultation, offerState, stage: qualification.stage, pipelineValueJpy: qualification.pipelineValueJpy });
  } catch (error) {
    const message = error instanceof Error ? error.message : "save_failed";
    return NextResponse.json({ ok: false, error: /not configured/.test(message) ? "consultation_storage_unavailable" : "save_failed" }, { status: 503 });
  }

  const verificationToken = createMetalPrintContactVerificationToken({ consultationId, expiresAt });
  const verificationUrl = new URL("/api/metal-print/consultation/verify", siteUrl());
  verificationUrl.searchParams.set("token", verificationToken);
  const contactVerification = await sendEmail({
    to: email,
    subject: "【伯爵MUSIAM】メタルプリント相談のメール確認",
    html: `<div style="font-family:sans-serif"><h2>メタルプリント相談の確認</h2><p>このメールアドレスで相談を続けるには、次のリンクを開いてください。</p><p><a href="${escapeHtml(verificationUrl.toString())}">メールアドレスを確認する</a></p><p>心当たりがない場合は操作不要です。リンクの期限: ${escapeHtml(expiresAt)}</p></div>`,
  });
  await saveMetalPrintContactVerificationDelivery({
    consultationId,
    attemptedAt: new Date().toISOString(),
    expiresAt,
    ok: contactVerification.ok,
    ...(contactVerification.error ? { error: contactVerification.error.slice(0, 240) } : {}),
  }).catch(() => undefined);

  const notification = await sendEmail({
    to: SITE_CONFIG.contactEmail,
    subject: `【Metal Print相談】${qualification.stage} — ${workTitle}`,
    html: `<div style="font-family:sans-serif"><h2>Metal Print相談</h2><p>ID: ${consultationId}</p><p>Edition: ${escapeHtml(workTitle)}</p><p>Offer state: ${approvedOffer ? "approved-offer" : "catalog-preflight-required"}</p><p>Email: ${escapeHtml(email)}</p><p>Space: ${consultation.spaceType}</p><p>Budget: ${consultation.budgetBand}</p><p>Timing: ${consultation.purchaseTiming}</p><p>Role: ${consultation.decisionRole}</p><p>Dossier requested: yes</p><p>Provisional purchase intent: ${consultation.purchaseIntentIndicated ? "indicated" : "not indicated"}</p><p>Stage: ${qualification.stage}</p><p>Contact verification email: ${contactVerification.ok ? "sent" : "failed"}</p><p>Campaign: ${escapeHtml(consultation.campaign ?? "direct")}</p><p>Source: ${escapeHtml(consultation.source ?? "direct")}</p><p>At: ${createdAt}</p></div>`,
  });
  await saveMetalPrintConsultationNotification({
    consultationId,
    attemptedAt: new Date().toISOString(),
    expiresAt,
    ok: notification.ok,
    ...(notification.error ? { error: notification.error.slice(0, 240) } : {}),
  }).catch(() => undefined);

  return NextResponse.json({
    ok: true,
    consultationToken: null,
    checkoutAvailable: false,
    qualified: false,
    provisionalStage: qualification.stage,
    verificationRequired: true,
    verificationEmailSent: contactVerification.ok,
    stage: "pending_contact_verification",
  });
}
