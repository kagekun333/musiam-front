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
  source: z.literal("count_chat_server"),
  properties: z.object({
    actionKind: ActionKind.optional(),
    bridgeAction: z.enum(["explore", "offer", "decline"]).optional(),
    linkCount: z.number().int().min(1).max(8).optional(),
    trafficClass: z.enum(["human_verified", "bot", "synthetic_test", "unknown"]).optional(),
  }).strict(),
}).strict();

export type GrowthEvent = z.infer<typeof GrowthEventSchema>;
