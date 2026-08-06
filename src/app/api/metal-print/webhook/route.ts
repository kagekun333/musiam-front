import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { sendEmail } from "@/lib/email";
import { getMetalPrintOfferFromApprovalSnapshot } from "@/lib/metal-print-offers.server";
import { applyMetalPrintRefund, confirmMetalPrintPayment, recordMetalPrintProductionVerification, releaseMetalPrintReservation, saveMetalPrintVendorOrderNotification } from "@/lib/metal-print-redis.server";
import { verifyMetalPrintStripeEvent } from "@/lib/metal-print-stripe.server";
import { SITE_CONFIG } from "@/lib/site-config";

export const runtime = "nodejs";

function sessionMetadata(session: Stripe.Checkout.Session) {
  const editionId = session.metadata?.editionId ?? "";
  const orderId = session.metadata?.orderId ?? "";
  if (!editionId || !orderId) throw new Error("checkout metadata missing");
  const consultationId = session.metadata?.consultationId ?? "";
  const offerApprovalToken = session.metadata?.offerApprovalToken ?? "";
  const offerApprovedAt = session.metadata?.offerApprovedAt ?? "";
  const source = session.metadata?.source ?? "";
  const medium = session.metadata?.medium ?? "";
  const campaign = session.metadata?.campaign ?? "";
  const content = session.metadata?.content ?? "";
  const dossierAcceptedAt = session.metadata?.dossierAcceptedAt ?? "";
  const purchaseIntentConfirmedAt = session.metadata?.purchaseIntentConfirmedAt ?? "";
  const proofDisclosureAcceptedAt = session.metadata?.proofDisclosureAcceptedAt ?? "";
  const madeToOrderTermsAcceptedAt = session.metadata?.madeToOrderTermsAcceptedAt ?? "";
  return { editionId, orderId, consultationId, offerApprovalToken, offerApprovedAt, source, medium, campaign, content, dossierAcceptedAt, purchaseIntentConfirmedAt, proofDisclosureAcceptedAt, madeToOrderTermsAcceptedAt };
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ ok: false, error: "signature_missing" }, { status: 400 });
  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = verifyMetalPrintStripeEvent(rawBody, signature);
  } catch {
    return NextResponse.json({ ok: false, error: "signature_invalid" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { editionId, orderId, consultationId, offerApprovalToken, offerApprovedAt, source, medium, campaign, content, dossierAcceptedAt, purchaseIntentConfirmedAt, proofDisclosureAcceptedAt, madeToOrderTermsAcceptedAt } = sessionMetadata(session);
      if (![dossierAcceptedAt, purchaseIntentConfirmedAt, proofDisclosureAcceptedAt, madeToOrderTermsAcceptedAt].every((value) => Number.isFinite(Date.parse(value)))) throw new Error("checkout acceptance evidence missing");
      const offer = getMetalPrintOfferFromApprovalSnapshot({ editionId, approvalToken: offerApprovalToken, approvedAt: offerApprovedAt, checkoutCreatedAtMs: session.created * 1000 });
      if (!offer) throw new Error("checkout offer approval snapshot invalid");
      if (session.payment_status !== "paid") throw new Error("checkout is not paid");
      if (session.currency !== offer.currency || session.amount_total !== offer.amountJpy) throw new Error("checkout amount mismatch");
      const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
      if (!paymentIntentId) throw new Error("payment intent missing");
      const paidAt = new Date(event.created * 1000).toISOString();
      const confirmation = await confirmMetalPrintPayment({ editionId, orderId, consultationId, eventId: event.id, paymentIntentId, amountJpy: offer.amountJpy, paidAt, source, medium, campaign, content, dossierAcceptedAt, purchaseIntentConfirmedAt, proofDisclosureAcceptedAt, madeToOrderTermsAcceptedAt });
      if (confirmation === "confirmed") {
        const notification = await sendEmail({
          to: process.env.METAL_PRINT_OPS_ALERT_EMAIL || SITE_CONFIG.contactEmail,
          subject: `【Metal Print入金】vendor発注を開始 — ${editionId}`,
          html: `<div style="font-family:sans-serif"><h2>PAID AWAITING VENDOR ORDER</h2><p>Edition: ${editionId}</p><p>Gross paid: ¥${offer.amountJpy.toLocaleString()}</p><p>Paid at: ${paidAt}</p><p>ロック済みvendor packet、配送先、地域別landed-cost上限を確認し、顧客資金で1点を受注生産してください。</p><small>この通知は発注・発送・納品の証明ではありません。顧客PIIと決済識別子は含みません。</small></div>`,
        });
        await saveMetalPrintVendorOrderNotification({ paymentIntentId, attemptedAt: new Date().toISOString(), ok: notification.ok, ...(notification.error ? { error: notification.error.slice(0, 240) } : {}) }).catch(() => undefined);
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const { editionId, orderId } = sessionMetadata(session);
      await releaseMetalPrintReservation(editionId, orderId);
      const verificationRunId = session.metadata?.verificationRunId ?? "";
      if (session.metadata?.verification === "true" && /^verify_[A-Za-z0-9_-]{16,100}$/.test(verificationRunId)) {
        await recordMetalPrintProductionVerification({
          runId: verificationRunId,
          eventId: event.id,
          eventType: "checkout.session.expired",
          checkoutSessionId: session.id,
          editionId,
          orderId,
          receivedAt: new Date(event.created * 1000).toISOString(),
        });
      }
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
      if (!paymentIntentId) throw new Error("payment intent missing on refund");
      await applyMetalPrintRefund({
        eventId: event.id,
        paymentIntentId,
        amountRefundedJpy: charge.amount_refunded,
        refundedAt: new Date(event.created * 1000).toISOString(),
      });
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ ok: false, error: "event_processing_failed" }, { status: 500 });
  }
}
