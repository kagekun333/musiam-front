"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Role = "user" | "assistant";

type Msg = {
  id: string;
  role: Role;
  text: string;
  ts: number;
};

const SUGGESTIONS = [
  "いまの気分に合う展示を提案して",
  "短時間で売上を作る作戦を3つ",
  "今週の最優先タスクを3つに絞って",
  "詩的で短いSNS投稿文を1本",
  "VR展示の新アイデアを5つ",
];

const BOOT_PROMPT =
  "ようこそ、AI伯爵の間へ。あなたの目的と“今の気分”を一言で教えてください。展示・音楽・本・VR体験から最適な導線を提案します。";

export default function CountABI() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("abi-chat");
      if (raw) return JSON.parse(raw);
    }
    return [
      sysMsg("ここは仮想チャットのプロトタイプです。実運用時はAI APIに接続されます。"),
      assistant(BOOT_PROMPT),
    ];
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("abi-chat", JSON.stringify(msgs));
    }
  }, [msgs]);

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs, loading]);

  const routerAdvice = useMemo(() => {
    const lastUser = [...msgs].reverse().find((m) => m.role === "user")?.text ?? "";
    const t = lastUser.toLowerCase();
    if (match(t, ["占い", "運勢", "ラッキー", "おみくじ"])) return { href: "/oracle", label: "占いへ" };
    if (match(t, ["展示", "ギャラリー", "アート", "作品", "nft"])) return { href: "/gallery", label: "展示へ" };
    if (match(t, ["イベント", "ルーム", "体験", "rooms"])) return { href: "/home-legacy", label: "旧ホーム（導線）" };
    return null;
  }, [msgs]);

  // ←←← ここが「実API呼び出し（ストリーミング）」版 onSend
  async function onSend(text: string) {
    if (!text.trim()) return;
    setMsgs((m) => [...m, user(text)]);
    setInput("");
    setLoading(true);

    const resp = await fetch("/api/abi-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "あなたはMUSIAMのAI執事。短く『要点→次の一手→導線』で答える。" },
          ...msgs.map(({ role, text }) => ({ role, content: text })),
          { role: "user", content: text },
        ],
      }),
    });

    if (!resp.ok || !resp.body) {
      setMsgs((m) => [...m, assistant("（接続エラー：上流APIに到達できませんでした）")]);
      setLoading(false);
      return;
    }

    // 空のアシスタントメッセージを1つ追加して、そこに追記していく
    const id = Math.random().toString(36).slice(2, 10);
    setMsgs((m) => [...m, { id, role: "assistant", text: "", ts: Date.now() }]);

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // OpenAI互換SSE: "data: {json}\n\n"
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      for (const p of parts) {
        if (!p.startsWith("data:")) continue;
        const data = p.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            setMsgs((m) => {
              const last = m[m.length - 1];
              if (last?.id === id) {
                const updated = [...m];
                updated[updated.length - 1] = { ...last, text: last.text + delta };
                return updated;
              }
              return m;
            });
          }
        } catch {
          // JSONでない行は無視
        }
      }
    }

    setLoading(false);
  }

  return (
    <main className="min-h-[100dvh] bg-black text-white">
      <section className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">🤖 AI伯爵（プロト）</h1>
            <p className="text-white/70 text-sm mt-1">
              目的と気分を投げてください。最短ルートを提示します（※現在はGroq APIで応答）。
            </p>
          </div>
          <div className="text-xs text-white/50">
            <Link href="/" className="hover:underline">三つの扉</Link>
            <span className="mx-2">·</span>
            <Link href="/home-legacy" className="hover:underline">旧ホーム</Link>
          </div>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onSend(s)}
              className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 ring-1 ring-white/10">
          <div className="space-y-3">
            {msgs.map((m) => (
              <Bubble key={m.id} role={m.role} text={m.text} />
            ))}
            {loading && <Typing />}
            <div ref={bottomRef} />
          </div>

          {routerAdvice && (
            <div className="mt-4">
              <Link
                href={routerAdvice.href}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-black hover:bg-white/90"
              >
                {routerAdvice.label} →
              </Link>
            </div>
          )}

          <form
            className="mt-4 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              onSend(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例：今日は集中力が低い。30分で進められる案内を"
              className="flex-1 rounded-xl bg-black/40 px-3 py-2 text-sm outline-none ring-1 ring-white/15 focus:ring-white/30"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                !input.trim() || loading
                  ? "bg-white/10 text-white/40 cursor-not-allowed"
                  : "bg-white text-black hover:bg-white/90"
              }`}
            >
              送信
            </button>
          </form>

          <div className="mt-3 flex items-center justify-between text-xs text-white/50">
            <button
              className="hover:underline"
              onClick={() => {
                if (confirm("チャット履歴を消去します。よろしいですか？")) {
                  setMsgs([assistant(BOOT_PROMPT)]);
                }
              }}
            >
              履歴をクリア
            </button>
            <Link href="/oracle" className="hover:underline">
              今日の運勢を占う →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ───────── ユーティリティ ───────── */

function id() {
  return Math.random().toString(36).slice(2, 10);
}
function msg(role: Role, text: string): Msg {
  return { id: id(), role, text, ts: Date.now() };
}
function user(text: string): Msg {
  return msg("user", text);
}
function assistant(text: string): Msg {
  return msg("assistant", text);
}
function sysMsg(text: string): Msg {
  return msg("assistant", `【system】${text}`);
}
function match(text: string, keys: string[]) {
  return keys.some((k) => text.includes(k));
}

/* ───────── UI部品 ───────── */

function Bubble({ role, text }: { role: Role; text: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "bg-white text-black rounded-br-sm"
            : "bg-white/10 text-white rounded-bl-sm border border-white/10"
        }`}
      >
        {text}
      </div>
    </div>
  );
}
function Typing() {
  return (
    <div className="flex items-center gap-2 text-white/70 text-xs">
      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-white/60" />
      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:120ms]" />
      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:240ms]" />
      <span>考え中…</span>
    </div>
  );
}
