// lib/analytics.ts
"use client";

import posthog from "posthog-js";
import { useEffect, useRef } from "react";

type CaptureOpts = { send_instantly?: boolean };
type PostHogLike = {
  capture: (name: string, props?: Record<string, unknown>, opts?: CaptureOpts) => void;
  identify?: (id: string) => void;
  reset?: () => void;
};

declare global {
  interface Window {
    posthog?: PostHogLike;
  }
}

export function Analytics() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

    // デバッグログ（本番でも最初だけ出ます）
    console.log("[MUSIAM][PostHog] init start", { hasKey: Boolean(key), host });

    if (!key) {
      // キーが無くても window.posthog は「ダミー」を公開しておく（Console検証用）
      window.posthog = {
        capture: (n) =>
          console.warn(`[MUSIAM][PostHog] KEY missing, skipped capture(${n})`),
      };
      console.warn("[MUSIAM][PostHog] NEXT_PUBLIC_POSTHOG_KEY is missing");
      initialized.current = true;
      return;
    }

    posthog.init(key, {
      api_host: host,
      autocapture: true,
      capture_pageview: true,
      // debug: true, // 必要な時だけ
    });

    // Console から window.posthog.capture(...) できるように公開
    window.posthog = posthog as unknown as PostHogLike;

    console.log("[MUSIAM][PostHog] init done");
    initialized.current = true;
  }, []);

  return null;
}
