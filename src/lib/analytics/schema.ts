import { z } from "zod";

export const EVENT_NAMES = [
  "visit",
  "chat_start",
  "chat_first_request",
  "recommendation_presented",
  "work_links_presented",
  "action_link_presented",
  "product_interest_bridge",
  "product_cta_presented",
  "work_view",
  "product_view",
  "cta_clicked",
  "listen_link_opened",
  "read_open_action",
  "quote_requested",
  "checkout_started",
  "work_action",
  "product_interest",
  "quote",
  "checkout",
  "paid",
  "repeat",
] as const;

export const ActionKind = z.enum(["open", "listen", "buy", "read"]);

export const GrowthEventSchema = z.object({
  schemaVersion: z.literal(1),
  eventId: z.string().uuid(),
  requestId: z.string().uuid(),
  occurredAt: z.number().int().nonnegative().max(8640000000000000),
  event: z.enum(EVENT_NAMES),
  source: z.enum(["count_chat_server", "site_client", "metal_print_server"]),
  properties: z.object({
    actionKind: ActionKind.optional(),
    surface: z.enum(["chat", "works", "work_detail", "metal_print", "other"]).optional(),
    observation: z.enum(["anchor_click", "browser_context_created", "page_visible", "business_recorded"]).optional(),
    bridgeAction: z.enum(["explore", "offer", "decline"]).optional(),
    linkCount: z.number().int().min(1).max(8).optional(),
    trafficClass: z.enum(["human_verified", "bot", "synthetic_test", "unknown"]).optional(),
  }).strict(),
}).strict();

export type GrowthEvent = z.infer<typeof GrowthEventSchema>;
