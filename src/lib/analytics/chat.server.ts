import { randomUUID } from "node:crypto";
import { GrowthEventSchema, type GrowthEvent } from "./schema";
import { persistGrowthEvents } from "./store.server";

type Sink = (events: GrowthEvent[]) => Promise<unknown>;

const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

/**
 * Projects a bounded analytics event stream from a successful Count Chat response.
 * Never serializes the request, response body, user text, URLs, work titles, IPs,
 * email addresses, names or arbitrary identifiers.
 */
export function chatResponseEvents(payload: unknown, userTurns: number): GrowthEvent[] {
  const response = object(payload);
  if (response?.ok !== true || !Number.isInteger(userTurns) || userTurns < 0) return [];

  const requestId = randomUUID();
  const occurredAt = Date.now();
  const events: GrowthEvent[] = [];
  const add = (event: GrowthEvent["event"], properties: GrowthEvent["properties"] = {}) => {
    events.push(GrowthEventSchema.parse({
      schemaVersion: 1,
      event,
      eventId: randomUUID(),
      requestId,
      occurredAt,
      source: "count_chat_server",
      properties,
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
): Promise<void> {
  try {
    const events = chatResponseEvents(payload, userTurns);
    if (events.length) await sink(events);
  } catch {
    console.warn("[growth-analytics-v1] event_store_unavailable");
  }
}
