import { Redis } from "@upstash/redis";

export type StoredChatMessage = {
  role: "user" | "assistant";
  content: string;
  persona?: "count" | "duke";
  /** Stable Catalog identity only; presentation fields are rebuilt when history is read. */
  recommendedWorkId?: string;
};

export type StoredChatHistory = {
  version: 1;
  conversationId: string;
  lang: string;
  messages: StoredChatMessage[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
};

export const CHAT_HISTORY_TTL_SECONDS = 60 * 60 * 24 * 90;
export const CHAT_HISTORY_MAX_MESSAGES = 40;

let redis: Redis | null = null;

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error("Upstash Redis is not configured");
  if (!redis) redis = new Redis({ url, token });
  return redis;
}

function key(conversationId: string) {
  return `chat-history:v1:${conversationId}`;
}

export async function readChatHistory(conversationId: string) {
  return getRedis().get<StoredChatHistory>(key(conversationId));
}

export async function writeChatHistory(input: {
  conversationId: string;
  lang: string;
  messages: StoredChatMessage[];
}) {
  const existing = await readChatHistory(input.conversationId);
  const now = new Date();
  const record: StoredChatHistory = {
    version: 1,
    conversationId: input.conversationId,
    lang: input.lang,
    messages: input.messages.slice(-CHAT_HISTORY_MAX_MESSAGES),
    createdAt: existing?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + CHAT_HISTORY_TTL_SECONDS * 1000).toISOString(),
  };
  await getRedis().set(key(input.conversationId), record, { ex: CHAT_HISTORY_TTL_SECONDS });
  return record;
}

export async function deleteChatHistory(conversationId: string) {
  await getRedis().del(key(conversationId));
}
