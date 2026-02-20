// src/pages/chat.tsx
import React, { useState, useEffect, useRef } from "react";

/** ===== 型（このページ内で完結） ===== */
type ChatRole = "user" | "assistant";
type ChatMsg = { role: ChatRole; content: string };
type ChatMode = "recommend" | "chat" | "sales";

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
/** URLパターンからサービス名を含むラベルを返す（オラクルゲートと同じアプローチ） */
function linkLabel(kind: string, url?: string) {
  const u = url ?? "";

  // まず kind が明示的なサービス名の場合（既存互換）
  switch (kind) {
    case "detail":
      return "詳細を見る";
    case "itunesBuy":
      return "iTunesで購入";
    case "appleMusic":
      return "Apple Musicで聴く";
    case "spotify":
      return "Spotifyで聴く";
    case "amazon":
      return "Amazonで購入";
  }

  // kind が汎用的（buy/listen/read/open）の場合、URLからサービスを推定
  if (kind === "buy") {
    if (/amazon\.co\.jp|amazon\.com/i.test(u)) return "Amazonで購入";
    if (/itunes\.apple\.com/i.test(u)) return "iTunesで購入";
    if (/music\.apple\.com/i.test(u)) return "Apple Musicで購入";
    return "購入";
  }
  if (kind === "listen") {
    if (/open\.spotify\.com|spotify:/i.test(u)) return "Spotifyで聴く";
    if (/music\.apple\.com/i.test(u)) return "Apple Musicで聴く";
    if (/itunes\.apple\.com/i.test(u)) return "iTunesで聴く";
    if (/youtube\.com|youtu\.be/i.test(u)) return "YouTubeで観る";
    return "聴く";
  }
  if (kind === "read") {
    if (/amazon\.co\.jp|amazon\.com/i.test(u)) return "Amazonで読む";
    return "読む";
  }
  if (kind === "open") {
    if (/open\.spotify\.com|spotify:/i.test(u)) return "Spotifyで聴く";
    if (/music\.apple\.com/i.test(u)) return "Apple Musicで聴く";
    if (/itunes\.apple\.com/i.test(u)) return "iTunesで聴く";
    if (/youtube\.com|youtu\.be/i.test(u)) return "YouTubeで観る";
    if (/amazon\.co\.jp|amazon\.com/i.test(u)) return "Amazonで見る";
    return "見る";
  }

  // フォールバック：URLだけでも推定を試みる
  if (/open\.spotify\.com|spotify:/i.test(u)) return "Spotifyで聴く";
  if (/music\.apple\.com/i.test(u)) return "Apple Musicで聴く";
  if (/itunes\.apple\.com/i.test(u)) return "iTunesで購入";
  if (/youtube\.com|youtu\.be/i.test(u)) return "YouTubeで観る";
  if (/amazon\.co\.jp|amazon\.com/i.test(u)) return "Amazonで見る";

  return "見る";
}

/** ===== プラットフォーム別CTAカラー ===== */
function linkBg(kind: string, url?: string): { bg: string; fg: string } {
  const u = url ?? "";
  if (kind === "spotify" || /open\.spotify\.com|spotify:/i.test(u))
    return { bg: "#1ed760", fg: "#000" };
  if (kind === "amazon" || /amazon\.co\.jp|amazon\.com/i.test(u))
    return { bg: "#ff9900", fg: "#000" };
  if (kind === "appleMusic" || /music\.apple\.com/i.test(u))
    return { bg: "#fc3c44", fg: "#fff" };
  if (kind === "itunesBuy" || /itunes\.apple\.com/i.test(u))
    return { bg: "#a259ff", fg: "#fff" };
  if (/youtube\.com|youtu\.be/i.test(u))
    return { bg: "#ff0000", fg: "#fff" };
  return { bg: "#2e7d32", fg: "#fff" };
}

/** ===== モード定義（lang別ラベル） ===== */
const MODE_DEFS: Array<{ mode: "recommend" | "chat" | "sales"; ja: string; en: string }> = [
  { mode: "recommend", ja: "作品のおすすめ", en: "Recommend" },
  { mode: "chat",      ja: "雑談する",      en: "Just chat" },
  { mode: "sales",     ja: "営業マンを呼ぶ", en: "Call sales" },
];

export default function ChatPage() {
  // ✅ 初回の自動メッセージは入れない（空で開始）
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [cards, setCards] = useState<RecoCard[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<ChatMode | null>(null);
  const [selectedLang, setSelectedLang] = useState<"ja" | "en" | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // ✅ 返信受信後（sending が false になったとき）に自動フォーカス
  useEffect(() => {
    if (!sending) {
      inputRef.current?.focus();
    }
  }, [sending]);

  // ✅ localStorage復元（セッション復元）
  useEffect(() => {
    try {
      const saved = localStorage.getItem("musiam_chat_mode");
      if (saved && ["recommend", "chat", "sales"].includes(saved)) {
        setSelectedMode(saved as ChatMode);
      }
      const savedLang = localStorage.getItem("musiam_chat_lang");
      if (savedLang && ["ja", "en"].includes(savedLang)) {
        setSelectedLang(savedLang as "ja" | "en");
      }
    } catch {
      // ignore
    }
  }, []);

  // ✅ 6択ボタンクリック：モード選択のみ（自動送信なし）
  function selectMode(mode: "recommend" | "chat" | "sales", lang: "ja" | "en") {
    setSelectedMode(mode);
    setSelectedLang(lang);
    try {
      localStorage.setItem("musiam_chat_mode", mode);
      localStorage.setItem("musiam_chat_lang", lang);
    } catch {
      // ignore
    }
    capture("mode_select", { mode, lang });
  }

  // ✅ 送信ロジック：テキスト直接送信（チップ用）
  async function sendText(text: string) {
    if (!text || sending) return;

    const nextMsgs: ChatMsg[] = [...messages, { role: "user", content: text }];

    setMessages(nextMsgs);
    setInput("");
    setError(null);
    setSending(true);
    capture("chat_send", { len: text.length, source: "chip" });

    // ✅ モード決定：ユーザー選択（未選択ならrecommend既定）
    const effectiveMode = selectedMode ?? "recommend";
    const effectiveLang = selectedLang ?? "ja";

    try {
      const resp = await fetch("/api/chat-reco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: effectiveMode,
          lang: effectiveLang,
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

  // ✅ 送信ロジック：入力欄から送信
  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text) return;
    await sendText(text);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // IME変換中のEnterは無視（誤送信防止）
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>伯爵の門</h1>

      {/* モード選択：言語トグル + 3モードボタン */}
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          borderRadius: 10,
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(6px)",
        }}
      >
        {/* 言語トグル */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {(["ja", "en"] as const).map((l) => {
            const isLangActive = (selectedLang ?? "ja") === l;
            return (
              <button
                key={l}
                onClick={() => {
                  setSelectedLang(l);
                  try { localStorage.setItem("musiam_chat_lang", l); } catch { /* ignore */ }
                  capture("lang_select", { lang: l });
                }}
                style={{
                  padding: "5px 14px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  color: isLangActive ? "#fff" : "rgba(255,255,255,0.55)",
                  background: isLangActive ? "rgba(255,255,255,0.15)" : "transparent",
                  border: isLangActive
                    ? "1px solid rgba(255,255,255,0.25)"
                    : "1px solid rgba(255,255,255,0.1)",
                  transition: "all 0.15s",
                }}
              >
                {l === "ja" ? "日本語" : "English"}
              </button>
            );
          })}
        </div>

        {/* 3モードボタン */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {MODE_DEFS.map((def) => {
            const active = selectedMode === def.mode;
            const label = (selectedLang ?? "ja") === "en" ? def.en : def.ja;
            return (
              <button
                key={def.mode}
                onClick={() => selectMode(def.mode, selectedLang ?? "ja")}
                aria-pressed={active}
                style={{
                  padding: "12px 10px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 700,
                  textAlign: "center",
                  color: active ? "#fff" : "rgba(255,255,255,0.92)",
                  background: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
                  border: active
                    ? "1px solid rgba(255,255,255,0.35)"
                    : "1px solid rgba(255,255,255,0.15)",
                  transition: "all 0.2s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ワンタップ開始チップ（mode別） */}
        {selectedMode && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {(() => {
              const chips = {
                recommend: { ja: "おすすめして", en: "Recommend now" },
                chat: { ja: "雑談しよう", en: "Let's chat" },
                sales: { ja: "営業して", en: "Sell me" },
              };
              const chip = chips[selectedMode as keyof typeof chips];
              const text = (selectedLang ?? "ja") === "en" ? chip.en : chip.ja;
              return (
                <button
                  onClick={() => sendText(text)}
                  disabled={sending}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 999,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: sending ? "not-allowed" : "pointer",
                    opacity: sending ? 0.6 : 1,
                    background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))",
                    border: "1px solid rgba(139,92,246,0.3)",
                    color: "rgba(255,255,255,0.95)",
                    transition: "all 0.2s",
                  }}
                >
                  {text}
                </button>
              );
            })()}
          </div>
        )}
      </div>

      <div
        style={{
          borderRadius: 10,
          padding: 12,
          minHeight: 240,
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(6px)",
        }}
      >
        {messages.length === 0 ? (
          // ウェルカムメッセージ（伯爵キャラクター）
          <div style={{ margin: "8px 0" }}>
            <strong>伯爵</strong>
            <div style={{ whiteSpace: "pre-wrap", opacity: 0.85, marginTop: 4 }}>
              {(selectedLang ?? "ja") === "en"
                ? "Welcome to Count MUSIAM. Pick a mode and say hello."
                : "伯爵MUSIAMへようこそ。上のモードを選んで、ひとこと話しかけてください。"}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} style={{ margin: "8px 0" }}>
              <strong>{m.role === "user" ? "You" : "伯爵"}</strong>
              <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={selectedLang === "en" ? "Mood? (Free talk is OK)" : "気分は？（フリートークも可能です）"}
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
          {sending
            ? ((selectedLang ?? "ja") === "en" ? "Sending…" : "送信中…")
            : ((selectedLang ?? "ja") === "en" ? "Send" : "送信")}
        </button>
      </div>

      {error && (
        <div style={{ color: "#f55", marginTop: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      {cards.length > 0 && (
        <>
          <h2 style={{ marginTop: 24, fontSize: 18, fontWeight: 700 }}>おすすめ</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {cards.slice(0, 3).map((c) => (
              <article
                key={c.id}
                style={{
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: 12,
                  background: "rgba(255,255,255,0.04)",
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
                          background: linkBg(l.kind, l.url).bg,
                          color: linkBg(l.kind, l.url).fg,
                          textDecoration: "none",
                        }}
                      >
                        {linkLabel(l.kind, l.url)}
                      </a>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
