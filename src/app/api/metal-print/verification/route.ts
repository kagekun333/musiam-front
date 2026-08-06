import { NextResponse } from "next/server";
import { getMetalPrintProductionVerification, reserveMetalPrint } from "@/lib/metal-print-redis.server";
import { getMetalPrintStripe } from "@/lib/metal-print-stripe.server";
import { siteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EDITION_ID = "VIP-METAL-2026-07-NATURA";
const VERIFY_AMOUNT_JPY = 330_000;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const runId = `verify_${crypto.randomUUID().replaceAll("-", "")}`;
  const orderId = `verification_${crypto.randomUUID()}`;
  const expiresAt = new Date(Date.now() + 35 * 60 * 1000);

  try {
    const reservation = await reserveMetalPrint(EDITION_ID, orderId, expiresAt);
    const stripe = getMetalPrintStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${siteUrl()}/vip-metal-print?verification=success`,
      cancel_url: `${siteUrl()}/vip-metal-print?verification=cancelled`,
      expires_at: Math.floor(expiresAt.getTime() / 1000),
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "jpy",
          unit_amount: VERIFY_AMOUNT_JPY,
          product_data: { name: "Hakusyaku MUSIAM Metal Print — production verification (do not pay)" },
        },
      }],
      metadata: {
        product: "vip-metal-print-verification",
        verification: "true",
        verificationRunId: runId,
        editionId: EDITION_ID,
        orderId,
        serial: reservation.serial,
      },
    }, { idempotencyKey: runId });

    const expiredSession = await stripe.checkout.sessions.expire(session.id);
    return NextResponse.json({
      ok: true,
      runId,
      state: "expired_awaiting_signed_webhook",
      checkoutSessionId: session.id,
      paymentCreated: expiredSession.payment_intent !== null,
      customerCreated: expiredSession.customer !== null,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "verification_start_failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const runId = new URL(request.url).searchParams.get("runId") ?? "";
  if (!/^verify_[A-Za-z0-9_-]{16,100}$/.test(runId)) {
    return NextResponse.json({ ok: false, error: "invalid_run_id" }, { status: 400 });
  }
  const receipt = await getMetalPrintProductionVerification(runId);
  return NextResponse.json(receipt
    ? { ok: true, state: "signed_webhook_persisted_and_reservation_released", receipt }
    : { ok: true, state: "pending" });
}
