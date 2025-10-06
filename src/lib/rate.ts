// src/lib/rate.ts
/**
 * 超軽量のレートリミット（依存ゼロ、Node/Edge両対応）
 * 固定ウィンドウ方式：windowMs 以内のカウントを Map で集計
 */

export type RateResult = {
  ok: boolean;
  remaining: number;
  resetIn: number;   // ms
  retryAfter: number; // ms
  key: string;       // 集計キー（通常はIP）
};

type Bucket = { n: number; ts: number };
const store = new Map<string, Bucket>();

/** ヘッダ等からクライアントIPを推定（Next.js Pages / App 両対応） */
export function ipFromRequest(
  req:
    | Request
    | { headers?: Record<string, string | string[] | undefined> }
    | { headers?: { get(name: string): string | null } }
    | any,
): string {
  try {
    // Web標準 Request（App Router）想定
    if (typeof req?.headers?.get === "function") {
      const xff = req.headers.get("x-forwarded-for");
      if (xff) return xff.split(",")[0]!.trim();
      const xr = req.headers.get("x-real-ip");
      if (xr) return xr.trim();
    }
    // Node/Pages API の req.headers 形式
    const headers: any = req?.headers ?? {};
    const get = (k: string) => {
      const v = headers[k] ?? headers[k.toLowerCase()];
      return Array.isArray(v) ? v[0] : v;
    };
    const xff = get("x-forwarded-for") as string | undefined;
    if (xff) return xff.split(",")[0]!.trim();
    const xr = get("x-real-ip") as string | undefined;
    if (xr) return xr.trim();
    // Node socket
    const ra = (req?.socket?.remoteAddress ||
      req?.connection?.remoteAddress ||
      "") as string;
    return ra || "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * レート制限チェック
 * @param key 集計キー（通常はIP）
 * @param limit 許容回数
 * @param windowMs 窓サイズ（ミリ秒）
 */
export function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
): RateResult {
  const now = Date.now();
  const k = key || "unknown";
  const b = store.get(k);

  if (!b || now - b.ts >= windowMs) {
    // 新しい窓を開始
    store.set(k, { n: 1, ts: now });
    return {
      ok: true,
      remaining: Math.max(0, limit - 1),
      resetIn: windowMs,
      retryAfter: 0,
      key: k,
    };
  }

  if (b.n >= limit) {
    const resetIn = Math.max(0, windowMs - (now - b.ts));
    return {
      ok: false,
      remaining: 0,
      resetIn,
      retryAfter: resetIn,
      key: k,
    };
  }

  b.n += 1;
  store.set(k, b);
  return {
    ok: true,
    remaining: Math.max(0, limit - b.n),
    resetIn: Math.max(0, windowMs - (now - b.ts)),
    retryAfter: 0,
    key: k,
  };
}

/** メモリ使用抑制：たまに古いバケットを掃除（呼ぶ側の任意タイミングでOK） */
export function gcExpired(windowMs = 60_000) {
  const now = Date.now();
  for (const [k, v] of store) {
    if (now - v.ts > windowMs) store.delete(k);
  }
}
