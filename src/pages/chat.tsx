import React, { startTransition, useEffect, useMemo, useRef, useState } from "react";
import styles from "./chat.module.css";
import { getChatEntry, getChatEntryGroups, getChatPersona, type ChatEntryId } from "@/lib/chat-experience";

type ChatRole = "user" | "assistant";
type ChatMsg = { role: ChatRole; content: string };
type LinkKind = "listen" | "read" | "open" | "buy" | string;
type RecoLink = { kind: LinkKind; url: string };
type RecoCard = {
  id: string;
  title: string;
  cover: string;
  links: RecoLink[];
  moodTags?: string[];
  type?: string;
};

type Memory = {
  entryId: ChatEntryId;
  entryNameJa: string;
  entryNameEn: string;
  personaId: string;
  personaNameJa: string;
  personaNameEn: string;
  residue: string;
  cardTitle?: string | null;
  timestamp: string;
};

function capture(event: string, props?: Record<string, unknown>) {
  if (typeof window !== "undefined" && (window as any).posthog) {
    (window as any).posthog.capture(event, props || {});
  }
}

function linkLabel(kind: string, url?: string) {
  const value = String(url || "");
  if (kind === "listen") {
    if (/open\.spotify\.com|spotify:/i.test(value)) return "Spotifyで聴く";
    if (/music\.apple\.com/i.test(value)) return "Apple Musicで聴く";
    if (/music\.amazon\.(co\.jp|com)/i.test(value)) return "Amazon Musicで聴く";
    return "聴く";
  }
  if (kind === "read") return "読む";
  if (kind === "buy") return "購入";
  return "開く";
}

function linkBg(kind: string, url?: string): { bg: string; fg: string } {
  const value = String(url || "");
  if (kind === "listen" && /open\.spotify\.com|spotify:/i.test(value)) {
    return { bg: "#1ed760", fg: "#000" };
  }
  if (kind === "listen" && /music\.apple\.com/i.test(value)) {
    return { bg: "#fc3c44", fg: "#fff" };
  }
  if (kind === "listen" && /music\.amazon\.(co\.jp|com)/i.test(value)) {
    return { bg: "#29a8e0", fg: "#fff" };
  }
  return { bg: "rgba(255,255,255,0.12)", fg: "#fff" };
}

export default function ChatPage() {
  const groups = useMemo(() => getChatEntryGroups(), []);
  const [selectedEntryId, setSelectedEntryId] = useState<ChatEntryId | null>(null);
  const [selectedLang, setSelectedLang] = useState<"ja" | "en">("ja");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [cards, setCards] = useState<RecoCard[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSession, setLastSession] = useState<Memory | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const selectedEntry = selectedEntryId ? getChatEntry(selectedEntryId) : undefined;
  const selectedPersona = selectedEntry ? getChatPersona(selectedEntry.persona) : undefined;

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("musiam_chat_lang");
      if (savedLang === "ja" || savedLang === "en") setSelectedLang(savedLang);

      const savedEntry = localStorage.getItem("musiam_chat_entry");
      if (savedEntry && getChatEntry(savedEntry)) {
        setSelectedEntryId(savedEntry as ChatEntryId);
        void beginEntry(savedEntry as ChatEntryId);
      }

      const savedMemory = localStorage.getItem("musiam_chat_memory_v3");
      if (savedMemory) {
        const parsed = JSON.parse(savedMemory) as Memory;
        setLastSession(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!sending) inputRef.current?.focus();
  }, [sending]);

  async function beginEntry(entryId: ChatEntryId) {
    const entry = getChatEntry(entryId);
    if (!entry) return;
    setError(null);
    setCards([]);
    setMessages([]);

    try {
      const res = await fetch("/api/chat-experience-v3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, lang: selectedLang, messages: [] }),
      });
      const json = await res.json();
      const assistantText = String(json?.assistantText || "").trim();
      const nextMemory = json?.memory ? (json.memory as Memory) : null;

      startTransition(() => {
        setMessages(assistantText ? [{ role: "assistant", content: assistantText }] : []);
        setCards([]);
        if (nextMemory) setLastSession(nextMemory);
      });

      try {
        localStorage.setItem("musiam_chat_entry", entryId);
        localStorage.setItem("musiam_chat_lang", selectedLang);
        if (nextMemory) localStorage.setItem("musiam_chat_memory_v3", JSON.stringify(nextMemory));
      } catch {
        // ignore
      }
      capture("chat_entry_open", { entryId, persona: entry.persona });
    } catch (e: any) {
      setError(e?.message || "会話の入口を開けませんでした。");
    }
  }

  async function sendText(text: string) {
    const content = text.trim();
    if (!content || sending || !selectedEntryId) return;

    const nextMessages: ChatMsg[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setError(null);
    setSending(true);
    capture("chat_send", { entryId: selectedEntryId, len: content.length });

    try {
      const res = await fetch("/api/chat-experience-v3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryId: selectedEntryId,
          lang: selectedLang,
          messages: nextMessages,
        }),
      });
      const json = await res.json();
      const assistantText = String(json?.assistantText || "").trim();
      const nextCards: RecoCard[] = Array.isArray(json?.cards) ? json.cards : [];
      const nextMemory = json?.memory ? (json.memory as Memory) : null;

      startTransition(() => {
        setMessages((prev) => (assistantText ? [...prev, { role: "assistant", content: assistantText }] : prev));
        setCards(nextCards);
        if (nextMemory) setLastSession(nextMemory);
      });

      if (nextCards.length) {
        capture("chat_gift_show", { entryId: selectedEntryId, count: nextCards.length });
      }
      try {
        if (nextMemory) localStorage.setItem("musiam_chat_memory_v3", JSON.stringify(nextMemory));
      } catch {
        // ignore
      }
    } catch (e: any) {
      setError(e?.message || "通信エラーが発生しました。");
    } finally {
      setSending(false);
    }
  }

  function onSubmit() {
    const value = inputRef.current?.value ?? "";
    const content = value.trim();
    if (!content) return;
    void sendText(content);
    if (inputRef.current) inputRef.current.value = "";
  }

  // 法人ニーズ検知: 制作依頼らしき言葉が出たら控えめに法人の門を案内する
  // (ペルソナのプロンプトは汚さず、UI側で確実に拾う)
  const showBizHint = useMemo(() => {
    const bizWords = /制作依頼|依頼したい|作ってほしい|作って欲しい|BGM.*(欲し|ほし|依頼|作)|楽曲提供|商用利用|仕事をお願い|見積|法人|会社で使|店舗.*(曲|音楽|BGM)|テーマ曲|主題歌.*依頼|commission|hire|quote/i;
    return messages.some((m) => m.role === "user" && bizWords.test(m.content));
  }, [messages]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Count MUSIAM</p>
          <h1 className={styles.title}>伯爵の門</h1>
          <p className={styles.subtitle}>
            人格の違う伯爵たちが、それぞれ別の深さで夜を受け止めます。今のあなたに近い入口を選んでください。
          </p>
        </div>

        <div className={styles.langRow}>
          {(["ja", "en"] as const).map((lang) => (
            <button
              key={lang}
              className={lang === selectedLang ? styles.langActive : styles.langButton}
              onClick={() => {
                setSelectedLang(lang);
                try {
                  localStorage.setItem("musiam_chat_lang", lang);
                } catch {
                  // ignore
                }
              }}
            >
              {lang === "ja" ? "日本語" : "English"}
            </button>
          ))}
        </div>
      </section>

      {lastSession && (
        <section className={styles.memoryPanel}>
          <div>
            <p className={styles.memoryLabel}>前回の余韻</p>
            <p className={styles.memoryText}>{lastSession.residue}</p>
          </div>
          <div className={styles.memoryMeta}>
            <span>{lastSession.entryNameJa}</span>
            {lastSession.cardTitle ? <span>最後に渡した: 「{lastSession.cardTitle}」</span> : null}
          </div>
        </section>
      )}

      <section className={styles.entries}>
        {groups.map((group) => (
          <article key={group.persona.id} className={styles.personaBlock}>
            <div className={styles.personaHeader}>
              <div>
                <p className={styles.personaName}>{selectedLang === "en" ? group.persona.nameEn : group.persona.nameJa}</p>
                <p className={styles.personaBlurb}>{selectedLang === "en" ? group.persona.blurbEn : group.persona.blurbJa}</p>
              </div>
            </div>

            <div className={styles.entryGrid}>
              {group.entries.map((entry) => {
                const active = selectedEntryId === entry.id;
                return (
                  <button
                    key={entry.id}
                    className={active ? styles.entryCardActive : styles.entryCard}
                    onClick={() => {
                      setSelectedEntryId(entry.id);
                      void beginEntry(entry.id);
                    }}
                  >
                    <span className={styles.entryName}>{selectedLang === "en" ? entry.nameEn : entry.nameJa}</span>
                    <span className={styles.entrySubtitle}>{selectedLang === "en" ? entry.subtitleEn : entry.subtitleJa}</span>
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </section>

      <section className={styles.chatShell}>
        <header className={styles.chatHeader}>
          <div>
            <p className={styles.chatLabel}>{selectedPersona ? (selectedLang === "en" ? selectedPersona.nameEn : selectedPersona.nameJa) : "入口を選ぶ"}</p>
            <h2 className={styles.chatTitle}>
              {selectedEntry ? (selectedLang === "en" ? selectedEntry.nameEn : selectedEntry.nameJa) : "今夜に近い入口を選んでください"}
            </h2>
          </div>
          <div className={styles.turnPill}>
            <span>{Math.ceil(messages.filter((message) => message.role === "user").length / 1)}</span>
            <span>/ 10</span>
          </div>
        </header>

        {selectedEntry && selectedEntry.promptsJa.length > 0 && (
          <div className={styles.promptRow}>
            {(selectedLang === "en" ? selectedEntry.promptsEn : selectedEntry.promptsJa).map((prompt) => (
              <button
                key={prompt}
                className={styles.promptChip}
                onClick={() => void sendText(prompt)}
                disabled={sending}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        <div className={styles.thread}>
          {!selectedEntry && <p className={styles.emptyState}>左の入口から、今のあなたに近い伯爵を選んでください。</p>}
          {selectedEntry && messages.length === 0 && <p className={styles.emptyState}>入口を開いています…</p>}
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={message.role === "assistant" ? styles.assistantBubble : styles.userBubble}>
              <p className={styles.bubbleRole}>
                {message.role === "assistant"
                  ? selectedPersona
                    ? selectedLang === "en"
                      ? selectedPersona.nameEn
                      : selectedPersona.nameJa
                    : "伯爵"
                  : "You"}
              </p>
              <p className={styles.bubbleText}>{message.content}</p>
            </div>
          ))}
        </div>

        {showBizHint && (
          <a
            href="/business"
            onClick={() => capture("chat_biz_lead_click", { entryId: selectedEntryId })}
            style={{
              display: "block",
              margin: "10px 0",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid rgba(216,182,92,0.4)",
              background: "rgba(216,182,92,0.08)",
              color: "#d8b65c",
              fontSize: 13,
              textDecoration: "none",
              textAlign: "center",
            }}
          >
            {selectedLang === "en"
              ? "Looking to commission music? The Business Gate is open →"
              : "楽曲のご依頼でしたら、法人の門が開いております →"}
          </a>
        )}

        <div className={styles.inputRow}>
          <input
            ref={inputRef}
            className={styles.input}
            placeholder={
              selectedLang === "en"
                ? "Leave the next fragment of your night here"
                : "今夜の断片を、ひとつ置いてください"
            }
            onKeyDown={onKeyDown}
            disabled={sending || !selectedEntry}
          />
          <button className={styles.sendButton} onClick={onSubmit} disabled={sending || !selectedEntry}>
            {sending ? (selectedLang === "en" ? "Thinking…" : "思案中…") : selectedLang === "en" ? "Send" : "送信"}
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </section>

      {cards.length > 0 && (
        <section className={styles.giftShell}>
          <div className={styles.giftHeader}>
            <p className={styles.kicker}>Tonight&apos;s Gift</p>
            <h3 className={styles.giftTitle}>今夜の贈り物</h3>
          </div>
          <div className={styles.giftCard}>
            {cards[0].cover ? <img src={cards[0].cover} alt={cards[0].title} className={styles.giftCover} /> : null}
            <div className={styles.giftBody}>
              <p className={styles.giftWorkType}>{cards[0].type ?? "work"}</p>
              <h4 className={styles.giftWorkTitle}>{cards[0].title}</h4>
              {cards[0].moodTags?.length ? (
                <div className={styles.tagRow}>
                  {cards[0].moodTags.slice(0, 4).map((tag) => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className={styles.linkRow}>
                {cards[0].links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => capture("chat_gift_click", { entryId: selectedEntryId, kind: link.kind, title: cards[0].title })}
                    className={styles.linkButton}
                    style={{ background: linkBg(link.kind, link.url).bg, color: linkBg(link.kind, link.url).fg }}
                  >
                    {linkLabel(link.kind, link.url)}
                  </a>
                ))}
                {/* 内部リンク: 作品個別ページ (回遊+SEO) */}
                <a
                  href={`/works/${encodeURIComponent(String(cards[0].id))}`}
                  onClick={() => capture("chat_work_detail_click", { id: cards[0].id, title: cards[0].title })}
                  className={styles.linkButton}
                  style={{ background: "rgba(216,182,92,0.15)", color: "#d8b65c" }}
                >
                  作品の頁へ
                </a>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
