export const CHAT_INTEREST_EVENTS = [
  "chat_interest_bridge_show",
  "chat_interest_bridge_accept",
  "chat_interest_bridge_decline",
] as const;

export type ChatInterestEvent = (typeof CHAT_INTEREST_EVENTS)[number];

function anonymousSessionId() {
  const key = "musiamChatInterestAnonymousSessionId";
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const value = crypto.randomUUID();
  sessionStorage.setItem(key, value);
  return value;
}

export function recordChatInterestEvent(event: ChatInterestEvent, bridgeId: string) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const body = JSON.stringify({
    event,
    bridgeId,
    anonymousSessionId: anonymousSessionId(),
    source: params.get("utm_source") ?? "direct",
    campaign: params.get("utm_campaign") ?? "direct",
    content: params.get("utm_content") ?? "none",
  });
  void fetch("/api/chat-interest/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
