"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export function Analytics() {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {phc_qCDMzrFUtucfCtBAdIm04fB14D8rwVjVbwk6PdNpQ
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
    });
  }, []);

  return null; // 画面に何も表示しない
}


