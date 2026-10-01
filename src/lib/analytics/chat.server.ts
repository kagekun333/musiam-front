import { createHash, timingSafeEqual } from "node:crypto";
import { GrowthEventSchema, type GrowthEvent } from "./schema";
import { persistGrowthEvents } from "./store.server";

type Sink = (events: GrowthEvent[]) => Promise<unknown>;

export type AnalyticsDelivery = { id: string; createdAt: number };
export function parseAnalyticsDelivery(value: unknown, now = Date.now()): AnalyticsDelivery | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some(key => !["id", "createdAt"].includes(key))) return null;
  if (typeof row.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.id)) return null;
  if (typeof row.createdAt !== "number" || !Number.isSafeInteger(row.createdAt) || row.createdAt < now - 30 * 86400000 || row.createdAt > now + 300000) return null;
  return { id: row.id.toLowerCase(), createdAt: row.createdAt };
}
export function classifyGrowthTraffic(vercelEnv: string | undefined, userAgent: string, authorization?: string, cronSecret = process.env.CRON_SECRET): NonNullable<GrowthEvent["properties"]["trafficClass"]> {
  // Reuse the existing server-side production verification credential solely to
  // label authenticated test requests. This grants no chat/payment permissions.
  const expected = cronSecret ? `Bearer ${cronSecret}` : "";
  const suppliedBytes = Buffer.from(authorization && authorization.length <= 4096 ? authorization : "");
  const expectedBytes = Buffer.from(expected);
  const authenticatedTest = Boolean(expectedBytes.length && suppliedBytes.length === expectedBytes.length
    && timingSafeEqual(suppliedBytes, expectedBytes));
  if (vercelEnv !== "production" || authenticatedTest) return "synthetic_test";
  if (/bot|crawler|spider|slurp|bingpreview|facebookexternalhit|monitoring|uptime/i.test(userAgent)) return "bot";
  return "unknown";
}

const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

/**
 * Projects a bounded analytics event stream from a successful Count Chat response.
 * Never serializes the request, response body, user text, URLs, work titles, IPs,
 * email addresses, names or arbitrary identifiers.
 */
export function chatResponseEvents(payload: unknown, userTurns: number, deliveryInput?: unknown, trafficClass: GrowthEvent["properties"]["trafficClass"] = "unknown", now = Date.now()): GrowthEvent[] {
  const response = object(payload);
  const delivery = parseAnalyticsDelivery(deliveryInput, now);
  // Missing/invalid telemetry must neither change chat validation nor fabricate
  // an identity that would count a transport retry as a new request.
  if (response?.ok !== true || !Number.isInteger(userTurns) || userTurns < 0 || !delivery) return [];
  const stableUuid = (purpose: string) => {
    const bytes = createHash("sha256").update(`count-chat-v1:${delivery.id}:${delivery.createdAt}:${purpose}`).digest().subarray(0, 16);
    bytes[6] = (bytes[6] & 0x0f) | 0x50;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString("hex");
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  };
  const requestId = stableUuid("request");
  const occurredAt = delivery.createdAt;
  const events: GrowthEvent[] = [];
  const add = (event: GrowthEvent["event"], properties: GrowthEvent["properties"] = {}) => {
    events.push(GrowthEventSchema.parse({
      schemaVersion: 1,
      event,
      eventId: stableUuid(event),
      requestId,
      occurredAt,
      source: "count_chat_server",
      properties: { ...properties, trafficClass },
    }));
  };

  if (userTurns === 0) add("chat_start");
  if (userTurns === 1) add("chat_first_request");

  const card = object(response.card);
  if (card) {
    add("recommendation_presented");
    const links = Array.isArray(card.links) ? card.links : [];
    const linkCount = links.filter((link) => {
      const row = object(link);
      return !!row
        && ["open", "listen", "buy", "read"].includes(String(row.kind))
        && typeof row.url === "string"
        && row.url.length > 0;
    }).length;
    if (linkCount) add("work_links_presented", { linkCount: Math.min(linkCount, 8) });
  }

  const action = object(response.actionResult);
  if (
    action?.status === "LINK_PRESENTED"
    && ["open", "listen", "buy", "read"].includes(String(action.kind))
  ) {
    add("action_link_presented", {
      actionKind: action.kind as GrowthEvent["properties"]["actionKind"],
    });
  }

  const bridge = object(response.interestBridge);
  if (bridge && ["explore", "offer", "decline"].includes(String(bridge.action))) {
    add("product_interest_bridge", {
      bridgeAction: bridge.action as GrowthEvent["properties"]["bridgeAction"],
    });
  }

  const cta = object(response.cta);
  if (cta && typeof cta.href === "string" && cta.href.length > 0) {
    add("product_cta_presented");
  }

  return events;
}

/**
 * Telemetry is failure-isolated. The bounded store timeout means analytics cannot
 * turn a successful chat response into a failed request.
 */
export async function observeChatResponse(
  payload: unknown,
  userTurns: number,
  sink: Sink = persistGrowthEvents,
  deliveryInput?: unknown,
  trafficClass: GrowthEvent["properties"]["trafficClass"] = "unknown",
): Promise<void> {
  try {
    const events = chatResponseEvents(payload, userTurns, deliveryInput, trafficClass);
    if (events.length) await sink(events);
  } catch {
    console.warn("[growth-analytics-v1] event_store_unavailable");
  }
}
