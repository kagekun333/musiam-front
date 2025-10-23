"use client";
import { useEffect } from "react";

export function AnalyticsInit() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.posthog.com";
    if (!key) return;
    import("posthog-js").then(({ default: posthog }) => {
      posthog.init(key, { api_host: host, capture_pageview: true, person_profiles: "identified_only" });
      (window as any).posthog = posthog;
    });
  }, []);
  return null;
}
