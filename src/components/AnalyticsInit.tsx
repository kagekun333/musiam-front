"use client";
// src/components/AnalyticsInit.tsx
// App Router 用 PostHog 初期化 (旧 PostHogInit.tsx の置き換え)。
// Pages Router 側 (_app.tsx) と二重初期化しないよう window.posthog をガード。

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// 注: Window.posthog のグローバル型宣言は lib/analytics.ts に既存のものを利用

export default function AnalyticsInit() {
  const pathname = usePathname();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || window.posthog) return;
    let cancelled = false;
    import("posthog-js")
      .then(({ default: posthog }) => {
        if (cancelled || window.posthog) return;
        posthog.init(key, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
          capture_pageview: false,
        });
        window.posthog = posthog as unknown as Window["posthog"];
        posthog.capture("$pageview");
      })
      .catch(() => { /* analytics は fail-silent */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    window.posthog?.capture?.("$pageview");
  }, [pathname]);

  return null;
}
