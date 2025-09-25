// lib/groq.ts
import { fetchWithRetry } from "./net";
import { stripFences } from "./json";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";
const MAX_TOKENS = Number(process.env.GROQ_MAX_TOKENS ?? 800);

type GroqMsg = { role: "system" | "user" | "assistant"; content: string };
type GroqOpts = {
  model?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
};

/**
 * fetch ベースの Groq Chat ラッパー。
 * 既定を「安定寄り(temperature=0, top_p=1)」に固定。
 * 既存呼び出し互換、必要なら第2引数で上書き可。
 */
export async function groqChat(
  messages: GroqMsg[],
  opts: GroqOpts = {}
): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY");
  }

  const body = {
    model: opts.model ?? MODEL,
    temperature: opts.temperature ?? 0,
    top_p: opts.top_p ?? 1,
    max_tokens: opts.max_tokens ?? MAX_TOKENS,
    stream: false,
    messages,
  };

  const r = await fetchWithRetry(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`Groq HTTP ${r.status}: ${text || r.statusText}`);
  }

  const j = await r.json().catch((e: any) => {
    throw new Error(`Groq JSON parse failed: ${e?.message || String(e)}`);
  });

  if (j?.error) {
    const msg = j?.error?.message || j?.error?.type || "Unknown Groq error";
    throw new Error(`Groq API error: ${msg}`);
  }

  const text: string = j?.choices?.[0]?.message?.content ?? "";
  return stripFences(text ?? "");
}
