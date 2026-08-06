import { NextResponse } from "next/server";
import { markMetalPrintVendorOrderPlaced } from "@/lib/metal-print-redis.server";

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
  const vendorOrderedAt = typeof body?.vendorOrderedAt === "string" ? body.vendorOrderedAt : "";
  const expectedDispatchAt = typeof body?.expectedDispatchAt === "string" ? body.expectedDispatchAt : "";
  const vendorOrderEvidenceSha256 = typeof body?.vendorOrderEvidenceSha256 === "string" ? body.vendorOrderEvidenceSha256 : "";
  const orderedMs = Date.parse(vendorOrderedAt);
  const dispatchMs = Date.parse(expectedDispatchAt);
  if (!/^vendororder_[A-Za-z0-9_-]{8,100}$/.test(eventId)
    || !/^pi_[A-Za-z0-9_]{8,200}$/.test(paymentIntentId)
    || !Number.isFinite(orderedMs) || orderedMs > Date.now()
    || !Number.isFinite(dispatchMs) || dispatchMs <= orderedMs || dispatchMs > orderedMs + 60 * 86_400_000
    || !/^[a-f0-9]{64}$/.test(vendorOrderEvidenceSha256)) {
    return NextResponse.json({ ok: false, error: "invalid_vendor_order_evidence" }, { status: 400 });
  }
  try {
    const result = await markMetalPrintVendorOrderPlaced({ eventId, paymentIntentId, vendorOrderedAt, expectedDispatchAt, vendorOrderEvidenceSha256 });
    return NextResponse.json({ ok: true, result });
  } catch {
    return NextResponse.json({ ok: false, error: "vendor_order_transition_failed" }, { status: 409 });
  }
}
