// src/app/lp/star-pass-001/ViewPing.tsx
"use client";

import { useEffect } from "react";
import { trackView } from "@/lib/analytics/events";

export default function ViewPing() {
  useEffect(() => {
    trackView("lp/star-pass-001");
  }, []);
  return null;
}
