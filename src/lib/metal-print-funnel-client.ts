export const METAL_FUNNEL_EVENTS = [
  "metal_home_view",
  "metal_home_cta_click",
  "metal_dossier_view",
  "metal_chat_start",
  "metal_salon_open",
  "metal_first_message",
  "metal_music_affinity_entry",
  "metal_music_affinity_dossier_accept",
  "metal_duke",
  "metal_edition_selected",
  "metal_consultation_submitted",
] as const;

export type MetalFunnelEvent = (typeof METAL_FUNNEL_EVENTS)[number];
type Properties = { source?: string; medium?: string; campaign?: string; content?: string; spaceSegment?: string };

function anonymousSessionId() {
  const key = "metalPrintAnonymousSessionId";
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID();
  sessionStorage.setItem(key, value);
  return value;
}

export function recordMetalFunnelEvent(event: MetalFunnelEvent, properties: Properties = {}) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ event, anonymousSessionId: anonymousSessionId(), ...properties });
  void fetch("/api/metal-print/event", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
}
