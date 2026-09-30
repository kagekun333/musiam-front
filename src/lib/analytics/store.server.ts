import { Redis } from "@upstash/redis";
import { GrowthEventSchema, type GrowthEvent } from "./schema";

export type GrowthAnalyticsScope = "production" | "preview" | "development" | "local";

export function growthAnalyticsScope(vercelEnv = process.env.VERCEL_ENV): GrowthAnalyticsScope {
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "preview";
  if (vercelEnv === "development") return "development";
  return "local";
}

export function growthAnalyticsKey(
  dateIso = new Date().toISOString(),
  scope: GrowthAnalyticsScope = growthAnalyticsScope(),
): string {
  return `growth:v1:${scope}:count-chat:${dateIso.slice(0, 10)}`;
}

// Existing first-party Upstash/KV mechanism. Opt-in, no new vendor or credentials.
export async function persistGrowthEvents(events: GrowthEvent[]): Promise<"disabled" | "stored" | "unavailable"> {
  if (process.env.MUSIAM_ANALYTICS_SPINE_ENABLED !== "1") return "disabled";
  try {
    const validated = events.map(event => GrowthEventSchema.parse(event));
    if (!validated.length) return "stored";
    const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
    if (!url || !token) return "unavailable";
    const client = new Redis({ url, token, retry: false, signal: AbortSignal.timeout(200) });
    // Daily keys expire absolutely, even with continuous traffic. Bound each day's volume.
    const key = growthAnalyticsKey();
    const expiresAt = Math.floor(Date.now() / 86400000) * 86400 + 31 * 86400;
    await client.eval(`for i = 2, #ARGV do redis.call('LPUSH', KEYS[1], ARGV[i]) end
redis.call('LTRIM', KEYS[1], 0, 99999)
redis.call('EXPIREAT', KEYS[1], ARGV[1])
return 1`, [key], [expiresAt, ...validated.map(event => JSON.stringify(event))]);
    return "stored";
  } catch { return "unavailable"; }
}
