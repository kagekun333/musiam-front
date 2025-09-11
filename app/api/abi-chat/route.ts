import { NextRequest } from "next/server";
import { PostHog } from "posthog-node";           // ← named import
import { randomUUID } from "crypto";

export const runtime = "nodejs";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };
type Provider = "groq" | "openai" | "auto";

/** 余計な < > " 空白 を除去（コピペ事故対策） */
const clean = (s = "") => (s || "").replace(/^[\s"'<>]+|[\s"'<>]+$/g, "");

/** プロバイダ別の設定 */
function getConfig(provider: Exclude<Provider, "auto">) {
  if (provider === "groq") {
    return {
      key: clean(process.env.GROQ_API_KEY),
      baseUrl: (process.env.GROQ_API_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, ""),
      model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      name: "groq" as const,
    };
  }
  return {
    key: clean(
      process.env.MUSIAM_OPENAI_API_KEY ||  // 任意：独自キー名があれば優先
      process.env.OPENAI_API_KEY || ""
    ),
    baseUrl: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, ""),
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    name: "openai" as const,
  };
}

/** ---------- PostHog: シングルトン（HMRでも再利用） ---------- */
// @ts-expect-error - キャッシュ領域を生やす
globalThis.__PH__ = globalThis.__PH__ ?? null as unknown;
let ph: PostHog | null = (globalThis as any).__PH__;
if (!ph && process.env.POSTHOG_API_KEY) {
  ph = new PostHog(process.env.POSTHOG_API_KEY, {
    host: process.env.POSTHOG_HOST || "https://eu.posthog.com",
  });
  (globalThis as any).__PH__ = ph;
}
function captureServer(event: string, props: Record<string, any>) {
  if (!ph) return;
  try {
    ph.capture({ distinctId: "server", event, properties: props });
  } catch {}
}

/** ========== GET: ping 診断 ========== */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (url.searchParams.get("ping") === "1") {
    const provider = (url.searchParams.get("provider") as Provider) || "groq";
    const p = provider === "auto" ? "groq" : provider;
    const cfg = getConfig(p as Exclude<Provider, "auto">);
    const raw =
      p === "openai"
        ? clean(process.env.MUSIAM_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "")
        : clean(process.env.GROQ_API_KEY || "");

    return new Response(
      JSON.stringify(
        {
          provider: p,
          baseUrl: cfg.baseUrl,
          model: cfg.model,
          keyLen: raw.length,
          keyHead: raw.slice(0, 4),   // "gsk_" or "sk-"
        },
        null,
        2
      ),
      { headers: { "Content-Type": "application/json" } }
    );
  }
  return new Response("Missing ping=1", { status: 400 });
}

/** ========== POST: チャット本体（計測・フォールバック・nostream対応） ========== */
export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const traceId = randomUUID();

  let requested: Provider = "auto";
  let primary: Exclude<Provider, "auto"> = "groq";
  let fallback: Exclude<Provider, "auto"> | null = null;
  let usedProvider: string | null = null;
  let status = 0;
  let code: string | null = null;
  let stream = true;
  let modelFromClient: string | undefined;

  try {
    const url = new URL(req.url);
    const noStream = url.searchParams.get("nostream") === "1";
    stream = !noStream;

    const { messages, model, provider } = (await req.json()) as {
      messages: ChatMsg[];
      model?: string;
      provider?: Provider;
    };
    modelFromClient = model;

    if (!Array.isArray(messages) || messages.length === 0) {
      status = 400;
      return new Response("Bad Request", { status });
    }

    requested = provider || "auto";
    primary = requested === "auto" ? "groq" : (requested as Exclude<Provider, "auto">);
    fallback = primary === "openai" ? "groq" : null;

    // 1st try
    const res1 = await callUpstream(primary, model, messages, stream);
    status = res1.status;

    if (res1.ok && res1.body) {
      usedProvider = primary.toUpperCase();
      captureServer("chat_request_server", {
        trace_id: traceId,
        ok: true,
        status,
        code: null,
        provider_selected: requested,
        provider_used: usedProvider,
        fallback_from: null,
        stream,
        model_client: modelFromClient || null,
        duration_ms: Date.now() - t0,
      });
      return buildResponse(res1, primary, stream, {
        "X-Provider": usedProvider,
        "X-Trace-Id": traceId,
      });
    }

    const { shouldFallback, debug, errorCode } = await analyzeFailure(res1, primary);
    code = errorCode || null;

    if (shouldFallback && fallback) {
      const res2 = await callUpstream(fallback, model, messages, stream);
      status = res2.status;

      if (res2.ok && res2.body) {
        usedProvider = fallback.toUpperCase();
        captureServer("chat_request_server", {
          trace_id: traceId,
          ok: true,
          status,
          code: null,
          provider_selected: requested,
          provider_used: usedProvider,
          fallback_from: primary.toUpperCase(),
          stream,
          model_client: modelFromClient || null,
          duration_ms: Date.now() - t0,
        });
        return buildResponse(res2, fallback, stream, {
          "X-Provider": usedProvider,
          "X-Fallback": primary.toUpperCase(),
          "X-Trace-Id": traceId,
        });
      }

      const txt2 = await safeText(res2);
      captureServer("chat_request_server", {
        trace_id: traceId,
        ok: false,
        status: res2.status,
        code: extractCode(txt2),
        provider_selected: requested,
        provider_used: fallback.toUpperCase(),
        fallback_from: primary.toUpperCase(),
        stream,
        model_client: modelFromClient || null,
        duration_ms: Date.now() - t0,
        error: truncate(txt2),
      });
      return new Response(
        `Upstream error (fallback ${fallback} failed): ${res2.status} ${res2.statusText}\n${txt2}`,
        {
          status: 500,
          headers: {
            "X-Provider": fallback.toUpperCase(),
            "X-Fallback": primary.toUpperCase(),
            "X-Trace-Id": traceId,
          },
        }
      );
    }

    const txt1 = await safeText(res1);
    captureServer("chat_request_server", {
      trace_id: traceId,
      ok: false,
      status: res1.status,
      code: extractCode(txt1) || code,
      provider_selected: requested,
      provider_used: primary.toUpperCase(),
      fallback_from: null,
      stream,
      model_client: modelFromClient || null,
      duration_ms: Date.now() - t0,
      error: truncate(txt1),
      debug,
    });
    return new Response(
      `Upstream error: ${res1.status} ${res1.statusText}\n${txt1}\n${debug}`,
      { status: 500, headers: { "X-Provider": primary.toUpperCase(), "X-Trace-Id": traceId } }
    );
  } catch (err: any) {
    captureServer("chat_request_server", {
      trace_id: traceId,
      ok: false,
      status: status || 500,
      code: code || null,
      provider_selected: requested,
      provider_used: usedProvider || null,
      fallback_from: null,
      stream,
      model_client: modelFromClient || null,
      duration_ms: Date.now() - t0,
      error: String(err?.message || err),
    });
    return new Response(`Internal error: ${err?.message || err}`, {
      status: 500,
      headers: { "X-Trace-Id": traceId },
    });
  }
}

/** ------------- helpers ------------- */
async function callUpstream(
  provider: Exclude<Provider, "auto">,
  model: string | undefined,
  messages: ChatMsg[],
  stream: boolean
) {
  const cfg = getConfig(provider);
  const useModel = model || cfg.model;

  if (!cfg.key) {
    return new Response(`Server config error: ${cfg.name.toUpperCase()}_API_KEY is empty.`, { status: 500 });
  }

  return fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.key}`,
    },
    body: JSON.stringify({ model: useModel, messages, stream, temperature: 0.7 }),
  });
}

async function analyzeFailure(res: Response, provider: Exclude<Provider, "auto">) {
  const status = res.status;
  const txt = await safeText(res);
  let code = extractCode(txt);

  const isOpenAI = provider === "openai";
  const quotaLike = status === 429 || code === "insufficient_quota";
  const authLike = status === 401 || code === "invalid_api_key";

  const shouldFallback = isOpenAI && (quotaLike || authLike);
  const debug = `status=${status} code=${code || ""} provider=${provider}`;

  return { shouldFallback, debug, errorCode: code };
}

async function safeText(res: Response) {
  try { return await res.text(); } catch { return ""; }
}
function extractCode(txt: string | null | undefined): string | null {
  if (!txt) return null;
  try { return JSON.parse(txt)?.error?.code || null; } catch { return null; }
}
function truncate(s: string, n = 800) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n) + " …(trunc)" : s;
}

function buildResponse(
  res: Response,
  provider: Exclude<Provider, "auto">,
  isStream: boolean,
  extraHeaders: Record<string, string> = {}
) {
  if (!isStream) {
    return new Response(res.body, {
      status: res.status,
      headers: { "Content-Type": "application/json", "X-Provider": provider.toUpperCase(), ...extraHeaders },
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      const reader = res.body!.getReader();
      (async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (e) {
          controller.error(e);
          return;
        }
        controller.close();
      })();
    },
  });

  return new Response(stream, {
    status: res.status,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Provider": provider.toUpperCase(),
      ...extraHeaders,
    },
  });
}
