import { buildChatWorkCard, type ChatApiWorkCard } from "@/lib/chat-work-card";
import { normalizeChatHistory, type ChatHistoryMessage } from "@/lib/chat-ui-contract";
import type { CatalogWork } from "@/lib/mergeWorksCatalog";

export function hasAssistantRecommendedWorkId(messages: unknown): boolean {
  if (!Array.isArray(messages)) return false;
  return messages.some((message) => {
    if (!message || typeof message !== "object") return false;
    const candidate = message as Record<string, unknown>;
    const workId = candidate.recommendedWorkId;
    return candidate.role === "assistant"
      && typeof workId === "string"
      && workId.length > 0
      && workId.length <= 180
      && workId.trim() === workId;
  });
}

function canonicalWorkIds(catalog: CatalogWork[]) {
  return new Set(catalog.flatMap((work) => {
    const id = String(work.id ?? "");
    return id && id.length <= 180 ? [id] : [];
  }));
}

export function normalizeHistoryForCatalog(value: unknown, catalog: CatalogWork[]): ChatHistoryMessage[] {
  return normalizeChatHistory(value, canonicalWorkIds(catalog));
}

/** Restore only the card attached to the latest assistant message, without rerunning selection. */
export function resolveRestoredRecommendation(
  messages: ChatHistoryMessage[],
  catalog: CatalogWork[],
): ChatApiWorkCard | null {
  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const workId = latestAssistant?.recommendedWorkId;
  if (!workId) return null;
  const canonicalWork = catalog.find((work) => String(work.id ?? "") === workId);
  return canonicalWork ? buildChatWorkCard(canonicalWork) : null;
}
