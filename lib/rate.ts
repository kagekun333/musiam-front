// ✗ NG
// import LRU from "lru-cache";

// ✓ OK
import { LRUCache } from "lru-cache";

const bucket = new LRUCache<string, { n: number; ts: number }>({ max: 10_000 });

export function rateLimit(ip: string, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const e = bucket.get(ip);
  if (!e || now - e.ts > windowMs) {
    bucket.set(ip, { n: 1, ts: now });
    return { ok: true };
  }
  e.n++; e.ts = now; bucket.set(ip, e);
  if (e.n > limit) return { ok: false };
  return { ok: true };
}
