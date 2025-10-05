// lib/rate.ts
// 依存ゼロの固定ウィンドウ型レートリミッター（IPごと）
type Bucket = { n: number; ts: number };
const bucket = new Map<string, Bucket>();

/**
 * @param ip      クライアントIP
 * @param limit   許可リクエスト数（デフォ30）
 * @param windowMs 窓幅（デフォ60秒）
 * @returns {ok:boolean, remaining:number, resetAt:number}
 */
export function rateLimit(ip: string, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const b = bucket.get(ip);
  if (!b || now - b.ts >= windowMs) {
    bucket.set(ip, { n: 1, ts: now });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (b.n < limit) {
    b.n++;
    return { ok: true, remaining: limit - b.n, resetAt: b.ts + windowMs };
  }
  return { ok: false, remaining: 0, resetAt: b.ts + windowMs };
}
