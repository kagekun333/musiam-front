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

  async function onSend(text: string) {
    if (!text.trim()) return;
    setMsgs((m) => [...m, user(text)]);
    setInput("");
    setLoading(true);

    await delay(600 + Math.random() * 800);

    const reply = draftAssistantReply(text);
    setMsgs((m) => [...m, assistant(reply)]);
    setLoading(false);
  }

  return (
    <main className="min-h-[100dvh] bg-black text-white">
      <section className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">🤖 AI伯爵（プロト）</h1>
            <p className="text-white/70 text-sm mt-1">
              目的と気分を投げてください。最短ルートを提示します（※現在はローカル推論／ダミー）。
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
              className={ounded-xl px-4 py-2 text-sm font-semibold transition }
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
  return msg("assistant", 【system】);
}
function match(text: string, keys: string[]) {
  return keys.some((k) => text.includes(k));
}
function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
function draftAssistantReply(input: string) {
  const base =
    "了解。要点を3行でまとめ、次の一歩を提示します。実装版ではあなたの履歴・在庫・展示情報と連携します。";
  const tip = (() => {
    const t = input.toLowerCase();
    if (match(t, ["売上", "収益", "販売", "課金"])) {
      return [
        "① 既存作品の“3点セット”を特価で束ねる（今週限定）。",
        "② トップに“1分で買える入口”を常時表示（ABテスト）。",
        "③ SNSは“1投稿＝1商品”で深掘り。CTAを1つに絞る。",
      ];
    }
    if (match(t, ["集中", "30分", "短時間", "やる気"])) {
      return [
        "① 5分で環境整備（通知OFF／机上0／BGM）。",
        "② 20分スプリントで“完成度60%の雛形”を作る。",
        "③ 5分で公開（下書きでもOK）。走りながら磨く。",
      ];
    }
    if (match(t, ["展示", "ギャラリー", "nft", "作品"])) {
      return [
        "① 代表作×9を正方形グリッドで先に出す（最短で世界観）。",
        "② 各カードに“買う／聴く／読む”の3CTAを並置。",
        "③ 週1で入替。入替理由をストーリー化して投稿。",
      ];
    }
    if (match(t, ["vr", "体験", "イベント", "ルーム"])) {
      return [
        "① 体験予約の“空き枠”を常時表示（希少性を演出）。",
        "② 入口で“3つの難易度”を選べるようにする。",
        "③ 参加者の声をカード化してトップに回す。",
      ];
    }
    return [
      "① 目的を1つに絞る（売上／作品公開／フォロー獲得）。",
      "② 60分で到達する“完了定義”を文で書く。",
      "③ 5分で最初のアウトプットを出し、動線に流す。",
    ];
  })();

  return [
    "🧭 解析",
    "・" + summarize(input),
    "",
    "✅ 次の一歩",
    ...tip.map((t) => "・" + t),
    "",
    "➡️ 関連：/oracle（占い） /gallery（展示） /home-legacy（導線）",
    "",
    ※ ,
  ].join("\n");
}
function summarize(text: string) {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= 40) return t;
  return t.slice(0, 38) + "…";
}

/* ───────── UI部品 ───────── */

function Bubble({ role, text }: { role: Role; text: string }) {
  const isUser = role === "user";
  return (
    <div className={lex }>
      <div
        className={max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed }
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
