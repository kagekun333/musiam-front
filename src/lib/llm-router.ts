// src/lib/llm-router.ts
//
// 統一LLMインターフェース。用途別にモデル/プロバイダを切り替える。
// - "fast"     : Groq Llama 3.3 70B（雑談・軽量用途）
// - "quality"  : Anthropic Claude Haiku 4.5（営業・おすすめ・詩作）
// - "local"    : LMStudio（ローカル開発フォールバック）
//
// 呼び出し側は chat({ purpose, system, messages }) だけ気にすれば良い。
// キー未設定時は自動で他のプロバイダにフォールバックする。

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
  provider: "anthropic" | "groq" | "lmstudio" | "none";
  model: string;
  /** 失敗時のエラー詳細（非致命的）。UIには出さない。 */
  error?: string;
  /** どのproviderでリトライしたかのトレース。 */
  tried?: string[];
};

/* =========================
   プロバイダ設定
   ========================= */

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

const GROQ_KEY = process.env.GROQ_API_KEY ?? "";
const GROQ_BASE = process.env.GROQ_API_BASE_URL ?? "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

const LMSTUDIO_BASE = process.env.LMSTUDIO_BASE_URL ?? "";
const LMSTUDIO_MODEL = process.env.LMSTUDIO_MODEL ?? "";

/* =========================
   共通ヘルパ
   ========================= */

function splitSystemAndRest(system: string | undefined, messages: LlmMessage[]) {
  // messages の先頭にすでに system が入っていたら尊重。重複を防ぐ。
  const hasSystemInMessages = messages.some((m) => m.role === "system");
  if (hasSystemInMessages) {
    const first = messages.find((m) => m.role === "system");
    return {
      system: first?.content ?? system ?? "",
      rest: messages.filter((m) => m.role !== "system"),
    };
  }
  return { system: system ?? "", rest: messages };
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
      error: "ANTHROPIC_API_KEY not set",
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
      const errText = await r.text().catch(() => "");
      return {
        ok: false,
        text: "",
        provider: "anthropic",
        model: ANTHROPIC_MODEL,
        error: `HTTP ${r.status}: ${errText.slice(0, 240)}`,
      };
    }
    const j = await r.json();
    const text =
      Array.isArray(j?.content)
        ? j.content
            .map((c: { type?: string; text?: string }) =>
              c?.type === "text" ? c.text ?? "" : ""
            )
            .join("")
            .trim()
        : "";
    return { ok: Boolean(text), text, provider: "anthropic", model: ANTHROPIC_MODEL };
  } catch (e) {
    const err = e as Error;
    return {
      ok: false,
      text: "",
      provider: "anthropic",
      model: ANTHROPIC_MODEL,
      error: err?.message ?? "anthropic call failed",
    };
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
      error: "GROQ_API_KEY not set",
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
      const errText = await r.text().catch(() => "");
      return {
        ok: false,
        text: "",
        provider: "groq",
        model: GROQ_MODEL,
        error: `HTTP ${r.status}: ${errText.slice(0, 240)}`,
      };
    }
    const j = await r.json();
    const text = String(j?.choices?.[0]?.message?.content ?? "").trim();
    return { ok: Boolean(text), text, provider: "groq", model: GROQ_MODEL };
  } catch (e) {
    const err = e as Error;
    return {
      ok: false,
      text: "",
      provider: "groq",
      model: GROQ_MODEL,
      error: err?.message ?? "groq call failed",
    };
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
      error: "LMSTUDIO_BASE_URL or LMSTUDIO_MODEL not set",
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
      const errText = await r.text().catch(() => "");
      return {
        ok: false,
        text: "",
        provider: "lmstudio",
        model: LMSTUDIO_MODEL,
        error: `HTTP ${r.status}: ${errText.slice(0, 240)}`,
      };
    }
    const j = await r.json();
    const text = String(j?.choices?.[0]?.message?.content ?? "").trim();
    return { ok: Boolean(text), text, provider: "lmstudio", model: LMSTUDIO_MODEL };
  } catch (e) {
    const err = e as Error;
    return {
      ok: false,
      text: "",
      provider: "lmstudio",
      model: LMSTUDIO_MODEL,
      error: err?.message ?? "lmstudio call failed",
    };
  }
}

/* =========================
   ルーター本体
   ========================= */

type ProviderFn = (input: LlmCallInput, signal?: AbortSignal) => Promise<LlmCallResult>;

/**
 * 用途ごとの優先順。並び順にフォールバックする。
 * - quality : Haiku (Anthropic) → Groq → LMStudio
 * - fast    : Groq → Haiku → LMStudio
 * - local   : LMStudio → Groq → Haiku
 */
function providerChainFor(purpose: LlmPurpose): { name: string; fn: ProviderFn }[] {
  if (purpose === "quality") {
    return [
      { name: "anthropic", fn: callAnthropic },
      { name: "groq", fn: callGroq },
      { name: "lmstudio", fn: callLmStudio },
    ];
  }
  if (purpose === "local") {
    return [
      { name: "lmstudio", fn: callLmStudio },
      { name: "groq", fn: callGroq },
      { name: "anthropic", fn: callAnthropic },
    ];
  }
  // fast (default)
  return [
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
      reject(new Error(`llm-router: timeout after ${ms}ms`));
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
  let lastError: string | undefined;

  for (const { name, fn } of chain) {
    tried.push(name);
    const ac = new AbortController();
    const result = await withTimeout(fn(input, ac.signal), 8000, () => ac.abort()).catch(
      (e: unknown) => {
        const err = e as Error;
        return {
          ok: false,
          text: "",
          provider: name as LlmCallResult["provider"],
          model: "",
          error: err?.message ?? "timeout",
        } satisfies LlmCallResult;
      }
    );
    if (result.ok && result.text) {
      return { ...result, tried };
    }
    lastError = result.error ?? lastError;
  }

  return {
    ok: false,
    text: "",
    provider: "none",
    model: "",
    error: lastError ?? "all providers failed",
    tried,
  };
}

/** 外部から現在の設定状況を確認したい時に。 */
export function routerStatus() {
  return {
    anthropic: { configured: Boolean(ANTHROPIC_KEY), model: ANTHROPIC_MODEL },
    groq: { configured: Boolean(GROQ_KEY), model: GROQ_MODEL },
    lmstudio: { configured: Boolean(LMSTUDIO_BASE && LMSTUDIO_MODEL), model: LMSTUDIO_MODEL },
  };
}
