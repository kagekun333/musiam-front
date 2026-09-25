import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import {
  CHAT_HISTORY_MAX_MESSAGES,
  deleteChatHistory,
  readChatHistory,
  writeChatHistory,
} from "@/lib/chat-history.server";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import {
  hasAssistantRecommendedWorkId,
  normalizeHistoryForCatalog,
  resolveRestoredRecommendation,
} from "@/lib/chat-history-recommendation";
import { gcExpired, ipFromRequest, rateLimit } from "@/lib/rate";

const ConversationIdSchema = z.string().uuid();
// 40 messages × 2,000 UTF-8 characters can approach 240 KB before JSON overhead.
export const config = { api: { bodyParser: { sizeLimit: "512kb" } } };
const WriteSchema = z.object({
  conversationId: ConversationIdSchema,
  lang: z.string().min(2).max(10),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(2000),
    persona: z.enum(["count", "duke"]).optional(),
    recommendedWorkId: z.unknown().optional(),
  })).max(CHAT_HISTORY_MAX_MESSAGES),
});

async function currentCatalog() {
  try { return await loadMergedWorksServer(); } catch { return []; }
}

export function logChatHistoryFailure(operation: string) {
  console.error("chat_history_failed", { operation, category: "storage_unavailable" });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  const ip = ipFromRequest(req);
  const rate = rateLimit(`chat-history:${ip}`, 60, 60_000);
  if (Math.random() < 0.02) gcExpired(60_000);
  if (!rate.ok) {
    res.setHeader("Retry-After", String(Math.ceil(rate.retryAfter / 1000)));
    return res.status(429).json({ ok: false, error: "rate_limited" });
  }

  let operation = "UNSUPPORTED";
  try {
    if (req.method === "GET") {
      operation = "GET";
      const parsed = ConversationIdSchema.safeParse(req.query.conversationId);
      if (!parsed.success) return res.status(400).json({ ok: false, error: "invalid_conversation_id" });
      const stored = await readChatHistory(parsed.data);
      if (!stored) return res.status(200).json({ ok: true, history: null, restoredRecommendation: null });

      const catalog = hasAssistantRecommendedWorkId(stored.messages) ? await currentCatalog() : [];
      const messages = normalizeHistoryForCatalog(stored.messages, catalog);
      const restoredRecommendation = resolveRestoredRecommendation(messages, catalog);
      const history = {
        version: stored.version,
        conversationId: stored.conversationId,
        lang: stored.lang,
        messages,
        createdAt: stored.createdAt,
        updatedAt: stored.updatedAt,
        expiresAt: stored.expiresAt,
      };
      return res.status(200).json({ ok: true, history, restoredRecommendation });
    }

    if (req.method === "PUT") {
      operation = "PUT";
      const parsed = WriteSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ ok: false, error: "invalid_body" });
      const catalog = hasAssistantRecommendedWorkId(parsed.data.messages) ? await currentCatalog() : [];
      const messages = normalizeHistoryForCatalog(parsed.data.messages, catalog);
      const history = await writeChatHistory({ ...parsed.data, messages });
      return res.status(200).json({ ok: true, updatedAt: history.updatedAt, expiresAt: history.expiresAt });
    }

    if (req.method === "DELETE") {
      operation = "DELETE";
      const parsed = ConversationIdSchema.safeParse(req.query.conversationId ?? req.body?.conversationId);
      if (!parsed.success) return res.status(400).json({ ok: false, error: "invalid_conversation_id" });
      await deleteChatHistory(parsed.data);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  } catch {
    logChatHistoryFailure(operation);
    return res.status(503).json({ ok: false, error: "history_unavailable" });
  }
}
