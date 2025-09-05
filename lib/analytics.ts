"use client";
import posthog from "posthog-js";
import { useEffect } from "react";

export function Analytics() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY || "", {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      });
    }
  }, []);
  return null;
}
