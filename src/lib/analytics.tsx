"use client";

// 最小のダミー実装。後で PostHog / Vercel Analytics などに差し替えOK
export function Analytics() {
  return null;
}

// 任意：将来使う用の軽いAPI。呼ばれても何もしない。
export function track(_event: string, _props?: Record<string, unknown>) {
  // no-op
}
