// src/lib/llm-router.ts
//
// 統一LLMインターフェース。用途別にモデル/プロバイダを切り替える。
// - "fast"     : 軽量・雑談（OpenRouter→Groq…）
// - "quality"  : 営業・おすすめ・詩作（OpenRouter主力→Anthropic→Groq…）
// - "local"    : LMStudio（ローカル開発フォールバック）
//
// ★推奨: OpenRouter 1本化★
//   OPENROUTER_API_KEY を .env.local / Vercel に入れるだけで、OpenRouter が全用途の
//   主力になる（quality は GPT-6 Luna、fast は Gemini Flash-Lite）。
//   モデルを変えたい時は OPENROUTER_MODEL_* を1行変えるだけ。キー未設定なら従来どおり
//   Groq / Anthropic / LMStudio にフォールバックする（コードはそのまま）。
//
// 呼び出し側は chat({ purpose, system, messages }) だけ気にすれば良い。

export type LlmRole = "system" | "user" | "assistant";
export type LlmMessage = { role: LlmRole; content: string };
export type LlmPurpose = "fast" | "quality" | "local";

export type LlmCallInput = {
  purpose: LlmPurpose;
  system?: string;
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  /** デバッグ識別用。ログやPostHogで使える。 */
  trace?: string;
};

export type LlmCallResult = {
  ok: boolean;
  text: string;
  provider: "openrouter" | "anthropic" | "groq" | "lmstudio" | "none";
  model: string;
  failureCode?: ProviderFailureCode;
  networkCauseCode?: string;
  networkCauseName?: string;
  /** どのproviderでリトライしたかのトレース。 */
  tried?: string[];
  diagnostics?: ProviderAttemptDiagnostic[];
};

export type ProviderFailureCode =
  | "not_configured" | "http_400" | "http_401" | "http_402" | "http_403"
  | "http_404" | "http_408" | "http_429" | "http_5xx" | "http_other"
  | "timeout" | "network_error" | "empty_response" | "invalid_response" | "unknown_failure";

export type ProviderAttemptDiagnostic = {
  provider: "openrouter" | "anthropic" | "groq" | "lmstudio";
  requestedModel: string | null;
  outcome: "success" | "failure";
  failureCode: ProviderFailureCode | null;
  networkCauseCode?: string;
  networkCauseName?: string;
};

function failed(provider: ProviderAttemptDiagnostic["provider"], model: string, failureCode: ProviderFailureCode): LlmCallResult {
  return { ok: false, text: "", provider, model, failureCode };
}

export function classifyHttpFailure(status: number): ProviderFailureCode {
  if (status >= 500 && status <= 599) return "http_5xx";
  if ([400, 401, 402, 403, 404, 408, 429].includes(status)) return `http_${status}` as ProviderFailureCode;
  return "http_other";
}

export function classifyProviderFailure(error: unknown): ProviderFailureCode {
  if (error instanceof Error && error.name === "LlmProviderTimeout") return "timeout";
  if (error instanceof SyntaxError) return "invalid_response";
  if (error instanceof Error && error.name === "AbortError") return "timeout";
  if (error instanceof TypeError) return "network_error";
  return "unknown_failure";
}

function classifyResponseFailure(error: unknown): ProviderFailureCode {
  if (error instanceof Error && error.name === "LlmProviderEmptyResponse") return "empty_response";
  if (error instanceof Error && error.name === "LlmProviderInvalidResponse") return "invalid_response";
  return classifyProviderFailure(error);
}

const SAFE_NETWORK_CAUSE_CODES = new Set([
  "ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_SOCKET",
  "CERT_HAS_EXPIRED", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "SELF_SIGNED_CERT_IN_CHAIN",
  "ERR_TLS_CERT_ALTNAME_INVALID", "ERR_INVALID_URL",
]);
const SAFE_NETWORK_CAUSE_NAMES = new Set([
  "Error", "TypeError", "SystemError", "ConnectTimeoutError", "HeadersTimeoutError",
  "SocketError", "TLSSocket", "FetchError", "AbortError",
]);

function ownStringField(value: unknown, key: string): string | null {
  if (!value || (typeof value !== "object" && typeof value !== "function")) return null;
  try {
    const field = (value as Record<string, unknown>)[key];
    return typeof field === "string" ? field : null;
  } catch {
    return null;
  }
}

/** Extract only allowlisted transport identifiers. Never reads exception messages or stack. */
export function extractSafeNetworkCause(error: unknown): { networkCauseCode: string; networkCauseName: string } {
  const cause = (() => {
    try { return error && (typeof error === "object" || typeof error === "function")
      ? (error as Record<string, unknown>).cause : undefined; }
    catch { return undefined; }
  })();
  const rawCode = ownStringField(cause, "code");
  const networkCauseCode = rawCode && SAFE_NETWORK_CAUSE_CODES.has(rawCode)
    ? rawCode : "NETWORK_CAUSE_UNKNOWN";
  const rawName = ownStringField(cause, "name") ?? ownStringField(error, "name");
  const networkCauseName = rawName && SAFE_NETWORK_CAUSE_NAMES.has(rawName) ? rawName : "UNKNOWN";
  return { networkCauseCode, networkCauseName };
}

async function readProviderJson(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!body.trim()) throw Object.assign(new Error("empty provider response"), { name: "LlmProviderEmptyResponse" });
  try { return JSON.parse(body); }
  catch { throw Object.assign(new Error("invalid provider response"), { name: "LlmProviderInvalidResponse" }); }
}

function requestedModelFor(provider: ProviderAttemptDiagnostic["provider"], purpose: LlmPurpose): string | null {
  const raw = provider === "openrouter"
    ? purpose === "fast" ? OPENROUTER_MODEL_FAST : OPENROUTER_QUALITY_MODEL
    : provider === "anthropic" ? ANTHROPIC_MODEL
      : provider === "groq" ? GROQ_MODEL : LMSTUDIO_MODEL;
  // Model IDs are ASCII identifiers. Reject URLs, whitespace, and common key prefixes.
  if (!raw || raw.length > 120 || !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(raw) || /^(?:sk-|or-v1-|gsk_|AIza|bearer)/i.test(raw)) return null;
  return raw;
}

function safeTrace(trace: string | undefined): string | null {
  return trace && /^[a-z0-9_-]{1,64}$/i.test(trace) ? trace : null;
}

/* =========================
   プロバイダ設定
   ========================= */

// ── OpenRouter（推奨・主力ゲートウェイ。キー1本で多数のモデルに切替可） ──
// 正確なモデルIDは https://openrouter.ai/models で確認可（変わったらここ or env を直すだけ）。
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY ?? "";
const OPENROUTER_BASE = process.env.OPENROUTER_API_BASE_URL ?? "https://openrouter.ai/api/v1";
export const OPENROUTER_QUALITY_MODEL = process.env.OPENROUTER_MODEL_QUALITY ?? "openai/gpt-6-luna";
export const OPENROUTER_QUALITY_REASONING_EFFORT = "medium" as const;
const OPENROUTER_LUNA_MODEL_ID = "openai/gpt-6-luna";
const OPENROUTER_MODEL_FAST =
  process.env.OPENROUTER_MODEL_FAST ?? "google/gemini-3.1-flash-lite";
// 自動フォールバック（カンマ区切りで上書き可）。現存IDのみ・安価順。
// ※ 2026-06 OpenRouter 一覧で実在を確認済み。存在しないIDを混ぜると無言で品質が落ちるので注意。
const OPENROUTER_FALLBACKS = (
  process.env.OPENROUTER_FALLBACK_MODELS ??
  "deepseek/deepseek-v4-pro,google/gemini-3.1-flash-lite,z-ai/glm-5.2"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function buildOpenRouterRequestHeaders(apiKey: string, referer: string): Record<string, string> {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": referer,
    "X-Title": "Hakusyaku MUSIAM",
  };
}

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

const GROQ_KEY = process.env.GROQ_API_KEY ?? "";
const GROQ_BASE = process.env.GROQ_API_BASE_URL ?? "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile"; // 8B等の小型はenvで上書きしない方が無難

const LMSTUDIO_BASE = process.env.LMSTUDIO_BASE_URL ?? "";
const LMSTUDIO_MODEL = process.env.LMSTUDIO_MODEL ?? "";

/* =========================
   共通ヘルパ
   ========================= */

export function splitSystemAndRest(system: string | undefined, messages: LlmMessage[]) {
  // A separately supplied server-owned system prompt is authoritative.
  // Internal callers that put a system message in the array remain supported
  // when they do not provide that separate prompt.
  const firstSystem = messages.find((m) => m.role === "system");
  return {
    system: system ?? firstSystem?.content ?? "",
    rest: messages.filter((m) => m.role !== "system"),
  };
}

export function buildOpenRouterRequestBody(input: LlmCallInput, primary: string) {
  const isLunaQuality = input.purpose === "quality" && primary === OPENROUTER_LUNA_MODEL_ID;
  const { system, rest } = splitSystemAndRest(input.system, input.messages);
  const models = Array.from(new Set([primary, ...OPENROUTER_FALLBACKS]));
  return {
    model: primary,
    ...(!isLunaQuality ? { models } : {}),
    messages: system ? [{ role: "system" as const, content: system }, ...rest] : rest,
    ...(isLunaQuality
      ? { reasoning: { effort: OPENROUTER_QUALITY_REASONING_EFFORT } }
      : { temperature: input.temperature ?? 0.7 }),
    max_tokens: input.maxTokens ?? 512,
  };
}

export function extractOpenRouterChatResponse(payload: unknown): LlmCallResult {
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { choices?: unknown }).choices)) {
    return failed("openrouter", "", "invalid_response");
  }
  const value = payload as { choices: { message?: { content?: unknown } }[]; model?: unknown };
  const content = value.choices[0]?.message?.content;
  if (content !== undefined && content !== null && typeof content !== "string") return failed("openrouter", "", "invalid_response");
  const text = String(content ?? "").trim();
  if (!text) return failed("openrouter", "", "empty_response");
  // Only upstream metadata is an observation; the requested model is not evidence.
  const model = typeof value?.model === "string" && value.model.trim() ? value.model : "";
  return { ok: true, text, provider: "openrouter", model };
}

/* =========================
   OpenRouter (OpenAI互換・主力ゲートウェイ) 呼び出し
   ========================= */

async function callOpenRouter(
  input: LlmCallInput,
  signal?: AbortSignal
): Promise<LlmCallResult> {
  if (!OPENROUTER_KEY) {
    return {
      ok: false,
      text: "",
      provider: "openrouter",
      model: "",
      failureCode: "not_configured",
    };
  }

  const primary = input.purpose === "fast" ? OPENROUTER_MODEL_FAST : OPENROUTER_QUALITY_MODEL;

  try {
    const r = await fetch(`${OPENROUTER_BASE.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: buildOpenRouterRequestHeaders(
        OPENROUTER_KEY,
        process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.hakusyaku.xyz",
      ),
      body: JSON.stringify(buildOpenRouterRequestBody(input, primary)),
      signal,
    });
    if (!r.ok) {
      return failed("openrouter", primary, classifyHttpFailure(r.status));
    }
    return extractOpenRouterChatResponse(await readProviderJson(r));
  } catch (e) {
    const failureCode = classifyResponseFailure(e);
    return {
      ...failed("openrouter", primary, failureCode),
      ...(failureCode === "network_error" ? extractSafeNetworkCause(e) : {}),
    };
  }
}

/* =========================
   Anthropic (Claude) 呼び出し
   ========================= */

async function callAnthropic(
  input: LlmCallInput,
  signal?: AbortSignal
): Promise<LlmCallResult> {
  if (!ANTHROPIC_KEY) {
    return {
      ok: false,
      text: "",
      provider: "anthropic",
      model: ANTHROPIC_MODEL,
      failureCode: "not_configured",
    };
  }

  const { system, rest } = splitSystemAndRest(input.system, input.messages);

  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: input.maxTokens ?? 512,
    temperature: input.temperature ?? 0.7,
    ...(system ? { system } : {}),
    messages: rest.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
  };

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!r.ok) {
      return failed("anthropic", ANTHROPIC_MODEL, classifyHttpFailure(r.status));
    }
    const j = await readProviderJson(r) as { content?: unknown };
    if (!Array.isArray(j?.content)) return failed("anthropic", ANTHROPIC_MODEL, "invalid_response");
    const text =
      j.content
            .map((c: { type?: string; text?: string }) =>
              c?.type === "text" ? c.text ?? "" : ""
            )
            .join("")
            .trim();
    if (!text) return failed("anthropic", ANTHROPIC_MODEL, "empty_response");
    return { ok: true, text, provider: "anthropic", model: ANTHROPIC_MODEL };
  } catch (e) {
    return failed("anthropic", ANTHROPIC_MODEL, classifyResponseFailure(e));
  }
}

/* =========================
   Groq (OpenAI互換) 呼び出し
   ========================= */

async function callGroq(
  input: LlmCallInput,
  signal?: AbortSignal
): Promise<LlmCallResult> {
  if (!GROQ_KEY) {
    return {
      ok: false,
      text: "",
      provider: "groq",
      model: GROQ_MODEL,
      failureCode: "not_configured",
    };
  }

  const { system, rest } = splitSystemAndRest(input.system, input.messages);
  const messages: LlmMessage[] = system
    ? [{ role: "system", content: system }, ...rest]
    : rest;

  try {
    const r = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: input.temperature ?? 0.7,
        max_tokens: input.maxTokens ?? 512,
      }),
      signal,
    });
    if (!r.ok) {
      return failed("groq", GROQ_MODEL, classifyHttpFailure(r.status));
    }
    const j = await readProviderJson(r) as { choices?: { message?: { content?: unknown } }[] };
    if (!Array.isArray(j?.choices) || typeof j.choices[0]?.message?.content !== "string") return failed("groq", GROQ_MODEL, "invalid_response");
    const text = String(j?.choices?.[0]?.message?.content ?? "").trim();
    if (!text) return failed("groq", GROQ_MODEL, "empty_response");
    return { ok: true, text, provider: "groq", model: GROQ_MODEL };
  } catch (e) {
    return failed("groq", GROQ_MODEL, classifyResponseFailure(e));
  }
}

/* =========================
   LMStudio (OpenAI互換, ローカル) 呼び出し
   ========================= */

async function callLmStudio(
  input: LlmCallInput,
  signal?: AbortSignal
): Promise<LlmCallResult> {
  if (!LMSTUDIO_BASE || !LMSTUDIO_MODEL) {
    return {
      ok: false,
      text: "",
      provider: "lmstudio",
      model: LMSTUDIO_MODEL || "",
      failureCode: "not_configured",
    };
  }

  const { system, rest } = splitSystemAndRest(input.system, input.messages);
  const messages: LlmMessage[] = system
    ? [{ role: "system", content: system }, ...rest]
    : rest;

  try {
    const r = await fetch(`${LMSTUDIO_BASE.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: LMSTUDIO_MODEL,
        messages,
        temperature: input.temperature ?? 0.7,
        max_tokens: input.maxTokens ?? 512,
      }),
      signal,
    });
    if (!r.ok) {
      return failed("lmstudio", LMSTUDIO_MODEL, classifyHttpFailure(r.status));
    }
    const j = await readProviderJson(r) as { choices?: { message?: { content?: unknown } }[] };
    if (!Array.isArray(j?.choices) || typeof j.choices[0]?.message?.content !== "string") return failed("lmstudio", LMSTUDIO_MODEL, "invalid_response");
    const text = String(j?.choices?.[0]?.message?.content ?? "").trim();
    if (!text) return failed("lmstudio", LMSTUDIO_MODEL, "empty_response");
    return { ok: true, text, provider: "lmstudio", model: LMSTUDIO_MODEL };
  } catch (e) {
    return failed("lmstudio", LMSTUDIO_MODEL, classifyResponseFailure(e));
  }
}

/* =========================
   ルーター本体
   ========================= */

type ProviderFn = (input: LlmCallInput, signal?: AbortSignal) => Promise<LlmCallResult>;

class LlmProviderTimeout extends Error {
  constructor() { super("provider request timed out"); this.name = "LlmProviderTimeout"; }
}

/**
 * 用途ごとの優先順。並び順にフォールバックする。
 * OpenRouter は設定があれば常に主力（未設定なら自動でスキップ→従来動作）。
 * - quality : OpenRouter(GPT-6 Luna Medium) → Anthropic → Groq → LMStudio
 * - fast    : OpenRouter(Gemini Flash-Lite) → Groq → Anthropic → LMStudio
 * - local   : LMStudio → OpenRouter → Groq → Anthropic
 */
function providerChainFor(purpose: LlmPurpose): { name: string; fn: ProviderFn }[] {
  const openrouter = { name: "openrouter", fn: callOpenRouter };
  if (purpose === "quality") {
    return [
      openrouter,
      { name: "anthropic", fn: callAnthropic },
      { name: "groq", fn: callGroq },
      { name: "lmstudio", fn: callLmStudio },
    ];
  }
  if (purpose === "local") {
    return [
      { name: "lmstudio", fn: callLmStudio },
      openrouter,
      { name: "groq", fn: callGroq },
      { name: "anthropic", fn: callAnthropic },
    ];
  }
  // fast (default)
  return [
    openrouter,
    { name: "groq", fn: callGroq },
    { name: "anthropic", fn: callAnthropic },
    { name: "lmstudio", fn: callLmStudio },
  ];
}

/** タイムアウト付き呼び出し（既定8秒）。 */
async function withTimeout<T>(p: Promise<T>, ms: number, onAbort: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onAbort();
      reject(new LlmProviderTimeout());
    }, ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 用途別ルーティング付き LLM 呼び出し。
 * 成功したプロバイダの結果を返す。全失敗時は ok:false を返す（例外は投げない）。
 */
export async function chat(input: LlmCallInput): Promise<LlmCallResult> {
  const chain = providerChainFor(input.purpose);
  const tried: string[] = [];
  const diagnostics: ProviderAttemptDiagnostic[] = [];

  for (const { name, fn } of chain) {
    tried.push(name);
    const ac = new AbortController();
    const result = await withTimeout(fn(input, ac.signal), 8000, () => ac.abort()).catch(
      (e: unknown) => failed(name as ProviderAttemptDiagnostic["provider"], "", classifyProviderFailure(e))
    );
    const failureCode = result.failureCode ?? (result.ok ? null : "unknown_failure");
    const requestedModel = requestedModelFor(name as ProviderAttemptDiagnostic["provider"], input.purpose);
    diagnostics.push({ provider: name as ProviderAttemptDiagnostic["provider"], requestedModel,
      outcome: result.ok && result.text ? "success" : "failure",
      failureCode: result.ok && result.text ? null : failureCode ?? "empty_response",
      ...(name === "openrouter" && result.failureCode === "network_error" ? {
        networkCauseCode: result.networkCauseCode ?? "NETWORK_CAUSE_UNKNOWN",
        networkCauseName: result.networkCauseName ?? "UNKNOWN",
      } : {}) });
    if (result.ok && result.text) {
      return { ...result, tried, diagnostics };
    }
  }

  const logAttempts = diagnostics.map(({ provider, requestedModel, outcome, failureCode: code, networkCauseCode, networkCauseName }) => ({
    provider, requestedModel, outcome, failureCode: code,
    ...(provider === "openrouter" && code === "network_error" ? { networkCauseCode, networkCauseName } : {}),
  }));
  console.error("COUNT_CHAT_LLM_ALL_FAILED", {
    ...(safeTrace(input.trace) ? { trace: safeTrace(input.trace) } : {}),
    attemptCount: logAttempts.length,
    attempts: logAttempts,
  });
  return {
    ok: false,
    text: "",
    provider: "none",
    model: "",
    tried,
    diagnostics,
  };
}

/** 外部から現在の設定状況を確認したい時に。 */
export function routerStatus() {
  return {
    openrouter: {
      configured: Boolean(OPENROUTER_KEY),
      model: { quality: OPENROUTER_QUALITY_MODEL, fast: OPENROUTER_MODEL_FAST },
      fallbacks: OPENROUTER_FALLBACKS,
    },
    anthropic: { configured: Boolean(ANTHROPIC_KEY), model: ANTHROPIC_MODEL },
    groq: { configured: Boolean(GROQ_KEY), model: GROQ_MODEL },
    lmstudio: { configured: Boolean(LMSTUDIO_BASE && LMSTUDIO_MODEL), model: LMSTUDIO_MODEL },
  };
}
