import React, { startTransition, useEffect, useMemo, useRef, useState } from "react";
import styles from "./chat.module.css";
import {
  SUPPORTED_LANG_VALUES,
  getChatUiText,
  getLanguageProfile,
  getLocalizedSalonTimeCopy,
  getSalonStarters,
  getSalonTimeTone,
  normalizeLang,
  type ChatPersonaId,
  type ChatUiText,
  type Lang,
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

const PERSONA_NAMES: Record<ChatPersonaId, Record<Lang, string>> = {
  count: {
    ja: "伯爵",
    en: "The Count",
    fr: "Le Comte",
    es: "El Conde",
    de: "Der Graf",
    ar: "الكونت",
  },
  duke: {
    ja: "公爵",
    en: "The Duke",
    fr: "Le Duc",
    es: "El Duque",
    de: "Der Herzog",
    ar: "الدوق",
  },
};

function personaName(id: ChatPersonaId | undefined, lang: Lang) {
  return PERSONA_NAMES[id === "duke" ? "duke" : "count"][lang];
}

const SERVICE_LISTEN_LABELS: Record<Lang, Record<"spotify" | "apple" | "amazon", string>> = {
  ja: {
    spotify: "Spotifyで聴く",
    apple: "Apple Musicで聴く",
    amazon: "Amazon Musicで聴く",
  },
  en: {
    spotify: "Listen on Spotify",
    apple: "Listen on Apple Music",
    amazon: "Listen on Amazon Music",
  },
  fr: {
    spotify: "Écouter sur Spotify",
    apple: "Écouter sur Apple Music",
    amazon: "Écouter sur Amazon Music",
  },
  es: {
    spotify: "Escuchar en Spotify",
    apple: "Escuchar en Apple Music",
    amazon: "Escuchar en Amazon Music",
  },
  de: {
    spotify: "Auf Spotify hören",
    apple: "Auf Apple Music hören",
    amazon: "Auf Amazon Music hören",
  },
  ar: {
    spotify: "استمع على Spotify",
    apple: "استمع على Apple Music",
    amazon: "استمع على Amazon Music",
  },
};

function linkLabel(kind: string, ui: ChatUiText, lang: Lang, url?: string) {
  const v = String(url || "");
  if (kind === "listen") {
    if (/open\.spotify\.com|spotify:/i.test(v)) return SERVICE_LISTEN_LABELS[lang].spotify;
    if (/music\.apple\.com/i.test(v)) return SERVICE_LISTEN_LABELS[lang].apple;
    if (/music\.amazon\.(co\.jp|com)/i.test(v)) return SERVICE_LISTEN_LABELS[lang].amazon;
    return ui.linkListen;
  }
  if (kind === "read") return ui.linkRead;
  if (kind === "buy") return ui.linkBuy;
  return ui.linkOpen;
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

async function shareLine(text: string, ui: ChatUiText, onDone: (m: string) => void) {
  const payload = `${text}\n\n${ui.shareAttribution}`;
  try {
    if (typeof navigator !== "undefined" && (navigator as any).share) { await (navigator as any).share({ text: payload }); onDone(ui.shared); return; }
    if (typeof navigator !== "undefined" && navigator.clipboard) { await navigator.clipboard.writeText(payload); onDone(ui.copied); return; }
  } catch { /* cancel */ }
}

export default function ChatPage() {
  const [lang, setLang] = useState<Lang>("ja");
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

  const timeCopy = useMemo(() => getLocalizedSalonTimeCopy(lang, timeTone), [lang, timeTone]);
  const ui = useMemo(() => getChatUiText(lang), [lang]);
  const langProfile = useMemo(() => getLanguageProfile(lang), [lang]);
  const starters = useMemo(() => getSalonStarters(lang, timeTone), [lang, timeTone]);

  useEffect(() => {
    let initial: Lang = "ja";
    try {
      const saved = localStorage.getItem("musiam_salon_lang");
      if (saved) {
        initial = normalizeLang(saved);
      } else if (typeof navigator !== "undefined") {
        initial = normalizeLang(navigator.languages?.[0] ?? navigator.language);
      }
      setLang(initial);
    } catch { /* ignore */ }
    const tone = getSalonTimeTone();
    setTimeTone(tone);
    void begin(initial, tone);
  }, []);

  useEffect(() => { if (!sending) inputRef.current?.focus(); }, [sending]);
  useEffect(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, [messages, sending]);
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(null), 1800); return () => window.clearTimeout(id); }, [toast]);

  async function begin(l: Lang = lang, tone: SalonTimeTone = timeTone) {
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
      capture("salon_open", { timeTone: tone, lang: l });
    } catch (e: any) {
      setError(e?.message || timeCopy.error);
      setStarted(true);
    }
  }

  async function sendText(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    const next: ChatMsg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setError(null); setSending(true);
    capture("salon_send", { len: content.length, lang });
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
      if (persona === "duke") capture("salon_duke", { lang });
      if (nextCard) capture("salon_work_show", { title: nextCard.title });
      if (nextCta) capture("salon_cta_show", { href: nextCta.href });
    } catch (e: any) {
      setError(e?.message || timeCopy.error);
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setToast(ui.emailInvalid); return; }
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: v, source: "salon" }),
      });
      const json = await res.json();
      if (json?.ok) { setEmailDone(true); capture("salon_lead", { timeTone, lang }); setToast(timeCopy.leadToast); }
      else setToast(ui.emailFailed);
    } catch { setToast(ui.emailFailed); }
  }

  const lastAssistantIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].role === "assistant") return i;
    return -1;
  })();

  return (
    <main className={styles.page} lang={langProfile.htmlLang} dir={langProfile.dir}>
      <section className={styles.hero}>
        <div>
          <p className={styles.kicker}>Count MUSIAM</p>
          <h1 className={styles.title}>伯爵の館</h1>
          <p className={styles.subtitle}>{timeCopy.subtitle}</p>
        </div>
        <div className={styles.langRow}>
          {SUPPORTED_LANG_VALUES.map((l) => (
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
              {getLanguageProfile(l).label}
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
          {!started && <p className={styles.emptyState}>{ui.emptyState}</p>}
          {messages.map((m, i) => {
            const isDukeEntry = m.role === "assistant" && m.persona === "duke" && (i === 0 || messages[i - 1]?.persona !== "duke");
            return (
              <React.Fragment key={`${m.role}-${i}`}>
                {isDukeEntry && (
                  <div className={styles.dukeDivider}>{ui.dukeDivider}</div>
                )}
                <div className={m.role === "assistant" ? (m.persona === "duke" ? styles.dukeBubble : styles.assistantBubble) : styles.userBubble}>
                  <p className={styles.bubbleRole}>{m.role === "assistant" ? personaName(m.persona, lang) : ui.userLabel}</p>
                  <p className={styles.bubbleText}>
                    {m.role === "assistant"
                      ? <TypewriterText text={m.content} animate={i === lastAssistantIndex} />
                      : m.content}
                  </p>
                  {m.role === "assistant" && i === lastAssistantIndex && !sending && (
                    <button className={styles.shareInline} onClick={() => { capture("salon_line_share", { lang }); void shareLine(m.content, ui, setToast); }}>
                      {ui.keepLine}
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
            placeholder={ui.inputPlaceholder}
            onKeyDown={onKeyDown}
            onInput={autoGrow}
            disabled={sending || !started}
          />
          <button className={styles.sendButton} onClick={onSubmit} disabled={sending || !started}>
            {sending ? "…" : ui.sendLabel}
          </button>
        </div>

        <p className={styles.inputHint}>{ui.inputHint}</p>

        {error && (
          <p className={styles.error}>
            {timeCopy.error}
          </p>
        )}

        {messages.length >= 3 && !emailDone && (
          <div className={styles.leadRow}>
            <span className={styles.leadText}>{timeCopy.leadPrompt}</span>
            <div className={styles.leadInputRow}>
              <input
                className={styles.leadInput}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={ui.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void submitEmail(); } }}
              />
              <button className={styles.leadButton} onClick={() => void submitEmail()}>{ui.leadButton}</button>
            </div>
          </div>
        )}
      </section>

      {card && (
        <section className={styles.giftShell}>
          <div className={styles.giftHeader}>
            <p className={styles.kicker}>{timeCopy.giftKicker}</p>
            <h3 className={styles.giftTitle}>{timeCopy.workTitle}</h3>
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
                    {linkLabel(link.kind, ui, lang, link.url)}
                  </a>
                ))}
                <a
                  href={`/works/${encodeURIComponent(String(card.id))}`}
                  onClick={() => capture("salon_work_detail", { id: card.id })}
                  className={styles.linkButton}
                  style={{ background: "rgba(216,182,92,0.16)", color: "#e7d6a6" }}
                >
                  {ui.workDetail}
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
