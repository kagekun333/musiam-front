import React, { startTransition, useEffect, useMemo, useRef, useState } from "react";
import styles from "./chat.module.css";
import {
  COUNT_PERSONA,
  DUKE_PERSONA,
  getSalonStarters,
  getSalonTimeCopy,
  getSalonTimeTone,
  type ChatPersonaId,
  type SalonTimeTone,
} from "@/lib/chat-experience";

type ChatRole = "user" | "assistant";
type ChatMsg = { role: ChatRole; content: string; persona?: ChatPersonaId };
type RecoLink = { kind: string; url: string };
type RecoCard = { id: string; title: string; cover: string; links: RecoLink[]; moodTags?: string[]; type?: string };
type Cta = { href: string; label: string };

function capture(event: string, props?: Record<string, unknown>) {
  if (typeof window !== "undefined" && (window as any).posthog) {
    (window as any).posthog.capture(event, props || {});
  }
}

function personaName(id: ChatPersonaId | undefined, lang: "ja" | "en") {
  if (id === "duke") return lang === "en" ? DUKE_PERSONA.nameEn : DUKE_PERSONA.nameJa;
  return lang === "en" ? COUNT_PERSONA.nameEn : COUNT_PERSONA.nameJa;
}

function linkLabel(kind: string, url?: string) {
  const v = String(url || "");
  if (kind === "listen") {
    if (/open\.spotify\.com|spotify:/i.test(v)) return "Spotifyで聴く";
    if (/music\.apple\.com/i.test(v)) return "Apple Musicで聴く";
    if (/music\.amazon\.(co\.jp|com)/i.test(v)) return "Amazon Musicで聴く";
    return "聴く";
  }
  if (kind === "read") return "読む";
  if (kind === "buy") return "購入";
  return "開く";
}
function linkBg(kind: string, url?: string): { bg: string; fg: string } {
  const v = String(url || "");
  if (kind === "listen" && /open\.spotify\.com|spotify:/i.test(v)) return { bg: "#1ed760", fg: "#000" };
  if (kind === "listen" && /music\.apple\.com/i.test(v)) return { bg: "#fc3c44", fg: "#fff" };
  if (kind === "listen" && /music\.amazon\.(co\.jp|com)/i.test(v)) return { bg: "#29a8e0", fg: "#fff" };
  return { bg: "rgba(216,182,92,0.14)", fg: "#e7d6a6" };
}

function TypewriterText({ text, animate }: { text: string; animate: boolean }) {
  const [shown, setShown] = useState(animate ? "" : text);
  useEffect(() => {
    if (!animate) { setShown(text); return; }
    const reduce =
      typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !text) { setShown(text); return; }
    setShown("");
    let i = 0;
    // ゆっくり一文字ずつ立ち上げる（語りの所作）。
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 80);
    return () => window.clearInterval(id);
  }, [text, animate]);
  return <>{shown}</>;
}

async function shareLine(text: string, onDone: (m: string) => void) {
  const payload = `${text}\n\n— Count MUSIAM 伯爵の館`;
  try {
    if (typeof navigator !== "undefined" && (navigator as any).share) { await (navigator as any).share({ text: payload }); onDone("共有しました"); return; }
    if (typeof navigator !== "undefined" && navigator.clipboard) { await navigator.clipboard.writeText(payload); onDone("コピーしました"); return; }
  } catch { /* cancel */ }
}

export default function ChatPage() {
  const [lang, setLang] = useState<"ja" | "en">("ja");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [card, setCard] = useState<RecoCard | null>(null);
  const [cta, setCta] = useState<Cta | null>(null);
  const [sending, setSending] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailDone, setEmailDone] = useState(false);
  const [timeTone, setTimeTone] = useState<SalonTimeTone>("night");

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);

  const timeCopy = useMemo(() => getSalonTimeCopy(timeTone), [timeTone]);
  const starters = useMemo(() => getSalonStarters(lang, timeTone), [lang, timeTone]);

  useEffect(() => {
    let initial: "ja" | "en" = "ja";
    try {
      const saved = localStorage.getItem("musiam_salon_lang");
      if (saved === "ja" || saved === "en") { initial = saved; setLang(saved); }
    } catch { /* ignore */ }
    const tone = getSalonTimeTone();
    setTimeTone(tone);
    void begin(initial, tone);
  }, []);

  useEffect(() => { if (!sending) inputRef.current?.focus(); }, [sending]);
  useEffect(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, [messages, sending]);
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(null), 1800); return () => window.clearTimeout(id); }, [toast]);

  async function begin(l: "ja" | "en" = lang, tone: SalonTimeTone = timeTone) {
    setError(null); setCard(null); setCta(null); setMessages([]);
    try {
      const res = await fetch("/api/chat-experience-v3", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: l, timeTone: tone, messages: [] }),
      });
      const json = await res.json();
      const text = String(json?.assistantText || "").trim();
      startTransition(() => {
        setMessages(text ? [{ role: "assistant", content: text, persona: "count" }] : []);
        setStarted(true);
      });
      capture("salon_open", { timeTone: tone });
    } catch (e: any) {
      setError(e?.message || "館の扉が開きませんでした。");
      setStarted(true);
    }
  }

  async function sendText(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    const next: ChatMsg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setError(null); setSending(true);
    capture("salon_send", { len: content.length });
    try {
      const res = await fetch("/api/chat-experience-v3", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, timeTone, messages: next }),
      });
      const json = await res.json();
      const assistantText = String(json?.assistantText || "").trim();
      const persona: ChatPersonaId = json?.persona === "duke" ? "duke" : "count";
      const nextCard: RecoCard | null = json?.card ?? null;
      const nextCta: Cta | null = json?.cta ?? null;
      startTransition(() => {
        setMessages((prev) => (assistantText ? [...prev, { role: "assistant", content: assistantText, persona }] : prev));
        setCard(nextCard);
        setCta(nextCta);
      });
      if (persona === "duke") capture("salon_duke", {});
      if (nextCard) capture("salon_work_show", { title: nextCard.title });
      if (nextCta) capture("salon_cta_show", { href: nextCta.href });
    } catch (e: any) {
      setError(e?.message || "通信が途切れました。");
    } finally {
      setSending(false);
    }
  }

  function onSubmit() {
    const v = inputRef.current?.value ?? "";
    if (!v.trim()) return;
    void sendText(v);
    if (inputRef.current) { inputRef.current.value = ""; inputRef.current.style.height = "auto"; }
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); onSubmit(); }
  }
  function autoGrow(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget; el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  async function submitEmail() {
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setToast(lang === "en" ? "Please check the email." : "メールの形式をご確認ください。"); return; }
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: v, source: "salon" }),
      });
      const json = await res.json();
      if (json?.ok) { setEmailDone(true); capture("salon_lead", { timeTone }); setToast(lang === "en" ? timeCopy.leadToastEn : timeCopy.leadToastJa); }
      else setToast(lang === "en" ? "Couldn't send." : "うまく送れませんでした。");
    } catch { setToast(lang === "en" ? "Couldn't send." : "うまく送れませんでした。"); }
  }

  const lastAssistantIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "assistant") return i;
    return -1;
  })();

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Count MUSIAM</p>
          <h1 className={styles.title}>伯爵の館</h1>
          <p className={styles.subtitle}>
            {lang === "en"
              ? timeCopy.subtitleEn
              : timeCopy.subtitleJa}
          </p>
        </div>
        <div className={styles.langRow}>
          {(["ja", "en"] as const).map((l) => (
            <button
              key={l}
              className={l === lang ? styles.langActive : styles.langButton}
              onClick={() => {
                const tone = getSalonTimeTone();
                setTimeTone(tone);
                setLang(l);
                try { localStorage.setItem("musiam_salon_lang", l); } catch { /* ignore */ }
                void begin(l, tone);
              }}
            >
              {l === "ja" ? "日本語" : "English"}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.chatShell}>
        {started && messages.length <= 1 && (
          <div className={styles.promptRow}>
            {starters.map((s) => (
              <button key={s} className={styles.promptChip} onClick={() => void sendText(s)} disabled={sending}>{s}</button>
            ))}
          </div>
        )}

        <div className={styles.thread} ref={threadRef}>
          {!started && <p className={styles.emptyState}>{lang === "en" ? "Opening the door…" : "扉を開いています…"}</p>}
          {messages.map((m, i) => {
            const isDukeEntry = m.role === "assistant" && m.persona === "duke" && (i === 0 || messages[i - 1]?.persona !== "duke");
            return (
              <React.Fragment key={`${m.role}-${i}`}>
                {isDukeEntry && (
                  <div className={styles.dukeDivider}>{lang === "en" ? "— The Duke enters —" : "—— 公爵がお見えになりました ——"}</div>
                )}
                <div className={m.role === "assistant" ? (m.persona === "duke" ? styles.dukeBubble : styles.assistantBubble) : styles.userBubble}>
                  <p className={styles.bubbleRole}>{m.role === "assistant" ? personaName(m.persona, lang) : "You"}</p>
                  <p className={styles.bubbleText}>
                    {m.role === "assistant"
                      ? <TypewriterText text={m.content} animate={i === lastAssistantIndex} />
                      : m.content}
                  </p>
                  {m.role === "assistant" && i === lastAssistantIndex && !sending && (
                    <button className={styles.shareInline} onClick={() => { capture("salon_line_share", {}); void shareLine(m.content, setToast); }}>
                      {lang === "en" ? "Keep this line" : "この一行を残す"}
                    </button>
                  )}
                </div>
              </React.Fragment>
            );
          })}
          {sending && (
            <div className={styles.assistantBubble}>
              <p className={styles.bubbleRole}>{personaName("count", lang)}</p>
              <p className={styles.thinking}><span /><span /><span /></p>
            </div>
          )}
        </div>

        {/* 商材の案内ボタン（伯爵/公爵が処方したとき） */}
        {cta && (
          <a
            href={cta.href}
            target="_blank"
            rel="noreferrer"
            className={styles.commerceCta}
            onClick={() => capture("salon_cta_click", { href: cta.href })}
          >
            {cta.label} →
          </a>
        )}

        <div className={styles.inputRow}>
          <textarea
            ref={inputRef}
            className={styles.input}
            rows={1}
            placeholder={lang === "en" ? "Say anything — speak to the Count" : "なんでもどうぞ。伯爵に話しかけてみてください"}
            onKeyDown={onKeyDown}
            onInput={autoGrow}
            disabled={sending || !started}
          />
          <button className={styles.sendButton} onClick={onSubmit} disabled={sending || !started}>
            {sending ? "…" : lang === "en" ? "Send" : "渡す"}
          </button>
        </div>

        <p className={styles.inputHint}>
          {lang === "en"
            ? "Greetings, worries, or idle talk — the Count listens to all. You can just chat freely."
            : "挨拶でも、相談でも、ただの雑談でも。自由に話して大丈夫です——伯爵はなんでもお聞きします。"}
        </p>

        {error && (
          <p className={styles.error}>
            {lang === "en" ? timeCopy.errorEn : timeCopy.errorJa}
          </p>
        )}

        {messages.length >= 3 && !emailDone && (
          <div className={styles.leadRow}>
            <span className={styles.leadText}>{lang === "en" ? timeCopy.leadPromptEn : timeCopy.leadPromptJa}</span>
            <div className={styles.leadInputRow}>
              <input
                className={styles.leadInput}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={lang === "en" ? "your@email" : "メールアドレス"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void submitEmail(); } }}
              />
              <button className={styles.leadButton} onClick={() => void submitEmail()}>{lang === "en" ? "Keep in touch" : "受け取る"}</button>
            </div>
          </div>
        )}
      </section>

      {card && (
        <section className={styles.giftShell}>
          <div className={styles.giftHeader}>
            <p className={styles.kicker}>{lang === "en" ? timeCopy.giftKickerEn : timeCopy.giftKickerJa}</p>
            <h3 className={styles.giftTitle}>{lang === "en" ? timeCopy.workTitleEn : timeCopy.workTitleJa}</h3>
          </div>
          <div className={styles.giftCard}>
            {card.cover ? <img src={card.cover} alt={card.title} className={styles.giftCover} /> : null}
            <div className={styles.giftBody}>
              <p className={styles.giftWorkType}>{card.type ?? "work"}</p>
              <h4 className={styles.giftWorkTitle}>{card.title}</h4>
              {card.moodTags?.length ? (
                <div className={styles.tagRow}>
                  {card.moodTags.slice(0, 4).map((t) => <span key={t} className={styles.tag}>{t}</span>)}
                </div>
              ) : null}
              <div className={styles.linkRow}>
                {card.links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => capture("salon_work_click", { kind: link.kind, title: card.title })}
                    className={styles.linkButton}
                    style={{ background: linkBg(link.kind, link.url).bg, color: linkBg(link.kind, link.url).fg }}
                  >
                    {linkLabel(link.kind, link.url)}
                  </a>
                ))}
                <a
                  href={`/works/${encodeURIComponent(String(card.id))}`}
                  onClick={() => capture("salon_work_detail", { id: card.id })}
                  className={styles.linkButton}
                  style={{ background: "rgba(216,182,92,0.16)", color: "#e7d6a6" }}
                >
                  作品の頁へ
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </main>
  );
}
