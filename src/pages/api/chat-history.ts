import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import {
  CHAT_HISTORY_MAX_MESSAGES,
  deleteChatHistory,
  readChatHistory,
  writeChatHistory,
} from "@/lib/chat-history.server";
import { gcExpired, ipFromRequest, rateLimit } from "@/lib/rate";

const ConversationIdSchema = z.string().uuid();
const WriteSchema = z.object({
  conversationId: ConversationIdSchema,
  lang: z.string().min(2).max(10),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(2000),
    persona: z.enum(["count", "duke"]).optional(),
  })).max(CHAT_HISTORY_MAX_MESSAGES),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  const ip = ipFromRequest(req);
  const rate = rateLimit(`chat-history:${ip}`, 60, 60_000);
  if (Math.random() < 0.02) gcExpired(60_000);
  if (!rate.ok) {
    res.setHeader("Retry-After", String(Math.ceil(rate.retryAfter / 1000)));
    return res.status(429).json({ ok: false, error: "rate_limited" });
  }

  try {
    if (req.method === "GET") {
      const parsed = ConversationIdSchema.safeParse(req.query.conversationId);
      if (!parsed.success) return res.status(400).json({ ok: false, error: "invalid_conversation_id" });
      const history = await readChatHistory(parsed.data);
      return res.status(200).json({ ok: true, history: history ?? null });
    }

    if (req.method === "PUT") {
      const parsed = WriteSchema.safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ ok: false, error: "invalid_body" });
      const history = await writeChatHistory(parsed.data);
      return res.status(200).json({ ok: true, updatedAt: history.updatedAt, expiresAt: history.expiresAt });
    }

    if (req.method === "DELETE") {
      const parsed = ConversationIdSchema.safeParse(req.query.conversationId ?? req.body?.conversationId);
      if (!parsed.success) return res.status(400).json({ ok: false, error: "invalid_conversation_id" });
      await deleteChatHistory(parsed.data);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, PUT, DELETE");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  } catch (error) {
    console.error("chat_history_failed", error);
    return res.status(503).json({ ok: false, error: "history_unavailable" });
  }
}
