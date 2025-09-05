// lib/analytics.ts
"use client";

import posthog from "posthog-js";
import { useEffect, useRef } from "react";

// Window 型を拡張（any を使わない）
declare global {
  interface Window {
    posthog?: typeof posthog;
  }
}

/**
 * PostHog 初期化（クライアント側1回だけ）
 * - EU クラスタをデフォルト（NEXT_PUBLIC_POSTHOG_HOST があればそれを優先）
 * - window.posthog に公開してデバッグしやすく
 * - ESLint の no-explicit-any に抵触しない書き方
 */
export function Analytics() {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host =
      process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

    if (!key) {
      // キー未設定なら何もしない（本番環境変数を確認）
      return;
    }

    posthog.init(key, {
      api_host: host,
      autocapture: true,
      capture_pageview: true,
      // debug は必要な時だけ true に（本番は通常 false 推奨）
      // debug: true,
    });

    // DevTools から確認できるように（型安全に window に公開）
    window.posthog = posthog;

    initializedRef.current = true;
  }, []);

  return null;
}
