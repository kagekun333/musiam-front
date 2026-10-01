import { Redis } from "@upstash/redis";
import { GrowthEventSchema, type GrowthEvent } from "./schema";

export type GrowthAnalyticsScope = "production" | "preview" | "development" | "local";
export type GrowthBackend = { eval(script: string, keys: string[], args: (string | number)[]): Promise<unknown> };
export function growthAnalyticsScope(vercelEnv = process.env.VERCEL_ENV): GrowthAnalyticsScope {
  return vercelEnv === "production" || vercelEnv === "preview" || vercelEnv === "development" ? vercelEnv : "local";
}
export function growthAnalyticsKey(dateIso = new Date().toISOString(), scope: GrowthAnalyticsScope = growthAnalyticsScope()): string {
  return `growth:v1:{${scope}:count-chat:${dateIso.slice(0, 10)}}`;
}
// The event row is the idempotency authority. There is no separate "seen" marker.
// Lua isolates concurrent callers; it does NOT roll back preceding commands on error.
// A failed row SET may consume a budget slot, but cannot mark an absent row delivered.
export const GROWTH_WRITE_LUA = `
local budgetType = redis.call('TYPE', KEYS[1]).ok
local rowType = redis.call('TYPE', KEYS[2]).ok
if budgetType ~= 'none' and budgetType ~= 'string' then return redis.error_reply('invalid budget key type') end
if rowType ~= 'none' and rowType ~= 'string' then return redis.error_reply('invalid event key type') end
local budget = redis.call('GET', KEYS[1])
if budget and (not tonumber(budget) or tonumber(budget) < 0 or tonumber(budget) % 1 ~= 0) then return redis.error_reply('invalid budget value') end
local existing = redis.call('GET', KEYS[2])
if existing then
  local ok, row = pcall(cjson.decode, existing)
  if not ok or type(row) ~= 'table' or row.eventId ~= ARGV[2] or row.schemaVersion ~= 1 or not row.event or not row.requestId or not row.occurredAt then
    return redis.error_reply('invalid existing event row')
  end
  return 0
end
if tonumber(budget or '0') >= tonumber(ARGV[4]) then return 2 end
if not budget then redis.call('SET', KEYS[1], '0', 'NX', 'EXAT', ARGV[1]) end
redis.call('EXPIREAT', KEYS[1], ARGV[1])
redis.call('INCR', KEYS[1])
redis.call('SET', KEYS[2], ARGV[3], 'NX', 'EXAT', ARGV[1])
return 1`;

export function growthEventWrite(event: GrowthEvent, scope: GrowthAnalyticsScope, now = Date.now()) {
  const row = GrowthEventSchema.parse(event);
  const expiresAt = Math.floor(row.occurredAt / 86400000) * 86400 + 31 * 86400;
  if (expiresAt <= Math.floor(now / 1000) || row.occurredAt > now + 300000) throw new Error("event outside retention window");
  const key = growthAnalyticsKey(new Date(row.occurredAt).toISOString(), scope);
  return { keys: [`${key}:budget`, `${key}:event:${row.eventId}`], args: [expiresAt, row.eventId, JSON.stringify(row), 100000] };
}

export async function writeGrowthEvents(events: GrowthEvent[], backend: GrowthBackend, scope: GrowthAnalyticsScope, now = Date.now()): Promise<"stored" | "unavailable" | "capped"> {
  try {
    const plans = events.map(event => growthEventWrite(event, scope, now));
    for (const plan of plans) {
      const result = await backend.eval(GROWTH_WRITE_LUA, plan.keys, plan.args);
      if (result === 2) return "capped";
      if (result !== 0 && result !== 1) throw new Error("invalid store result");
    }
    return "stored";
  } catch { return "unavailable"; }
}

export async function persistGrowthEvents(events: GrowthEvent[]): Promise<"disabled" | "stored" | "unavailable" | "capped"> {
  if (process.env.MUSIAM_ANALYTICS_SPINE_ENABLED !== "1") return "disabled";
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
    if (!url || !token) return "unavailable";
    const client = new Redis({ url, token, retry: false, signal: AbortSignal.timeout(200) });
    return await writeGrowthEvents(events, client, growthAnalyticsScope());
  } catch { return "unavailable"; }
}
