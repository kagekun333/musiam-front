// components/Analytics.tsx
"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export function Analytics() {
  useEffect(() => {
    // 必ず env から読み取る（直書きしない）
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

    if (!key) {
      // キーが未設定なら初期化しない（ローカル/プレビューで安全）
      return;
    }

    posthog.init(key, {
      api_host: host,
      // 任意: セッション自動計測などのオプションは必要に応じて
      // capture_pageview: true,
      // capture_pageleave: true,
    });
  }, []);

  // 画面に何も表示しない
  return null;
}
