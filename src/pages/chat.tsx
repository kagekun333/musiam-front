// src/pages/chat.tsx
import React, { useState } from "react";

/** ===== 型（このページ内で完結） ===== */
type ChatRole = "user" | "assistant";
type ChatMsg = { role: ChatRole; content: string };

type LinkKind = "detail" | "spotify" | "amazon" | string;
type RecoLink = { kind: LinkKind; url: string };
type RecoCard = {
  id: string;
  title: string;
  cover: string;
  links: RecoLink[];
  moodTags: string[];
  type?: string;
};

/** ===== PostHog（無ければ無視） ===== */
function capture(event: string, props?: Record<string, unknown>) {
  if (typeof window !== "undefined" && (window as any).posthog) {
    (window as any).posthog.capture(event, props || {});
  }
}

/** ===== UIヘルパ ===== */
function linkLabel(kind: LinkKind) {
  switch (kind) {
    case "detail":
      return "作品詳細";
    case "spotify":
      return "Spotifyで聴く";
    case "amazon":
      return "Amazonで見る";
    default:
      return "リンク";
  }
}

export default function ChatPage() {
  // ✅ 初回の自動メッセージは入れない（空で開始）
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [cards, setCards] = useState<RecoCard[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ 送信ロジック：チップ即送信にも対応するため textOverride を受けられるように
  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;

    const nextMsgs: ChatMsg[] = [...messages, { role: "user", content: text }];
    const userTurns = nextMsgs.filter((m) => m.role === "user").length;

    setMessages(nextMsgs);
    setInput("");
    setError(null);
    setSending(true);
    capture("chat_send", { len: text.length });

    try {
      const resp = await fetch("/api/chat-reco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: userTurns >= 3 ? "both" : "chat",
          messages: nextMsgs,
        }),
      });

      const res = await resp.json();

      const mode = res?.mode ?? "chat";
      const assistantText = String(res?.assistantText ?? res?.text ?? "").trim();
      const moodTags: string[] = Array.isArray(res?.moodTags) ? res.moodTags : [];
      const gotCards: RecoCard[] = Array.isArray(res?.cards) ? res.cards : [];

      if (assistantText) {
        setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
        capture("chat_reply", { mode, hasCards: gotCards.length > 0, moodTags });
      }
      setCards(gotCards);

      if (gotCards.length) {
        capture("reco_show", { count: gotCards.length, moodTags });
      }
    } catch (e: any) {
      setError(e?.message || "通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      send();
    }
  }

  const userTurnsForRender = messages.filter((m) => m.role === "user").length;

  // ✅ 初回のみ表示するスターターチップ
  const starters = ["Hello", "こんにちは"];

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>伯爵の門</h1>

      <div style={{ border: "1px solid #333", borderRadius: 8, padding: 12, minHeight: 240 }}>
        {messages.length === 0 ? (
          // 会話が始まっていないときは履歴エリアは空のまま
          <div style={{ color: "#888" }} />
        ) : (
          messages.map((m, i) => (
            <div key={i} style={{ margin: "8px 0" }}>
              <strong>{m.role === "user" ? "You" : "伯爵"}</strong>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
            </div>
          ))
        )}
      </div>

      {/* ✅ 初回だけチップ表示（Hello / こんにちは） */}
      {userTurnsForRender === 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {starters.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                background: "#f1f1f1",
                border: "1px solid #ddd",
                cursor: "pointer",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="今日はどんな気分？ / How do you feel today?"
          style={{ flex: 1, padding: 10, borderRadius: 6, border: "1px solid #666" }}
          disabled={sending}
          aria-disabled={sending}
        />
        <button
          onClick={() => send()}
          disabled={sending}
          aria-disabled={sending}
          style={{ padding: "10px 16px", borderRadius: 6, opacity: sending ? 0.7 : 1 }}
        >
          {sending ? "送信中…" : "送信"}
        </button>
      </div>

      {error && (
        <div style={{ color: "#f55", marginTop: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      {userTurnsForRender >= 3 && !!cards.length && (
        <>
          <h2 style={{ marginTop: 24, fontSize: 18, fontWeight: 700 }}>おすすめ</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {cards.slice(0, 3).map((c) => (
              <article
                key={c.id}
                style={{
                  border: "1px solid #333",
                  borderRadius: 8,
                  padding: 10,
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                {c.cover && (
                  <div style={{ aspectRatio: "1/1", overflow: "hidden", borderRadius: 6, marginBottom: 8 }}>
                    <img
                      src={c.cover}
                      alt={c.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                )}
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{c.title}</div>
                {c.type && <div style={{ opacity: 0.8, fontSize: 12 }}>{c.type}</div>}

                {Array.isArray(c.moodTags) && c.moodTags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {c.moodTags.slice(0, 6).map((t) => (
                      <span
                        key={t}
                        style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#222", color: "#fff" }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {Array.isArray(c.links) && c.links.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {c.links.map((l) => (
                      <a
                        key={l.url}
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => capture("reco_click", { id: c.id, kind: l.kind })}
                        style={{
                          fontSize: 13,
                          padding: "6px 10px",
                          borderRadius: 6,
                          background: "#2e7d32",
                          color: "white",
                          textDecoration: "none",
                        }}
                      >
                        {linkLabel(l.kind)}
                      </a>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
