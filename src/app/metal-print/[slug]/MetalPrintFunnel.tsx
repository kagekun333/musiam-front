"use client";

import { useEffect, useState } from "react";
import { METAL_FUNNEL_EVENTS, recordMetalFunnelEvent, type MetalFunnelEvent } from "@/lib/metal-print-funnel-client";

type Props = {
  editionId: string;
  slug: string;
  workTitle: string;
  chatHref: string;
  label: string;
};

function campaignProperties() {
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get("utm_source") ?? "direct",
    medium: params.get("utm_medium") ?? "none",
    campaign: params.get("utm_campaign") ?? "none",
    content: params.get("utm_content") ?? "none",
    spaceSegment: params.get("space") ?? "none",
  };
}

function capture(event: string, properties: Record<string, unknown>) {
  window.posthog?.capture?.(event, properties);
  if (METAL_FUNNEL_EVENTS.includes(event as MetalFunnelEvent)) recordMetalFunnelEvent(event as MetalFunnelEvent, properties as Record<string, string>);
}

export function MetalPrintDossierView({ editionId, slug, workTitle }: Pick<Props, "editionId" | "slug" | "workTitle">) {
  useEffect(() => {
    capture("metal_dossier_view", { editionId, slug, workTitle, ...campaignProperties() });
  }, [editionId, slug, workTitle]);
  return null;
}

export function MetalPrintChatCta({ editionId, slug, workTitle, chatHref, label }: Props) {
  const [attributedHref, setAttributedHref] = useState(chatHref);
  useEffect(() => {
    const source = new URLSearchParams(window.location.search);
    const target = new URL(chatHref, window.location.origin);
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "space"]) {
      const value = source.get(key)?.slice(0, 80);
      if (value) target.searchParams.set(key, value);
    }
    setAttributedHref(`${target.pathname}${target.search}`);
  }, [chatHref]);
  return (
    <a
      className="metal-edition-primary"
      href={attributedHref}
      onClick={() => capture("metal_chat_start", { editionId, slug, workTitle, ...campaignProperties() })}
    >
      {label}
    </a>
  );
}
