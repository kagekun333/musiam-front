import { NextResponse } from "next/server";
import { getApprovedMetalPrintOffer } from "@/lib/metal-print-offers.server";
import { getMetalPrintConsultation, releaseMetalPrintReservation, reserveMetalPrint } from "@/lib/metal-print-redis.server";
import { verifyMetalPrintConsultationToken } from "@/lib/metal-print-consultation-token.server";
import { getMetalPrintStripe } from "@/lib/metal-print-stripe.server";
import { siteUrl } from "@/lib/site-url";
import { METAL_PRINT_VERIFIED_SHIPPING_COUNTRIES } from "@/lib/metal-print-shipping-policy";

export const runtime = "nodejs";
const CHECKOUT_LIFETIME_MS = 30 * 60 * 1000;
const PAYMENT_CONFIRMATION_GRACE_MS = 72 * 60 * 60 * 1000;

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(siteUrl()).origin;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403 });
  const body = await request.json().catch(() => null) as { editionId?: unknown; consultationToken?: unknown } | null;
  const editionId = typeof body?.editionId === "string" ? body.editionId : "";
  const consultationToken = typeof body?.consultationToken === "string" ? body.consultationToken : "";
  let consultationId: string | null = null;
  try {
    consultationId = verifyMetalPrintConsultationToken(consultationToken);
  } catch {
    return NextResponse.json({ ok: false, error: "checkout_not_configured" }, { status: 503 });
  }
  if (!consultationId) return NextResponse.json({ ok: false, error: "qualified_consultation_required" }, { status: 403 });
  const consultation = await getMetalPrintConsultation(consultationId).catch(() => null);
  if (!consultation || consultation.stage !== "qualified" || consultation.editionId !== editionId || Date.parse(consultation.expiresAt) <= Date.now() || !consultation.dossierAcceptedAt || !consultation.purchaseIntentConfirmedAt || !consultation.proofDisclosureAcceptedAt || !consultation.madeToOrderTermsAcceptedAt) {
    return NextResponse.json({ ok: false, error: "qualified_consultation_invalid" }, { status: 403 });
  }
  const offer = getApprovedMetalPrintOffer(editionId);
  if (!offer) return NextResponse.json({ ok: false, error: "offer_not_approved" }, { status: 409 });
  const offerApprovalToken = offer.approvalToken as string;
  const offerApprovedAt = offer.approvedAt as string;
  const attribution = {
    source: consultation.source ?? "direct",
    medium: consultation.medium ?? "none",
    campaign: consultation.campaign ?? "direct",
    content: consultation.content ?? "none",
  };
  const acceptanceEvidence = {
    dossierAcceptedAt: consultation.dossierAcceptedAt,
    purchaseIntentConfirmedAt: consultation.purchaseIntentConfirmedAt,
    proofDisclosureAcceptedAt: consultation.proofDisclosureAcceptedAt,
    madeToOrderTermsAcceptedAt: consultation.madeToOrderTermsAcceptedAt,
  };
  const workTitle = consultation.workTitle || editionId;
  const cancelUrl = new URL("/chat", siteUrl());
  cancelUrl.searchParams.set("intent", "metal-print");
  cancelUrl.searchParams.set("work", workTitle);
  cancelUrl.searchParams.set("checkout", "cancelled");
  cancelUrl.searchParams.set("utm_source", attribution.source);
  cancelUrl.searchParams.set("utm_medium", attribution.medium);
  cancelUrl.searchParams.set("utm_campaign", attribution.campaign);
  cancelUrl.searchParams.set("utm_content", attribution.content);

  const orderId = crypto.randomUUID();
  const checkoutExpiresAt = new Date(Date.now() + CHECKOUT_LIFETIME_MS);
  const reservationGraceUntil = new Date(checkoutExpiresAt.getTime() + PAYMENT_CONFIRMATION_GRACE_MS);
  try {
    const reservation = await reserveMetalPrint(editionId, orderId, reservationGraceUntil);
    try {
      const stripe = getMetalPrintStripe();
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_creation: "always",
        billing_address_collection: "required",
        shipping_address_collection: {
          allowed_countries: [...METAL_PRINT_VERIFIED_SHIPPING_COUNTRIES],
        },
        phone_number_collection: { enabled: true },
        custom_text: {
          submit: {
            message: "受注生産品です。決済確認後に1点ずつ製造を開始します。通常は製造開始から約12営業日＋配送期間が目安です。製造開始後の変更・キャンセル可否は進行状況により異なります。",
          },
        },
        success_url: `${siteUrl()}/vip-metal-print?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl.toString(),
        expires_at: Math.floor(checkoutExpiresAt.getTime() / 1000),
        line_items: [{
          quantity: 1,
          price_data: {
            currency: offer.currency,
            unit_amount: offer.amountJpy,
            product_data: { name: `Hakusyaku MUSIAM Metal Print — ${editionId}` },
          },
        }],
        metadata: { product: "vip-metal-print", editionId, orderId, serial: reservation.serial, consultationId, offerApprovalToken, offerApprovedAt, reservationGraceUntil: reservationGraceUntil.toISOString(), ...acceptanceEvidence, ...attribution },
        payment_intent_data: { metadata: { product: "vip-metal-print", editionId, orderId, serial: reservation.serial, consultationId, offerApprovalToken, offerApprovedAt, reservationGraceUntil: reservationGraceUntil.toISOString(), ...acceptanceEvidence, ...attribution } },
      }, { idempotencyKey: orderId });
      return NextResponse.json({ ok: true, checkoutUrl: session.url, orderId, expiresAt: checkoutExpiresAt.toISOString() });
    } catch (error) {
      await releaseMetalPrintReservation(editionId, orderId);
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "checkout_failed";
    const status = /sold out/.test(message) ? 409 : /not configured/.test(message) ? 503 : 500;
    return NextResponse.json({ ok: false, error: status === 500 ? "checkout_failed" : message }, { status });
  }
}
