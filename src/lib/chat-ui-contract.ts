/**
 * Browser-side boundary for the recovered Chat v3 contract.
 *
 * This module deliberately accepts only values that the active API already
 * serializes. It does not manufacture recommendations, links, CTAs, choices,
 * identity, or entitlement state.
 */
export type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
  persona?: "count" | "duke";
  /** Stable Catalog reference only. Card presentation fields are rebuilt from the current Catalog. */
  recommendedWorkId?: string;
};

export type ChatCardLink = {
  kind: "open" | "listen" | "buy" | "read";
  url: string;
};

export type ChatWorkCard = {
  /** R7-A stable catalog identity. The v3 wire field is currently `id`. */
  workId: string;
  title: string;
  cover: string;
  type?: string;
  reason?: string;
  links: ChatCardLink[];
};

export type ChatCta = {
  href: string;
  label: string;
  productId?: string;
};

export type ChatUiReply = {
  assistantText: string;
  persona: "count" | "duke";
  cards: ChatWorkCard[];
  cta: ChatCta | null;
  choices: string[];
  intent: string;
  productId: string | null;
  interestBridge: { id: string; action: "explore" | "offer" | "decline" } | null;
};

const CARD_LINK_KINDS = new Set<ChatCardLink["kind"]>(["open", "listen", "buy", "read"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function isChatConversationId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Relative in-site paths and HTTPS URLs are the only displayable actions. */
export function isSafeChatActionUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  const url = value.trim();
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function asCard(value: unknown): ChatWorkCard | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const workId = text(raw.id, 180);
  const title = text(raw.title, 240);
  const cover = text(raw.cover, 2048);
  if (!workId || !title || !cover || !isSafeChatActionUrl(cover)) return null;
  const links = Array.isArray(raw.links)
    ? raw.links.flatMap((link): ChatCardLink[] => {
        if (!link || typeof link !== "object") return [];
        const candidate = link as Record<string, unknown>;
        const kind = text(candidate.kind, 24) as ChatCardLink["kind"];
        const url = text(candidate.url, 2048);
        return CARD_LINK_KINDS.has(kind) && isSafeChatActionUrl(url) ? [{ kind, url }] : [];
      })
    : [];
  return {
    workId,
    title,
    cover,
    ...(text(raw.type, 80) ? { type: text(raw.type, 80) } : {}),
    ...(text(raw.reason, 1000) ? { reason: text(raw.reason, 1000) } : {}),
    links,
  };
}

function asCta(value: unknown): ChatCta | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const href = text(raw.href, 2048);
  const label = text(raw.label, 240);
  if (!href || !label || !isSafeChatActionUrl(href)) return null;
  const productId = text(raw.productId, 120);
  return { href, label, ...(productId ? { productId } : {}) };
}

function asCards(payload: Record<string, unknown>) {
  const candidates = [payload.card, ...(Array.isArray(payload.cards) ? payload.cards : [])];
  const seen = new Set<string>();
  return candidates.flatMap((candidate) => {
    const card = asCard(candidate);
    if (!card || seen.has(card.workId)) return [];
    seen.add(card.workId);
    return [card];
  });
}

/**
 * Supports an explicitly supplied compatibility `cards` / `choices` field,
 * while the active R7-B server still returns its canonical singular `card`.
 */
export function normalizeChatUiReply(value: unknown): ChatUiReply {
  const payload = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const choices = Array.isArray(payload.choices)
    ? payload.choices.map((choice) => text(choice, 240)).filter(Boolean).slice(0, 8)
    : [];
  const bridge = payload.interestBridge && typeof payload.interestBridge === "object"
    ? payload.interestBridge as Record<string, unknown>
    : null;
  const bridgeId = text(bridge?.id, 160);
  const bridgeAction = text(bridge?.action, 16);
  return {
    assistantText: text(payload.assistantText, 4000),
    persona: payload.persona === "duke" ? "duke" : "count",
    cards: asCards(payload),
    cta: asCta(payload.cta),
    choices,
    intent: text(payload.intent, 80) || "conversation",
    productId: text(payload.productId, 120) || null,
    interestBridge: bridgeId && (bridgeAction === "explore" || bridgeAction === "offer" || bridgeAction === "decline")
      ? { id: bridgeId, action: bridgeAction }
      : null,
  };
}

/** Preserve serialized order; malformed values are never rendered or resent. */
export function normalizeChatHistory(value: unknown, canonicalWorkIds?: ReadonlySet<string>): ChatHistoryMessage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((message): ChatHistoryMessage[] => {
    if (!message || typeof message !== "object") return [];
    const raw = message as Record<string, unknown>;
    const content = text(raw.content, 2000);
    if ((raw.role !== "user" && raw.role !== "assistant") || !content) return [];
    const rawWorkId = raw.recommendedWorkId;
    const recommendedWorkId = raw.role === "assistant"
      && typeof rawWorkId === "string"
      && rawWorkId.length > 0
      && rawWorkId.length <= 180
      && rawWorkId.trim() === rawWorkId
      && (!canonicalWorkIds || canonicalWorkIds.has(rawWorkId))
      ? rawWorkId
      : undefined;
    return [{
      role: raw.role,
      content,
      ...(raw.persona === "count" || raw.persona === "duke" ? { persona: raw.persona } : {}),
      ...(recommendedWorkId ? { recommendedWorkId } : {}),
    }];
  }).slice(-40);
}

/** Do not append the same assistant result twice after a stale/retry race. */
export function appendAssistantReply(messages: ChatHistoryMessage[], reply: Pick<ChatUiReply, "assistantText" | "persona"> & { recommendedWorkId?: string | null }): ChatHistoryMessage[] {
  if (!reply.assistantText) return messages;
  const previous = messages[messages.length - 1];
  const candidateId = typeof reply.recommendedWorkId === "string"
    && reply.recommendedWorkId.length > 0
    && reply.recommendedWorkId.length <= 180
    && reply.recommendedWorkId.trim() === reply.recommendedWorkId
    ? reply.recommendedWorkId
    : undefined;
  if (previous?.role === "assistant" && previous.content === reply.assistantText && previous.persona === reply.persona) {
    if (!candidateId || previous.recommendedWorkId === candidateId) return messages;
    return [...messages.slice(0, -1), { ...previous, recommendedWorkId: candidateId }];
  }
  return [...messages, {
    role: "assistant" as const,
    content: reply.assistantText,
    persona: reply.persona,
    ...(candidateId ? { recommendedWorkId: candidateId } : {}),
  }];
}
