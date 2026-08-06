import { NextResponse } from "next/server";
import { markMetalPrintFulfilled } from "@/lib/metal-print-redis.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const eventId = typeof body?.eventId === "string" ? body.eventId : "";
  const paymentIntentId = typeof body?.paymentIntentId === "string" ? body.paymentIntentId : "";
  const fulfilledAt = typeof body?.fulfilledAt === "string" ? body.fulfilledAt : "";
  const trackingReferenceHash = typeof body?.trackingReferenceHash === "string" ? body.trackingReferenceHash : "";
  const fulfillmentEvidenceSha256 = typeof body?.fulfillmentEvidenceSha256 === "string" ? body.fulfillmentEvidenceSha256 : "";
  if (!/^fulfill_[A-Za-z0-9_-]{8,100}$/.test(eventId)
    || !/^pi_[A-Za-z0-9_]{8,200}$/.test(paymentIntentId)
    || !Number.isFinite(Date.parse(fulfilledAt))
    || Date.parse(fulfilledAt) > Date.now()
    || !/^[a-f0-9]{64}$/.test(trackingReferenceHash)
    || !/^[a-f0-9]{64}$/.test(fulfillmentEvidenceSha256)) {
    return NextResponse.json({ ok: false, error: "invalid_fulfillment_evidence" }, { status: 400 });
  }
  try {
    const result = await markMetalPrintFulfilled({ eventId, paymentIntentId, fulfilledAt, trackingReferenceHash, fulfillmentEvidenceSha256 });
    return NextResponse.json({ ok: true, result });
  } catch {
    return NextResponse.json({ ok: false, error: "fulfillment_transition_failed" }, { status: 409 });
  }
}
