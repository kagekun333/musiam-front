import { createHash } from "node:crypto";
import { z } from "zod";
import { GrowthEventSchema, type GrowthEvent } from "./schema";
import { parseAnalyticsDelivery, classifyGrowthTraffic } from "./chat.server";
import { persistGrowthEvents } from "./store.server";

export const CLIENT_EVENT_NAMES = ["visit", "work_view", "product_view", "cta_clicked", "work_action", "listen_link_opened", "read_open_action"] as const;
const ClientInput = z.object({
  event: z.enum(CLIENT_EVENT_NAMES),
  delivery: z.object({id:z.string().uuid(),createdAt:z.number().int()}).strict(),
  properties: GrowthEventSchema.shape.properties.omit({trafficClass:true}),
}).strict();
type Sink = (events: GrowthEvent[]) => Promise<unknown>;
function uuid(identity: string, purpose: string) {
  const b=createHash("sha256").update(`growth-action-v1:${identity}:${purpose}`).digest().subarray(0,16);
  b[6]=(b[6]&15)|80;b[8]=(b[8]&63)|128;
  const h=b.toString("hex");return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
export function clientGrowthEvent(input: unknown, trafficClass: GrowthEvent["properties"]["trafficClass"], now=Date.now()): GrowthEvent | null {
  const parsed=ClientInput.safeParse(input);if(!parsed.success)return null;
  const d=parseAnalyticsDelivery(parsed.data.delivery,now);if(!d)return null;
  const {event,properties}=parsed.data;
  // Client traffic cannot emit checkout or settlement authority, nor assert human/test class.
  const expectedObservation=event==="visit"||event==="work_view"||event==="product_view" ? "page_visible"
    : event==="listen_link_opened"||event==="read_open_action" ? "browser_context_created" : "anchor_click";
  if(properties.observation!==expectedObservation)return null;
  if(event==="listen_link_opened"&&properties.actionKind!=="listen")return null;
  if(event==="read_open_action"&&!['read','open'].includes(properties.actionKind??''))return null;
  return GrowthEventSchema.parse({schemaVersion:1,event,eventId:uuid(`${d.id}:${d.createdAt}`,event),requestId:uuid(`${d.id}:${d.createdAt}`,"request"),occurredAt:d.createdAt,source:"site_client",properties:{...properties,trafficClass}});
}
export async function observeClientGrowthEvent(input: unknown, trafficClass: GrowthEvent["properties"]["trafficClass"], sink: Sink=persistGrowthEvents): Promise<void> {
  try { const event=clientGrowthEvent(input,trafficClass);if(event)await sink([event]); } catch { /* telemetry never controls navigation */ }
}
export function commerceGrowthEvent(event: "quote_requested"|"checkout_started"|"paid", recordIdentity: string, occurredAt: number, trafficClass: GrowthEvent["properties"]["trafficClass"]): GrowthEvent {
  // Only a non-customer business record/event reference is passed here, never email/customer/session visitor identity.
  return GrowthEventSchema.parse({schemaVersion:1,event,eventId:uuid(`metal-print:${recordIdentity}`,event),requestId:uuid(`metal-print:${recordIdentity}`,"request"),occurredAt,source:"metal_print_server",properties:{surface:"metal_print",observation:"business_recorded",trafficClass}});
}
export async function observeCommerceGrowthEvent(event: "quote_requested"|"checkout_started"|"paid", recordIdentity: string, occurredAt: number, trafficClass: GrowthEvent["properties"]["trafficClass"], sink: Sink=persistGrowthEvents): Promise<void> {
  try {await sink([commerceGrowthEvent(event,recordIdentity,occurredAt,trafficClass)]);} catch { /* telemetry must not change payment/consultation behavior */ }
}
export function requestGrowthTraffic(request: Request) {
  return classifyGrowthTraffic(process.env.VERCEL_ENV,request.headers.get("user-agent")??"",request.headers.get("authorization")??undefined);
}

export function growthMetricPartition(event: GrowthEvent): "human_verified"|"unknown"|"excluded" {
  const traffic=event.properties.trafficClass;
  return traffic==="bot"||traffic==="synthetic_test" ? "excluded" : traffic==="human_verified" ? "human_verified" : "unknown";
}
