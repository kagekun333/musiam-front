import { NextRequest, NextResponse } from "next/server";
import { METAL_FUNNEL_EVENTS, type MetalFunnelEvent } from "@/lib/metal-print-funnel-client";
import { recordMetalPrintFunnelEvent } from "@/lib/metal-print-redis.server";
import { ipFromRequest, rateLimit } from "@/lib/rate";
import { siteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 80).replace(/[^a-zA-Z0-9._:/-]/g, "") : "";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(siteUrl()).origin) return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403 });
  const rl = rateLimit(`metal-event:${ipFromRequest(request)}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const event = clean(body?.event) as MetalFunnelEvent;
  const anonymousSessionId = clean(body?.anonymousSessionId);
  if (!METAL_FUNNEL_EVENTS.includes(event) || !/^[0-9a-f-]{36}$/i.test(anonymousSessionId)) return NextResponse.json({ ok: false, error: "invalid_event" }, { status: 400 });
  try {
    await recordMetalPrintFunnelEvent({
      event,
      anonymousSessionId,
      source: clean(body?.source) || "direct",
      medium: clean(body?.medium) || "none",
      campaign: clean(body?.campaign) || "direct",
      content: clean(body?.content) || "none",
      spaceSegment: clean(body?.spaceSegment) || "none",
      occurredAt: Date.now(),
    });
  } catch {
    return NextResponse.json({ ok: false, error: "event_store_unavailable" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
