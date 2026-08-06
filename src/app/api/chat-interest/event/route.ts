import { NextRequest, NextResponse } from "next/server";
import { CHAT_INTEREST_EVENTS, type ChatInterestEvent } from "@/lib/chat-interest-funnel-client";
import { recordChatInterestFunnelEvent } from "@/lib/metal-print-redis.server";
import { ipFromRequest, rateLimit } from "@/lib/rate";
import { siteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clean = (value: unknown) => typeof value === "string" ? value.trim().slice(0, 40).replace(/[^a-zA-Z0-9_-]/g, "") : "";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(siteUrl()).origin) return NextResponse.json({ ok: false, error: "invalid_origin" }, { status: 403 });
  const rl = rateLimit(`chat-interest-event:${ipFromRequest(request)}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const event = clean(body?.event) as ChatInterestEvent;
  const bridgeId = clean(body?.bridgeId);
  const anonymousSessionId = clean(body?.anonymousSessionId);
  const source = clean(body?.source) || "direct";
  const campaign = clean(body?.campaign) || "direct";
  const content = clean(body?.content) || "none";
  if (!CHAT_INTEREST_EVENTS.includes(event) || !bridgeId || !/^[0-9a-f-]{36}$/i.test(anonymousSessionId)) return NextResponse.json({ ok: false, error: "invalid_event" }, { status: 400 });
  try {
    await recordChatInterestFunnelEvent({ event, bridgeId, anonymousSessionId, source, campaign, content, occurredAt: Date.now() });
  } catch {
    return NextResponse.json({ ok: false, error: "event_store_unavailable" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
