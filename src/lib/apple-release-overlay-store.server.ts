import { Redis } from "@upstash/redis";
import type { AppleReleaseOverlaySnapshot, AppleReleaseOverlayStore } from "@/lib/apple-release-overlay";

let redis: Redis | null = null;

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  if (!redis) redis = new Redis({ url, token });
  return redis;
}

/** Returns null when the production KV environment is absent; importing this module performs no I/O. */
export function getAppleReleaseOverlayStore(): AppleReleaseOverlayStore | null {
  const client = getRedis();
  if (!client) return null;
  return {
    get(key) {
      return client.get<unknown>(key);
    },
    async set(key, snapshot: AppleReleaseOverlaySnapshot) {
      await client.set(key, snapshot);
    },
  };
}
