import React, { startTransition, useEffect, useMemo, useRef, useState } from "react";
import styles from "./chat.module.css";
import MetalPrintConsultationForm from "@/components/MetalPrintConsultationForm";
import type { MetalPrintAttribution } from "@/lib/metal-print-consultation";
import { recordMetalFunnelEvent } from "@/lib/metal-print-funnel-client";
import { recordChatInterestEvent } from "@/lib/chat-interest-funnel-client";
import {
  appendAssistantReply,
  isChatConversationId,
  normalizeChatHistory,
  normalizeChatUiReply,
  type ChatCta,
  type ChatHistoryMessage,
  type ChatWorkCard,
} from "@/lib/chat-ui-contract";
import { getChatCardJourney } from "@/lib/chat-card-journey";
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

type ChatMsg = ChatHistoryMessage;
type RecoCard = ChatWorkCard;
type Cta = ChatCta;
type SalesIntent = "care" | "business" | "order" | "product" | "work" | "conversation";
type ReplyPhase = "idle" | "awaitingRead" | "typing";
type MemoryStatus = "idle" | "saving" | "saved" | "unavailable";
type AssistantReply = {
  assistantText: string;
  persona: ChatPersonaId;
  nextCards: RecoCard[];
  choices: string[];
  nextCta: Cta | null;
  intent: SalesIntent;
  productId: string | null;
  interestBridge: { id: string; action: "explore" | "offer" | "decline" } | null;
};
type PendingReplyResult =
  | { ok: true; reply: AssistantReply }
  | { ok: false; error: unknown };

const HUMAN_REPLY_DELAY_MS = 900;
const READ_RECEIPT_DELAY_MS = 450;
const CHAT_CONVERSATION_ID_KEY = "musiam_chat_conversation_id_v1";
const CHAT_MEMORY_ENABLED_KEY = "musiam_chat_memory_enabled_v1";

const CHAT_INTRO_COPY: Record<Lang, { title: string; body: string; prompt: string; promptHint: string }> = {
  ja: { title: "伯爵と、MUSIAMの作品をめぐる会話を。", body: "会話AIの伯爵が、作品を探したり、聴いた印象を話したりするお手伝いをします。作品の作者「ABI伯爵」と、会話AIの伯爵は別の存在です。", prompt: "話題を選ぶか、そのまま入力してください", promptHint: "一言から始められます。下の入力欄に自由に書いても大丈夫です。" },
  en: { title: "A conversation about the works of MUSIAM.", body: "The Count is MUSIAM's conversational guide for discovering works and sharing what you hear. ABI the artist and the AI Count are separate entities.", prompt: "Choose a starting point or write your own", promptHint: "A few words are enough. You can also type freely below." },
  fr: { title: "Une conversation autour des œuvres de MUSIAM.", body: "Le Comte vous accompagne pour découvrir les œuvres et parler de ce que vous entendez. ABI伯爵, l’artiste, et le Comte IA sont deux entités distinctes.", prompt: "Choisissez un sujet ou écrivez le vôtre", promptHint: "Quelques mots suffisent. Vous pouvez aussi écrire librement ci-dessous." },
  es: { title: "Una conversación sobre las obras de MUSIAM.", body: "El Conde te ayuda a descubrir obras y compartir lo que escuchas. ABI伯爵, el artista, y el Conde de IA son entidades distintas.", prompt: "Elige un tema o escribe el tuyo", promptHint: "Bastan unas palabras. También puedes escribir libremente abajo." },
  de: { title: "Ein Gespräch über die Werke von MUSIAM.", body: "Der Graf begleitet dich beim Entdecken der Werke und beim Austausch über das Gehörte. ABI伯爵, der Künstler, und der KI-Graf sind zwei verschiedene Personen.", prompt: "Wähle einen Einstieg oder schreibe selbst", promptHint: "Ein paar Worte genügen. Du kannst unten auch frei schreiben." },
  ar: { title: "حوار حول أعمال MUSIAM.", body: "يرشدك الكونت في اكتشاف الأعمال ومشاركة انطباعك عمّا تسمعه. ABI伯爵 الفنان والكونت الذكي شخصيتان منفصلتان.", prompt: "اختر بداية أو اكتب ما تريد", promptHint: "كلمات قليلة تكفي. يمكنك الكتابة بحرية في الأسفل أيضًا." },
};

function newConversationId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const part = (length: number) => Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `${part(8)}-${part(4)}-4${part(3)}-a${part(3)}-${part(12)}`;
}

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

const METAL_EDITION_IDS_BY_TITLE: Record<string, string> = {
  "33 IGNITION": "VIP-METAL-2026-07-IGNITION",
  "A Town Called Almost Home": "VIP-METAL-2026-07-HOME",
  BALIAN: "VIP-METAL-2026-07-BALIAN",
  "Deus sive Natura": "VIP-METAL-2026-07-NATURA",
};

const METAL_CAMPAIGN_OPTIONS = [
  { title: "Deus sive Natura", space: "home", labelJa: "自宅・書斎", labelEn: "Home / study" },
  { title: "33 IGNITION", space: "office", labelJa: "オフィス", labelEn: "Office" },
  { title: "A Town Called Almost Home", space: "hotel", labelJa: "ホテル・別荘", labelEn: "Hotel / second home" },
  { title: "BALIAN", space: "wellness", labelJa: "スパ・静養空間", labelEn: "Spa / retreat" },
] as const;

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
    }, 22);
    return () => window.clearInterval(id);
  }, [text, animate]);
  return <>{shown}</>;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
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
  const [cards, setCards] = useState<RecoCard[]>([]);
  const [choices, setChoices] = useState<string[]>([]);
  const [cta, setCta] = useState<Cta | null>(null);
  const [sending, setSending] = useState(false);
  const [replyPhase, setReplyPhase] = useState<ReplyPhase>("idle");
  const [readReceiptMessageIndex, setReadReceiptMessageIndex] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailDone, setEmailDone] = useState(false);
  const [timeTone, setTimeTone] = useState<SalonTimeTone>("night");
  const [campaignWork, setCampaignWork] = useState("");
  const [campaignWorkId, setCampaignWorkId] = useState("");
  const [metalPrintEntry, setMetalPrintEntry] = useState(false);
  const [musicWorkEntry, setMusicWorkEntry] = useState(false);
  // 法人オフィスアート入口（/shop の入荷通知・/office-art 系SEO記事からの着地）
  const [officeArtEntry, setOfficeArtEntry] = useState(false);
  const [metalAttribution, setMetalAttribution] = useState<MetalPrintAttribution>({});
  const [sourceContent, setSourceContent] = useState("");
  const [rememberConversation, setRememberConversation] = useState(true);
  const [historyRestored, setHistoryRestored] = useState(false);
  const [memoryStatus, setMemoryStatus] = useState<MemoryStatus>("idle");

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const replyRequestIdRef = useRef(0);
  const sendInFlightRef = useRef(false);
  const entryGenerationRef = useRef(0);
  const historyRevisionRef = useRef(0);
  const historyQueueRef = useRef(Promise.resolve());
  const lastFailedRequestRef = useRef<{ messages: ChatMsg[]; userMessageIndex: number; userTurn: number } | null>(null);
  const metalFunnelActivatedRef = useRef(false);
  const interestBridgePendingRef = useRef<string | null>(null);
  const conversationIdRef = useRef("");
  const rememberConversationRef = useRef(true);

  const timeCopy = useMemo(() => getLocalizedSalonTimeCopy(lang, timeTone), [lang, timeTone]);
  const ui = useMemo(() => getChatUiText(lang), [lang]);
  const intro = CHAT_INTRO_COPY[lang];
  const langProfile = useMemo(() => getLanguageProfile(lang), [lang]);
  const starters = useMemo(() => {
    const defaults = getSalonStarters(lang, timeTone);
    if (musicWorkEntry && campaignWork) {
      const affinityStarters = lang === "ja"
        ? [
            `「${campaignWork}」を聴いて、いちばん残った感情を話したい`,
            `「${campaignWork}」の音とジャケットのつながりが気になる`,
          ]
        : [
            `I want to talk about the feeling “${campaignWork}” left with me`,
            `I am curious about the connection between the sound and artwork of “${campaignWork}”`,
          ];
      return [...affinityStarters, ...defaults].slice(0, 8);
    }
    if (!metalPrintEntry && officeArtEntry) {
      // 法人入口は「空間 → サイズ → 予算/経費」の順で話が進むよう、最初の一言を用意する。
      const officeStarters = lang === "ja"
        ? [
            "応接室に飾るアートを探しています",
            "オフィスのエントランスに合うサイズを相談したい",
            "法人でまとめて導入する場合の進め方を知りたい",
          ]
        : [
            "I am looking for art for our meeting room",
            "I want to discuss the right size for our office entrance",
            "How does a corporate multi-piece order work?",
          ];
      return [...officeStarters, ...defaults].slice(0, 8);
    }
    if (!metalPrintEntry) {
      const campaignStarter = lang === "ja" && sourceContent === "ABI-LW01-05"
        ? "静けさと力強さなら、今は静けさがほしい"
        : lang === "en" && sourceContent === "ABI-LW01-05"
          ? "Between stillness and strength, I need stillness now"
          : null;
      return campaignStarter ? [campaignStarter, ...defaults].slice(0, 8) : defaults;
    }
    const metalStarter = lang === "ja"
      ? campaignWork
        ? `「${campaignWork}」を部屋に飾る相談がしたい`
        : "私の空間に合う限定メタルプリントを選んでほしい"
      : campaignWork
        ? `I want to discuss displaying “${campaignWork}” in my room`
        : "Choose a limited metal print for my space";
    return [metalStarter, ...defaults].slice(0, 8);
  }, [campaignWork, lang, metalPrintEntry, musicWorkEntry, officeArtEntry, sourceContent, timeTone]);
  const metalCampaignEditionId = METAL_EDITION_IDS_BY_TITLE[campaignWork]
    ?? (campaignWork && campaignWorkId ? `CATALOG-WORK:${campaignWorkId}` : null);

  function selectMetalEdition(title: string, spaceSegment: string) {
    const nextAttribution = { ...metalAttribution, content: metalAttribution.content === "none" ? `chat_selector_${spaceSegment}` : metalAttribution.content, spaceSegment };
    setCampaignWork(title);
    setMetalAttribution(nextAttribution);
    const params = new URLSearchParams(window.location.search);
    params.set("work", title);
    params.set("space", spaceSegment);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    capture("metal_edition_selected", { workTitle: title, ...nextAttribution });
    recordMetalFunnelEvent("metal_edition_selected", nextAttribution);
  }

  useEffect(() => {
    const generation = ++entryGenerationRef.current;
    const tone = getSalonTimeTone();
    const params = new URLSearchParams(window.location.search);
    // 言語の決定順: URL の ?lang= > 保存済みの選択 > ブラウザ設定。
    // /en 配下（英語クラスタ）から来た訪問者は日本語ブラウザでも英語で迎える必要があるため、
    // 送客側が明示した ?lang=en を最優先する。localStorage には保存しない
    // （明示指定は「この訪問での指定」であり、以後の既定を書き換えるべきではない）。
    let initial: Lang = "ja";
    const langParam = params.get("lang");
    try {
      const saved = localStorage.getItem("musiam_salon_lang");
      if (langParam) {
        initial = normalizeLang(langParam);
      } else if (saved) {
        initial = normalizeLang(saved);
      } else if (typeof navigator !== "undefined") {
        initial = normalizeLang(navigator.languages?.[0] ?? navigator.language);
      }
      setLang(initial);
    } catch {
      // localStorage が使えない環境（プライベートモード等）でも ?lang= は効かせる
      if (langParam) {
        initial = normalizeLang(langParam);
        setLang(initial);
      }
    }
    const isMetalPrintEntry = params.get("intent") === "metal-print";
    const isMusicWorkEntry = params.get("intent") === "music-work";
    metalFunnelActivatedRef.current = isMetalPrintEntry;
    setMetalPrintEntry(isMetalPrintEntry);
    setMusicWorkEntry(isMusicWorkEntry);
    setOfficeArtEntry(params.get("intent") === "office-art");
    setCampaignWork(params.get("work")?.slice(0, 120) ?? "");
    setCampaignWorkId(params.get("workId")?.slice(0, 180) ?? "");
    setSourceContent(params.get("utm_content")?.slice(0, 80) ?? "");
    const clean = (key: string) => params.get(key)?.slice(0, 80) || undefined;
    const initialMetalAttribution = { source: clean("utm_source") ?? "direct", medium: clean("utm_medium") ?? "none", campaign: clean("utm_campaign") ?? "none", content: clean("utm_content") ?? "none", spaceSegment: clean("space") };
    setMetalAttribution(initialMetalAttribution);
    if (isMetalPrintEntry) recordMetalFunnelEvent("metal_chat_start", initialMetalAttribution);
    setTimeTone(tone);
    void restoreOrBegin(initial, tone);
    return () => {
      if (entryGenerationRef.current === generation) {
        ++entryGenerationRef.current;
        ++replyRequestIdRef.current;
        sendInFlightRef.current = false;
      }
    };
  }, []);

  useEffect(() => { if (!sending) inputRef.current?.focus(); }, [sending]);
  useEffect(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, [messages, sending, replyPhase, readReceiptMessageIndex]);
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(null), 1800); return () => window.clearTimeout(id); }, [toast]);

  function ensureConversationId() {
    if (conversationIdRef.current) return conversationIdRef.current;
    let id = "";
    try { id = localStorage.getItem(CHAT_CONVERSATION_ID_KEY) ?? ""; } catch { /* ignore */ }
    if (!isChatConversationId(id)) id = newConversationId();
    conversationIdRef.current = id;
    try { localStorage.setItem(CHAT_CONVERSATION_ID_KEY, id); } catch { /* ignore */ }
    return id;
  }

  async function persistConversation(nextMessages: ChatMsg[], nextLang: Lang = lang) {
    if (!rememberConversationRef.current || !nextMessages.length) return;
    const revision = ++historyRevisionRef.current;
    const conversationId = ensureConversationId();
    const serializedMessages = normalizeChatHistory(nextMessages);
    if (!serializedMessages.length) return;
    setMemoryStatus("saving");
    historyQueueRef.current = historyQueueRef.current.catch(() => undefined).then(async () => {
      try {
        const res = await fetch("/api/chat-history", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, lang: nextLang, messages: serializedMessages }),
          keepalive: true,
        });
        if (revision === historyRevisionRef.current) setMemoryStatus(res.ok ? "saved" : "unavailable");
      } catch {
        if (revision === historyRevisionRef.current) setMemoryStatus("unavailable");
      }
    });
    await historyQueueRef.current;
  }

  async function restoreOrBegin(l: Lang, tone: SalonTimeTone) {
    const generation = entryGenerationRef.current;
    let enabled = true;
    try { enabled = localStorage.getItem(CHAT_MEMORY_ENABLED_KEY) !== "off"; } catch { /* ignore */ }
    rememberConversationRef.current = enabled;
    setRememberConversation(enabled);
    if (enabled) {
      try {
        const res = await fetch(`/api/chat-history?conversationId=${encodeURIComponent(ensureConversationId())}`, { cache: "no-store" });
        const json = await res.json();
        if (generation !== entryGenerationRef.current) return;
        const restored = normalizeChatHistory(json?.history?.messages);
        if (res.ok && restored.length) {
          const restoredCard = normalizeChatUiReply({ card: json?.restoredRecommendation }).cards[0] ?? null;
          setMessages(restored);
          setCards(restoredCard ? [restoredCard] : []); setChoices([]); setCta(null);
          setLang(normalizeLang(json?.history?.lang ?? l));
          setStarted(true);
          setHistoryRestored(true);
          setMemoryStatus("saved");
          capture("salon_history_restored", { messageCount: restored.length });
          return;
        }
      } catch { /* 新しい会話へフォールバック */ }
    }
    if (generation === entryGenerationRef.current) await begin(l, tone);
  }

  async function queueHistoryDeletion(id: string) {
    if (!id) return;
    ++historyRevisionRef.current;
    historyQueueRef.current = historyQueueRef.current.catch(() => undefined).then(async () => {
      try { await fetch(`/api/chat-history?conversationId=${encodeURIComponent(id)}`, { method: "DELETE" }); } catch { /* optional deletion */ }
    });
    await historyQueueRef.current;
  }

  async function forgetConversation() {
    const id = conversationIdRef.current;
    await queueHistoryDeletion(id);
    conversationIdRef.current = "";
    try { localStorage.removeItem(CHAT_CONVERSATION_ID_KEY); } catch { /* ignore */ }
    setHistoryRestored(false);
    setMemoryStatus("idle");
    setToast(lang === "ja" ? "会話の記憶を消去しました" : "Conversation memory deleted");
    await begin(lang, timeTone);
  }

  async function toggleConversationMemory(enabled: boolean) {
    rememberConversationRef.current = enabled;
    setRememberConversation(enabled);
    try { localStorage.setItem(CHAT_MEMORY_ENABLED_KEY, enabled ? "on" : "off"); } catch { /* ignore */ }
    if (enabled) {
      await persistConversation(messages, lang);
      setToast(lang === "ja" ? "この会話を記憶します" : "This conversation will be remembered");
      return;
    }
    setMemoryStatus("idle");
    const id = conversationIdRef.current;
    await queueHistoryDeletion(id);
    setToast(lang === "ja" ? "会話の記憶を停止しました" : "Conversation memory turned off");
  }

  async function begin(l: Lang = lang, tone: SalonTimeTone = timeTone) {
    const requestId = ++replyRequestIdRef.current;
    sendInFlightRef.current = false;
    setStarted(false);
    setSending(false);
    setReplyPhase("idle");
    setReadReceiptMessageIndex(null);
    setError(null); setCards([]); setChoices([]); setCta(null); setMessages([]);
    try {
      const params = new URLSearchParams(window.location.search);
      const res = await fetch("/api/chat-experience-v3", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang: l,
          timeTone: tone,
          messages: [],
          entryContext: params.get("intent") === "music-work" && params.get("workId") && params.get("work")
            ? { intent: "music-work", workId: params.get("workId"), workTitle: params.get("work") }
            : undefined,
        }),
      });
      const json = await res.json();
      if (requestId !== replyRequestIdRef.current) return;
      if (!res.ok || json?.ok === false) throw new Error(String(json?.error || timeCopy.error));
      const reply = normalizeChatUiReply(json);
      const text = reply.assistantText;
      startTransition(() => {
        const opening: ChatMsg[] = text ? [{
          role: "assistant",
          content: text,
          persona: reply.persona,
          ...(reply.cards[0]?.workId ? { recommendedWorkId: reply.cards[0].workId } : {}),
        }] : [];
        setMessages(opening);
        setCards(reply.cards); setChoices(reply.choices); setCta(reply.cta);
        void persistConversation(opening, l);
        setStarted(true);
      });
      const sourceIntent = typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("intent")
        : null;
      // via / inbound_content は /shop を経由した内部導線が付ける「元の流入元」情報（src/lib/utm.ts）。
      // これが無いと SEO記事→交易所→チャットの3ホップで記事名が失われる。
      capture("salon_open", { timeTone: tone, lang: l, sourceIntent: sourceIntent ?? "direct", source: params.get("utm_source") ?? "direct", medium: params.get("utm_medium") ?? "none", campaign: params.get("utm_campaign") ?? "none", content: params.get("utm_content") ?? "none", via: params.get("via") ?? "none", inboundContent: params.get("inbound_content") ?? "none", spaceSegment: params.get("space") ?? "none" });
      if (sourceIntent === "metal-print") recordMetalFunnelEvent("metal_salon_open", { source: params.get("utm_source") ?? "direct", medium: params.get("utm_medium") ?? "none", campaign: params.get("utm_campaign") ?? "none", content: params.get("utm_content") ?? "none", spaceSegment: params.get("space") ?? "none" });
    } catch (e: any) {
      if (requestId !== replyRequestIdRef.current) return;
      setError(e?.message || timeCopy.error);
      setStarted(true);
    }
  }

  async function requestAssistantReply(next: ChatMsg[]): Promise<AssistantReply> {
    const res = await fetch("/api/chat-experience-v3", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lang,
        timeTone,
        messages: next,
        entryContext: musicWorkEntry && campaignWorkId && campaignWork
          ? { intent: "music-work", workId: campaignWorkId, workTitle: campaignWork }
          : undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok || json?.ok === false) {
      throw new Error(String(json?.error || timeCopy.error));
    }
    const normalized = normalizeChatUiReply(json);
    return {
      assistantText: normalized.assistantText,
      persona: normalized.persona,
      nextCards: normalized.cards,
      choices: normalized.choices,
      nextCta: normalized.cta,
      intent: normalized.intent as SalesIntent,
      productId: normalized.productId,
      interestBridge: normalized.interestBridge,
    };
  }

  function sendText(text: string) {
    const content = text.trim();
    if (!content || sending || sendInFlightRef.current || !started) return;
    const next: ChatMsg[] = [...messages, { role: "user", content }];
    const userTurn = next.filter((message) => message.role === "user").length;
    if (musicWorkEntry && userTurn === 1) recordMetalFunnelEvent("metal_music_affinity_entry", metalAttribution);
    if (metalPrintEntry && userTurn === 1) recordMetalFunnelEvent("metal_first_message", metalAttribution);
    const userMessageIndex = next.length - 1;
    const requestId = replyRequestIdRef.current + 1;
    replyRequestIdRef.current = requestId;
    lastFailedRequestRef.current = null;
    setMessages(next);
    void persistConversation(next);
    setError(null);
    setSending(true);
    sendInFlightRef.current = true;
    setReplyPhase("awaitingRead");
    setReadReceiptMessageIndex(null);
    const pending = requestAssistantReply(next)
      .then((reply): PendingReplyResult => ({ ok: true, reply }))
      .catch((error): PendingReplyResult => ({ ok: false, error }));
    capture("salon_send", { len: content.length, lang, userTurn });
    void runReplyFlow(requestId, userMessageIndex, userTurn, next, pending);
  }

  async function runReplyFlow(requestId: number, userMessageIndex: number, userTurn: number, requestMessages: ChatMsg[], pending: Promise<PendingReplyResult>) {
    await wait(READ_RECEIPT_DELAY_MS);
    if (requestId !== replyRequestIdRef.current) return;

    setReadReceiptMessageIndex(userMessageIndex);
    setReplyPhase("typing");
    capture("salon_read_receipt", { lang });

    await wait(HUMAN_REPLY_DELAY_MS);
    if (requestId !== replyRequestIdRef.current) return;

    const result = await pending;
    if (requestId !== replyRequestIdRef.current) return;

    if (!result.ok) {
      const e = result.error as Error;
      setError(e?.message || timeCopy.error);
      setReplyPhase("idle");
      setSending(false);
      sendInFlightRef.current = false;
      lastFailedRequestRef.current = { messages: requestMessages, userMessageIndex, userTurn };
      return;
    }

    const { assistantText, persona, nextCards, choices: nextChoices, nextCta, intent, productId, interestBridge } = result.reply;
    const nextCard = nextCards[0] ?? null;
    const completedMessages = appendAssistantReply(requestMessages, {
      assistantText,
      persona,
      recommendedWorkId: nextCard?.workId,
    });
    startTransition(() => {
      setMessages(completedMessages);
      setCards(nextCards); setChoices(nextChoices);
      setCta(nextCta);
    });
    void persistConversation(completedMessages);
    capture("salon_reply", {
      lang,
      userTurn,
      intent,
      persona,
      hasWork: Boolean(nextCard),
      hasCta: Boolean(nextCta),
      productId,
    });
    if (productId === "vip-metal-print" && !metalFunnelActivatedRef.current) {
      metalFunnelActivatedRef.current = true;
      setMetalPrintEntry(true);
      const params = new URLSearchParams(window.location.search);
      params.set("intent", "metal-print");
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
      recordMetalFunnelEvent("metal_chat_start", metalAttribution);
      recordMetalFunnelEvent("metal_salon_open", metalAttribution);
      recordMetalFunnelEvent("metal_first_message", metalAttribution);
      capture("metal_funnel_activated_from_conversation", {
        lang,
        userTurn,
        sourceIntent: "conversation_detected",
        ...metalAttribution,
      });
    }
    if (musicWorkEntry && productId === "vip-metal-print") recordMetalFunnelEvent("metal_music_affinity_dossier_accept", metalAttribution);
    if (persona === "duke") {
      capture("salon_duke", { lang, userTurn, intent, productId });
      if (productId === "vip-metal-print") recordMetalFunnelEvent("metal_duke", metalAttribution);
    }
    if (nextCard) capture("salon_work_show", { workId: nextCard.workId, workType: nextCard.type, lang, userTurn, intent });
    if (interestBridge?.action === "offer") {
      interestBridgePendingRef.current = interestBridge.id;
      capture("salon_interest_bridge_show", { bridgeId: interestBridge.id, lang, userTurn });
      recordChatInterestEvent("chat_interest_bridge_show", interestBridge.id);
    }
    if (interestBridge?.action === "decline") {
      capture("salon_interest_bridge_decline", { bridgeId: interestBridgePendingRef.current ?? interestBridge.id, lang, userTurn });
      recordChatInterestEvent("chat_interest_bridge_decline", interestBridgePendingRef.current ?? interestBridge.id);
      interestBridgePendingRef.current = null;
    }
    if (nextCard && interestBridgePendingRef.current) {
      capture("salon_interest_bridge_accept", { bridgeId: interestBridgePendingRef.current, workId: nextCard.workId, workType: nextCard.type, lang, userTurn });
      recordChatInterestEvent("chat_interest_bridge_accept", interestBridgePendingRef.current);
      interestBridgePendingRef.current = null;
    }
    if (nextCta) capture("salon_cta_show", { productId: nextCta.productId ?? productId, lang, userTurn, intent, persona });

    setReplyPhase("idle");
    setSending(false);
    sendInFlightRef.current = false;
  }

  function retryLastReply() {
    const failed = lastFailedRequestRef.current;
    if (!failed || sending || sendInFlightRef.current) return;
    const requestId = replyRequestIdRef.current + 1;
    replyRequestIdRef.current = requestId;
    sendInFlightRef.current = true;
    setError(null);
    setSending(true);
    setReplyPhase("awaitingRead");
    setReadReceiptMessageIndex(null);
    const pending = requestAssistantReply(failed.messages)
      .then((reply): PendingReplyResult => ({ ok: true, reply }))
      .catch((error): PendingReplyResult => ({ ok: false, error }));
    void runReplyFlow(requestId, failed.userMessageIndex, failed.userTurn, failed.messages, pending);
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
        {metalPrintEntry && messages.length <= 1 && (
          <aside className={styles.metalPrintEntryGuide} aria-label={lang === "ja" ? "メタルプリント相談の始め方" : "How to begin a metal-print consultation"}>
            <p>{lang === "ja" ? "PRIVATE SPACE CONSULTATION" : "PRIVATE SPACE CONSULTATION"}</p>
            <h2>
              {lang === "ja"
                ? campaignWork
                  ? `「${campaignWork}」が、その部屋に合うか一問で見立てます。`
                  : "その空間に合う一点を、一問で見立てます。"
                : campaignWork
                  ? `One question to see whether “${campaignWork}” belongs in your space.`
                  : "One question to choose a work for your space."}
            </h2>
            <small>
              {lang === "ja"
                ? "部屋の用途・光・残したい感情のうち、一つだけ教えてください。購入義務はなく、合わなければ勧めません。"
                : "Tell us just one thing: the room, its light, or the feeling you want to keep. There is no obligation to buy, and we will not recommend a poor fit."}
            </small>
          </aside>
        )}
        {officeArtEntry && !metalPrintEntry && messages.length <= 1 && (
          <aside className={styles.metalPrintEntryGuide} aria-label={lang === "ja" ? "法人オフィスアート導入相談の始め方" : "How to begin an office art consultation"}>
            <p>OFFICE ART CONSULTATION</p>
            <h2>
              {lang === "ja"
                ? "どの部屋に、どれくらいの壁か。そこから決めます。"
                : "Which room, and how much wall. We start there."}
            </h2>
            <small>
              {lang === "ja"
                ? "設置場所・壁幅・ご予算のいずれか一つからで結構です。スタンダードライン（A3〜A1・500mm角）は価格確定前のため、まず入荷のご案内先を承ります。経費計上や減価償却のご質問にも一般的な情報でお答えしますが、税務上の取扱いは必ず税理士にご確認ください。"
                : "Start with any one of these: the room, the wall width, or your budget. The standard line (A3–A1, 500mm square) is not yet priced, so we will first note where to send the release notice. We can share general information on expensing, but please confirm tax treatment with your own tax advisor."}
            </small>
          </aside>
        )}
        {!metalPrintEntry && !officeArtEntry && !musicWorkEntry && messages.length <= 1 && (
          <aside className={styles.chatIntro} aria-label={lang === "ja" ? "伯爵Chatの案内" : "About Count Chat"}>
            <p className={styles.chatIntroKicker}>MEET THE COUNT</p>
            <h2>{intro.title}</h2>
            <p>{intro.body}</p>
          </aside>
        )}
        {started && messages.length <= 1 && (
          <div className={styles.starterSection}>
            <div className={styles.starterHeading}>
              <p>{intro.prompt}</p>
              <span>{intro.promptHint}</span>
            </div>
            <div className={styles.promptRow} aria-label={intro.prompt}>
              {starters.map((s, starterIndex) => (
                <button
                  key={s}
                  className={styles.promptChip}
                  onClick={() => {
                    capture("salon_starter_click", { lang, timeTone, starterIndex, sourceIntent: metalPrintEntry ? "metal-print" : officeArtEntry ? "office-art" : "direct" });
                    sendText(s);
                  }}
                  disabled={sending}
                >
                  {s}
                </button>
              ))}
            </div>
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
                  {m.role === "user" && i === readReceiptMessageIndex && (
                    <span className={styles.readReceiptBadge}>
                      {ui.readButton}
                    </span>
                  )}
                  {m.role === "assistant" && i === lastAssistantIndex && !sending && (
                    <button className={styles.shareInline} onClick={() => { capture("salon_line_share", { lang }); void shareLine(m.content, ui, setToast); }}>
                      {ui.keepLine}
                    </button>
                  )}
                </div>
              </React.Fragment>
            );
          })}
          {replyPhase === "typing" && (
            <div className={styles.assistantBubble}>
              <p className={styles.bubbleRole}>{personaName("count", lang)}</p>
              <p className={styles.thinking} role="status" aria-label={ui.typingLabel}>
                <span /><span /><span />
                <span className={styles.thinkingText}>{ui.typingLabel}</span>
              </p>
            </div>
          )}
        </div>

        {cards.length > 0 && (
          <section className={styles.giftShell} aria-label={lang === "ja" ? "伯爵からの作品カード" : "Work cards from the Count"}>
            <div className={styles.giftHeader}>
              <p className={styles.giftWorkType}>{lang === "ja" ? "CATALOG RECOMMENDATION" : "CATALOG RECOMMENDATION"}</p>
              <h2 className={styles.giftTitle}>{lang === "ja" ? "いま、お渡しする作品" : "A work for this moment"}</h2>
            </div>
            {cards.map((work) => {
              const journey = getChatCardJourney(work.workId, lang);
              return (
              <article className={styles.giftCard} key={work.workId} data-work-id={work.workId}>
                <img className={styles.giftCover} src={work.cover} alt={work.title} loading="lazy" decoding="async" />
                <div className={styles.giftBody}>
                  {work.type && <p className={styles.giftWorkType}>{work.type}</p>}
                  <h3 className={styles.giftWorkTitle}>{work.title}</h3>
                  {work.reason && (
                    <p className={styles.giftReason}>
                      <span className={styles.giftReasonLabel}>{lang === "ja" ? "RECOMMENDATION REASON" : "RECOMMENDATION REASON"}</span>
                      {work.reason}
                    </p>
                  )}
                  {work.links.length > 0 && (
                    <div className={styles.linkRow}>
                      {work.links.map((link) => {
                        const colors = linkBg(link.kind, link.url);
                        return (
                          <a
                            key={`${work.workId}-${link.kind}-${link.url}`}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.linkButton}
                            style={{ background: colors.bg, color: colors.fg }}
                            onClick={() => capture("salon_work_action_click", { workId: work.workId, kind: link.kind, lang })}
                          >
                            {linkLabel(link.kind, ui, lang, link.url)}
                          </a>
                        );
                      })}
                    </div>
                  )}
                  <div className={styles.giftJourney} aria-label={lang === "ja" ? "作品をさらに楽しむ" : "Continue exploring this work"}>
                    <a className={styles.linkButton} href={journey.detailHref}>
                      {journey.detailLabel}
                    </a>
                    {journey.followUpPrompts.map((prompt) => (
                      <button key={prompt} type="button" className={styles.linkButton} disabled={sending || !started} onClick={() => sendText(prompt)}>
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
              );
            })}
          </section>
        )}

        {choices.length > 0 && (
          <div className={styles.linkRow} aria-label={lang === "ja" ? "会話の選択肢" : "Conversation choices"}>
            {choices.map((choice) => (
              <button key={choice} type="button" className={styles.linkButton} disabled={sending || !started} onClick={() => sendText(choice)}>
                {choice}
              </button>
            ))}
          </div>
        )}

        {/* 商材の案内ボタン（伯爵/公爵が処方したとき） */}
        {cta && (
          <a
            href={cta.href}
            target="_blank"
            rel="noreferrer"
            className={styles.commerceCta}
            onClick={() => capture("salon_cta_click", {
              productId: cta.productId ?? "unknown",
              lang,
              userTurn: messages.filter((message) => message.role === "user").length,
            })}
          >
            {cta.label} →
          </a>
        )}

        <div className={styles.inputRow}>
          <textarea
            ref={inputRef}
            className={styles.input}
            rows={1}
            aria-label={ui.inputPlaceholder}
            placeholder={metalPrintEntry
              ? lang === "ja"
                ? "例：夕方に西日が入る書斎です"
                : "Example: My study receives warm western light"
              : officeArtEntry
                ? lang === "ja"
                  ? "例：応接室の壁が幅2.4mです"
                  : "Example: Our meeting room wall is 2.4m wide"
                : ui.inputPlaceholder}
            onKeyDown={onKeyDown}
            onInput={autoGrow}
            disabled={sending || !started}
          />
          <button className={styles.sendButton} onClick={onSubmit} disabled={sending || !started}>
            {sending ? "…" : ui.sendLabel}
          </button>
        </div>

        <p className={styles.inputHint}>{ui.inputHint}</p>

        <div className={styles.memoryControl}>
          <label>
            <input
              type="checkbox"
              checked={rememberConversation}
              onChange={(event) => void toggleConversationMemory(event.target.checked)}
            />
            <span>
              {lang === "ja" ? "この端末の会話を記憶し、次回続きを話す" : "Remember this conversation on this device and continue next time"}
            </span>
          </label>
          <p>
            {lang === "ja"
              ? memoryStatus === "unavailable"
                ? "現在は保存できません。会話は続けられますが、この表示が消えるまで記憶済みとは扱いません。"
                : `同じブラウザで再訪すると続きから話せます。最終更新から90日間保存します。${historyRestored ? "前回の会話を復元しました。" : memoryStatus === "saving" ? "保存中です。" : memoryStatus === "saved" ? "保存しました。" : "いつでも停止・消去できます。"}`
              : memoryStatus === "unavailable"
                ? "Memory is currently unavailable. Chat can continue, but this conversation is not treated as saved yet."
                : `Return in the same browser to continue. Stored for 90 days after the last update. ${historyRestored ? "Your previous conversation was restored." : memoryStatus === "saving" ? "Saving…" : memoryStatus === "saved" ? "Saved." : "You can turn it off or delete it at any time."}`}
          </p>
          <button type="button" onClick={() => void forgetConversation()}>
            {lang === "ja" ? "記憶を消去して新しく始める" : "Delete memory and start over"}
          </button>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            <p>{timeCopy.error}</p>
            {lastFailedRequestRef.current && (
              <button type="button" onClick={retryLastReply} disabled={sending}>
                {lang === "ja" ? "もう一度送る" : "Try again"}
              </button>
            )}
            {!lastFailedRequestRef.current && messages.length === 0 && (
              <button type="button" onClick={() => void begin(lang, timeTone)} disabled={sending}>
                {lang === "ja" ? "案内を再読み込み" : "Reload the welcome"}
              </button>
            )}
          </div>
        )}

        {messages.length >= 3 && !emailDone && !musicWorkEntry && !metalPrintEntry && cta?.productId !== "vip-metal-print" && (
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

      {cta?.productId === "vip-metal-print" && metalCampaignEditionId && (
        <MetalPrintConsultationForm
          editionId={metalCampaignEditionId}
          workTitle={campaignWork}
          lang={lang}
          attribution={metalAttribution}
          onQualified={(qualified) => {
            capture("metal_consultation_submitted", { qualified, productId: "vip-metal-print", ...metalAttribution });
            recordMetalFunnelEvent("metal_consultation_submitted", metalAttribution);
          }}
        />
      )}

      {cta?.productId === "vip-metal-print" && !metalCampaignEditionId && (
        <section className={styles.metalEditionSelector} aria-label={lang === "ja" ? "相談する一点を選ぶ" : "Choose one work to discuss"}>
          <p className={styles.metalConsultationKicker}>CHOOSE ONE EDITION</p>
          <h3>{lang === "ja" ? "飾る空間から、一点だけ選んでください。" : "Choose one work by the space it will inhabit."}</h3>
          <div className={styles.metalEditionSelectorGrid}>
            {METAL_CAMPAIGN_OPTIONS.map((option) => (
              <button key={option.title} type="button" onClick={() => selectMetalEdition(option.title, option.space)}>
                <span>{lang === "ja" ? option.labelJa : option.labelEn}</span>
                <strong>{option.title}</strong>
              </button>
            ))}
          </div>
          <small>{lang === "ja" ? "選択後、その場で非公開相談へ進めます。購入義務はありません。" : "Your selection opens the private consultation here. No purchase obligation."}</small>
        </section>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </main>
  );
}
