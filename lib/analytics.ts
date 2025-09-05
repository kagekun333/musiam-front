// lib/analytics.ts
"use client";
import posthog from "posthog-js";
import { useEffect } from "react";

export function Analytics() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host =
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com"; // ← EUを既定に

    if (!key) return;

    // 多重初期化ガード
    if (!(posthog as any).__loaded) {
      posthog.init(key, {
        api_host: host,
        autocapture: true,
        capture_pageview: true,
        debug: true, // ← 一時的にログを出す（後でfalseでもOK）
      });
    }

    // コンソールから確認できるように公開
    (window as any).posthog = posthog;
  }, []);

  return null;
}
