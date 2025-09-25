// src/pages/api/chat-reco.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { buildCountEarlSystemPrompt } from "../../lib/persona";

import { groqChat } from "../../../lib/groq";
import { safeJSON } from "../../../lib/json";
import { loadAllWorksCached } from "../../../lib/works";
import { rateLimit } from "../../../lib/rate";
import { newTraceId } from "../../../lib/trace";
import { loadAllWorks, recommend, type RecoWork } from "../../lib/recommender";

export const config = { runtime: "nodejs" };

/* ===================== 入力バリデーション ===================== */
const Msg = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().max(4000),
});
const Body = z.object({
  mode: z.enum(["chat", "cards", "both"]).default("chat"),
  messages: z.array(Msg).max(30),
});

/* ===================== 型 ===================== */
type Link = { kind: string; url: string };
type RecoCard = {
  id: string;
  title: string;
  cover?: string;
  links: Link[];
  moodTags: string[];
  type?: "book" | "music" | string;
};

/* ===================== ユーティリティ ===================== */

// 直近の user メッセージから言語を推定（英/日）
function inferLang(messages: { role: string; content: string }[]): "en" | "ja" {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content?.trim() ?? "";
  const hasJa = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(lastUser);
  if (hasJa) return "ja";
  if (/[A-Za-z]/.test(lastUser)) return "en";
  return "en";
}
const lastUserText = (messages: { role: string; content: string }[]) =>
  [...messages].reverse().find((m) => m.role === "user")?.content?.trim() ?? "";

// RecoWork → RecoCard
function toCards(reco: RecoWork[], worksAll: any[]): RecoCard[] {
  return reco.map((r) => {
    const match = worksAll.find((w: any) => w.title === r.title);
    const url =
      (typeof match?.link === "string" ? match.link : match?.link?.url) ||
      (typeof (r as any)?.link === "string" ? (r as any).link : (r as any)?.link?.url) ||
      match?.href ||
      "";
    return {
      id: match ? String(match.id) : r.title,
      title: r.title,
      cover: (r as any).cover ?? match?.cover ?? "",
      links: url ? [{ kind: "url", url }] : Array.isArray(match?.links) ? match.links : [],
      moodTags: Array.isArray(match?.moodTags) ? match.moodTags : [],
      type: (r as any).type ?? match?.type,
    };
  });
}

/* ===== 言語判定（カード/ワーク単位）— Edition/文字種優先、ドメインは補助 ===== */
function titleLooksEnglish(t: string): boolean {
  const ascii = (t.match(/\p{ASCII}/gu) || []).length;
  const non = Math.max(1, t.length - ascii);
  return ascii / (ascii + non) > 0.85;
}
function hasEnglishEditionMark(t: string): boolean {
  // 追加: "eng. edition" 的な省略表記も拾う
  return /english\s*edition|\beng\.?\s*edition|\(english\)|（英語版）/i.test(t);
}

function detectItemLang(card: RecoCard): "ja" | "en" | "und" {
  const title = String(card?.title ?? "");
  if (/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(title)) return "ja";
  if (hasEnglishEditionMark(title) || titleLooksEnglish(title)) return "en";

  const url = card?.links?.[0]?.url ?? card?.cover ?? "";
  if (/amazon\.co\.jp|bookwalker\.jp|honto\.jp|kadokawa\.co\.jp/.test(url)) return "ja";
  if (/amazon\.com|goodreads\.com|penguinrandomhouse\.com|harpercollins\.com|macmillan\.com|bloomsbury\.com/i.test(url))
    return "en";

  return "und";
}
function detectWorkLang(w: any): "ja" | "en" | "und" {
  const t = String(w?.title ?? "");
  if (/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(t)) return "ja";
  if (hasEnglishEditionMark(t) || titleLooksEnglish(t)) return "en";
  const url = (typeof w?.link === "string" ? w?.link : w?.link?.url) ?? w?.href ?? "";
  if (/amazon\.co\.jp|bookwalker\.jp|honto\.jp|kadokawa\.co\.jp/.test(url)) return "ja";
  if (/amazon\.com|goodreads\.com|penguinrandomhouse\.com|harpercollins\.com|macmillan\.com|bloomsbury\.com/i.test(url))
    return "en";
  return "und";
}

// ユーザー言語優先にカードを粗ソート（ブックに重み）
function prioritizeByAudienceLanguage(cards: RecoCard[], userLang: "en" | "ja"): RecoCard[] {
  const rank = (c: RecoCard): number => {
    if (c.type !== "book") return 10;
    const l = detectItemLang(c);
    if (l === userLang) return 0;
    if (l === "und") return 1;
    return 2;
  };
  return [...cards].sort((a, b) => {
    const ra = rank(a),
      rb = rank(b);
    if (ra !== rb) return ra - rb;
    return 0;
  });
}

/* ===== “本1＋音楽2” の構成（言語優先）。本が無い場合は強制的に取りに行く ===== */
function composeOneBookTwoMusic(cards: RecoCard[], userLang: "en" | "ja"): RecoCard[] {
  const books = cards.filter((c) => c.type === "book");
  const musics = cards.filter((c) => c.type === "music");
  if (books.length === 0 || musics.length < 2) return cards;

  const book: RecoCard | undefined =
    books.find((b) => detectItemLang(b) === userLang) ||
    books.find((b) => detectItemLang(b) === "und") ||
    books[0];

  const chosenIds = new Set<string>(book ? [book.id] : []);
  const pickMusic = (arr: RecoCard[], n: number) => {
    const out: RecoCard[] = [];
    for (const c of arr) {
      if (!chosenIds.has(c.id)) {
        out.push(c);
        chosenIds.add(c.id);
      }
      if (out.length >= n) break;
    }
    return out;
  };

  const pickedMusics = pickMusic(musics, 2);
  if (!book || pickedMusics.length < 2) return cards;
  return [book, ...pickedMusics];
}

// 本を必ず1冊入れて最終3枚に整える（不足時は再レコメンドで補填）
async function ensureBookFirstThenTwoMusic(
  initial: RecoCard[],
  catalog: any[],
  worksAll: any[],
  moodTags: string[],
  seed: number,
  userLang: "en" | "ja"
): Promise<RecoCard[]> {
  let cards = [...initial];
  const hasBook = cards.some((c) => c.type === "book");
  const musics = cards.filter((c) => c.type === "music");

  if (!hasBook) {
    // 1) 本だけで再レコメンド（言語優先）
    const booksOnly = catalog.filter(
      (w) => w.type === "book" && (detectWorkLang(w) === userLang || detectWorkLang(w) === "und")
    );
    const recBooks = recommend(booksOnly.length ? booksOnly : catalog.filter((w) => w.type === "book"), moodTags, 8, seed + 1);
    const bookCards = toCards(recBooks, worksAll);
    const pick =
      bookCards.find((b) => detectItemLang(b) === userLang) ||
      bookCards.find((b) => detectItemLang(b) === "und") ||
      bookCards[0];
    if (pick) cards = [pick, ...musics];
  }

  // 音楽が足りなければ補充
  if (cards.filter((c) => c.type === "music").length < 2) {
    const chosenIds = new Set(cards.map((c) => c.id));
    const musicOnly = catalog.filter((w) => w.type === "music");
    const recMusic = recommend(musicOnly, moodTags, 12, seed + 2);
    const add = toCards(recMusic, worksAll)
      .filter((c) => c.type === "music" && !chosenIds.has(c.id))
      .slice(0, 2);
    cards = [...cards.filter((c) => c.type !== "music"), ...cards.filter((c) => c.type === "music"), ...add];
  }

  // 最終整形：book -> music -> music の順に3枚
  const book = cards.find((c) => c.type === "book");
  const music2 = cards.filter((c) => c.type === "music").slice(0, 2);
  if (book && music2.length >= 2) return [book, ...music2].slice(0, 3);

  // それでも不成立なら、元のカードを返す（保険）
  return cards.slice(0, 3);
}

/* ===== small talk safety gate（初期2Tでの創作・推薦を抑止） ===== */
function needsSmallTalkFallback(text: string): boolean {
  if (!text) return true;
  const t = text.trim();
  const hasQuotedTitle = /[『「][^』」]{2,}[』」]/.test(t) || /[“"][^”"]{2,}[”"]/.test(t);
  const hasUrl = /https?:\/\//i.test(t);
  const hasBullets = /(^|\n)\s*(?:\d+\.|[-・•])\s+/m.test(t);
  const hasManyTitles = /(『[^』]+』.*?){2,}/.test(t) || /(["“][^"”]+["”].*?){2,}/.test(t);
  const tooLong = t.length > 240;
  return hasQuotedTitle || hasUrl || hasBullets || hasManyTitles || tooLong;
}
function normalizeOrthography(text: string, lang: "en" | "ja"): string {
  if (lang === "ja") return String(text || "").replace(/こんばんわ/g, "こんばんは").trim();
  return String(text || "").trim();
}
function smallTalkFallback(userTurns: number, lang: "en" | "ja"): string {
  const ja = [
    "ようこそ。今はテンポは速めと緩やか、どちらがしっくり来ますかな？",
    "ご来館ありがとうございます。静けさと高揚感、今はどちらをお求めです？",
    "お疲れさまです。集中したい感じと、気分転換したい感じ、どちらが近いでしょう？",
  ];
  const en = [
    "Welcome. Are you in the mood for a faster or gentler tempo?",
    "Thanks for visiting. Are you leaning toward calmness or uplift right now?",
    "Glad you’re here. Would you like something for focus, or a refreshing change?",
  ];
  const arr = lang === "en" ? en : ja;
  return arr[userTurns % arr.length];
}
function ensureSmallTalkSafe(raw: string, userTurns: number, lang: "en" | "ja"): string {
  let out = normalizeOrthography(raw, lang);
  if (needsSmallTalkFallback(out)) out = smallTalkFallback(userTurns, lang);
  return out.replace(/\n{2,}/g, "\n").trim();
}

/* ===== ユーザー文からジャンル/ムード語を補完して moodTags を強化 ===== */
function enrichMoodTags(base: string[], userText: string, lang: "en" | "ja"): string[] {
  // 1) ベース正規化（lowercase＋トリム）＆不要タグ除去
  const block = new Set(["neutral", "genre", "", "unknown", "n/a"]);
  const norm = (s: string) => String(s || "").toLowerCase().trim();

  const set = new Set<string>();
  for (const s of (base || [])) {
    const v = norm(s);
    if (!block.has(v)) set.add(v);
  }

  // 2) テキスト抽出
  const raw = String(userText || "");
  const t = raw.toLowerCase();

  if (lang === "en") {
    if (/sci[-\s]?fi|science\s*fiction/.test(t)) set.add("sf");
    if (/mystery|detective|whodunnit/.test(t)) set.add("mystery");
    if (/fantasy/.test(t)) set.add("fantasy");
    if (/thriller|suspense/.test(t)) set.add("thriller");
    if (/romance|love\s*story/.test(t)) set.add("romance");
    if (/historical/.test(t)) set.add("historical");
    if (/jazz/.test(t)) set.add("jazz");
    if (/ambient|chill|serene|soothing|calm/.test(t)) set.add("calm");
    if (/uplift|upbeat|energetic|bright|high\s*energy/.test(t)) set.add("uplifting");
    if (/focus|study|work/.test(t)) set.add("focus");
    if (/night|midnight|late/.test(t)) set.add("night");
  } else {
    if (/ＳＦ|sf|エスエフ|サイエンスフィクション/i.test(raw)) set.add("sf");
    if (/ミステリ|推理/.test(raw)) set.add("mystery");
    if (/ファンタジ/.test(raw)) set.add("fantasy");
    if (/スリラー|サスペンス/.test(raw)) set.add("thriller");
    if (/恋愛|ラブ/.test(raw)) set.add("romance");
    if (/歴史|時代/.test(raw)) set.add("historical");
    if (/ジャズ/.test(raw)) set.add("jazz");
    if (/静|穏|落ち着/.test(raw)) set.add("calm");
    if (/高揚|前向き|明る|ハイエナジ/.test(raw)) set.add("uplifting");
    if (/読書|夜/.test(raw)) set.add("night");
  }

  // 3) 念のための不要タグ掃除（保険）
  for (const v of Array.from(set)) {
    if (block.has(v)) set.delete(v);
  }

  // 4) 空なら calm を最低付与
  if (set.size === 0) set.add("calm");

  // 5) 最大5件に制限
  return Array.from(set).slice(0, 5);
}

/* ===== chat用ガイダンス（世界観＋ジャンル/ムードの一問） ===== */
function buildChatGuidance(lang: "en" | "ja", userTurns: number): string {
  if (userTurns < 3) {
    if (lang === "en") {
      return [
        "You are the Count, MUSIAM’s courteous guide. Elegant yet modern.",
        "First two user turns:",
        "- Keep replies to 1–2 short sentences in English.",
        "- No titles, links, lists, or recommendations yet.",
        "- Brief empathy, then exactly ONE concrete question.",
        "- Prefer this angle for the question: “Would you like to start with a genre (e.g., SF/mystery) or a mood (calm/uplifting)?”",
        "- Avoid archaic address terms.",
      ].join("\n");
    }
    return [
      "あなたは伯爵MUSIAMの案内役「伯爵」。品よく現代的に。",
      "最初の2ターン：",
      "・1〜2文だけ。作品名・URL・箇条書き・推薦は出さない。",
      "・一言で共感 → “具体的一問”を1つだけ。",
      "・質問は「ジャンル（例：SF/ミステリ）と気分（静けさ/高揚感）、どちらを優先しますか？」を優先。",
      "・古風な呼称は避ける。",
    ].join("\n");
  }
  return lang === "en"
    ? "Stay concise and warm. Name works only when appropriate."
    : "簡潔で温かく。必要なときだけ作品名に触れる。";
}

/* ===== both 用の人格プロンプト（世界観・ミラーリング・ジャンルの軽い言及） ===== */
function buildRecoPersonaPrompt(
  recMeta: { moodTags: string[]; cards: RecoCard[] },
  lang: "en" | "ja"
): string {
  const titlesInOrder = recMeta.cards.map((c) => c.title);
  const typeLabels = recMeta.cards.map((c) => c.type ?? "work");

  if (lang === "ja") {
    return [
      "あなたは伯爵MUSIAMの案内役「伯爵」です。上品で知的、しかし現代的で押しつけがましくない文体で。",
      "必ず次の3作品【のみ】に言及し、順序（本→音楽→音楽）を厳守。捏造・言い換え・URL・箇条書きは禁止。",
      `順序: ${titlesInOrder.map((t, i) => `【${i + 1}=${t}（${typeLabels[i]}）】`).join(" ")}`,
      "3〜5文で：①短い導入（ユーザーのキーワードを一度だけ“引用”して鏡映）、②〜④で各作品を順に1文ずつ上品に紹介。",
      "比喩（部屋/扉/回廊など）は1文に1つまで。本については可能ならジャンルを一語だけ触れてよい（例：SF/ミステリなど）。",
      "最後は10語以内の短い誘い（例：どの扉から参りましょう？）。",
      "出力は日本語のみ。",
    ].join("\n");
  }

  return [
    "You are the Count, MUSIAM’s courteous guide—polished and modern.",
    "Refer ONLY to the three works below, in this exact order (book → music → music). No invention, no renaming, no URLs or bullet points.",
    `Order: ${titlesInOrder.map((t, i) => `[${i + 1}=${t} (${typeLabels[i]})]`).join(" ")}`,
    "Write 3–5 natural sentences: (1) compact opener that mirrors the user’s key phrase once; (2–4) one elegant sentence for each work in order.",
    "Use room/door/hall imagery sparingly (≤1 per sentence). For the book, you may mention a single genre word if it’s clearly implied (e.g., SF, mystery).",
    "End with one short invitation (≤10 words), e.g., “Which door shall we open?”. Output language: English only.",
  ].join("\n");
}

/* ===================== APIエントリ ===================== */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const started = Date.now();
  const trace = newTraceId();

  try {
    /* --- レート制限 --- */
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";
    if (!rateLimit(ip).ok) {
      return res.status(429).json({ ok: false, v: 1, error: "rate_limited", trace });
    }

    /* --- 入力バリデーション --- */
    const parsed = Body.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        v: 1,
        error: "bad_request",
        issues: parsed.error.issues,
        trace,
      });
    }
    const { mode: modeFromClient, messages } = parsed.data;

    /* --- 言語判定 --- */
    const lang: "en" | "ja" = inferLang(messages);
    const langDirective =
      lang === "en" ? "Respond strictly in English. Keep it concise and polite." : "出力言語は日本語（丁寧語）。";

    /* --- 実効モード（初期2Tは強制 chat） --- */
    const userTurns = messages.filter((m) => m.role === "user").length;
    const mode: "chat" | "cards" | "both" = userTurns < 3 ? "chat" : modeFromClient;

    /* --- 推薦シード（trace 由来で安定） --- */
    const seed = parseInt((trace || "0").slice(-6), 36) % 100000;

    /* ========== BOTH（本文＋カード） ========== */
    if (mode === "both") {
      // 1) moodTags（JSON限定）→ 直近ユーザー文で補完
      const langHeaderForJSON =
        lang === "ja"
          ? "【重要】次の応答はJSONのみ（日本語禁止）。JSON以外の文字列は出力しない。"
          : "IMPORTANT: Return ONLY JSON. No prose. English-only keys/values.";
      const sysTags = {
        role: "system" as const,
        content: [langHeaderForJSON, `Return ONLY valid JSON: {"moodTags": string[] (max 5, lowercase, no emojis)}`].join(
          "\n"
        ),
      };
      const jsonText = await groqChat([sysTags, ...messages]);
      let { moodTags = [] } = safeJSON<{ moodTags?: string[] }>(jsonText, { moodTags: [] });
      moodTags = enrichMoodTags(moodTags, lastUserText(messages), lang);

      // 2) カード計算（まず多めに拾ってから本1＋音楽2を保証）
      const catalog = loadAllWorks();
      const worksAll = await loadAllWorksCached();

      const recos = recommend(catalog, moodTags, 36, seed);
      let cards = toCards(recos, worksAll);
      cards = prioritizeByAudienceLanguage(cards, lang);

      // 救済発動の観測は compose 前の cards で判定
      const hasBookInitially = cards.some((c) => c.type === "book");

      // compose → ensureBookFirstThenTwoMusic（再宣言しない）
      let composed = composeOneBookTwoMusic(cards, lang);
      composed = await ensureBookFirstThenTwoMusic(composed, catalog, worksAll, moodTags, seed, lang);

      // 3) 本文生成（世界観＋ミラーリング）
      const personaPrompt = buildRecoPersonaPrompt({ moodTags, cards: composed }, lang);
      const langHeader =
        lang === "ja"
          ? "【厳守】以後の出力は必ず日本語。英語は用いない。"
          : "【STRICT】From now on, respond ONLY in English. Do not use Japanese.";
      const sysPersonaReco = {
        role: "system" as const,
        content: [langDirective, langHeader, personaPrompt].join("\n"),
      };
      const text = await groqChat([sysPersonaReco, ...messages]);

      // 観測ヘッダ
      const first = composed[0];
      const bookLang = first?.type === "book" ? detectItemLang(first) : "und";
      res.setHeader("X-Book-Lang", String(bookLang));
      res.setHeader("X-Fallback-Book", hasBookInitially ? "0" : "1");

      res.setHeader("X-Trace-Id", trace);
      res.setHeader("X-Latency", String(Date.now() - started));
      res.setHeader("X-Seed", String(seed));
      return res.status(200).json({ ok: true, v: 1, mode: "both", text, moodTags, cards: composed, trace });
    }

    /* ========== CARDS のみ ========== */
    if (mode === "cards") {
      const langHeaderForJSON =
        lang === "ja"
          ? "【重要】次の応答はJSONのみ（日本語禁止）。JSON以外の文字列は出力しない。"
          : "IMPORTANT: Return ONLY JSON. No prose. English-only keys/values.";
      const sys = {
        role: "system" as const,
        content: [langHeaderForJSON, `Return ONLY valid JSON: {"moodTags": string[] (max 5, lowercase, no emojis)}`].join(
          "\n"
        ),
      };
      const jsonText = await groqChat([sys, ...messages]);
      let { moodTags = [] } = safeJSON<{ moodTags?: string[] }>(jsonText, { moodTags: [] });
      moodTags = enrichMoodTags(moodTags, lastUserText(messages), lang);

      const catalog = loadAllWorks();
      const worksAll = await loadAllWorksCached();

      const recos = recommend(catalog, moodTags, 36, seed);
      let cards = toCards(recos, worksAll);
      cards = prioritizeByAudienceLanguage(cards, lang);
      let composed = composeOneBookTwoMusic(cards, lang);
      composed = await ensureBookFirstThenTwoMusic(composed, catalog, worksAll, moodTags, seed, lang);

      res.setHeader("X-Trace-Id", trace);
      res.setHeader("X-Latency", String(Date.now() - started));
      res.setHeader("X-Seed", String(seed));
      return res.status(200).json({ ok: true, v: 1, mode: "cards", moodTags, cards: composed, trace });
    }

    /* ========== CHAT のみ ========== */
    {
      let snapshot: Array<{ title: string; type?: string; href?: string }> = [];
      try {
        const worksAll = await loadAllWorksCached();
        snapshot = worksAll.slice(0, 10).map((w: any) => ({
          title: w.title,
          type: w.type,
          href: (typeof w.link === "string" ? w.link : w.link?.url) ?? w.href ?? "",
        }));
      } catch {
        snapshot = [];
      }

      const guidance = buildChatGuidance(lang, userTurns);
      const langHeader =
        lang === "ja" ? "【厳守】以後の出力は必ず日本語。英語は用いない。" : "【STRICT】From now on, respond ONLY in English. Do not use Japanese.";

      const sys = {
        role: "system" as const,
        content: [buildCountEarlSystemPrompt({ worksSnapshot: snapshot }), langHeader, guidance].join("\n"),
      };

      const raw = await groqChat([sys, ...messages]);
      const text = ensureSmallTalkSafe(raw, userTurns, lang);

      res.setHeader("X-Trace-Id", trace);
      res.setHeader("X-Latency", String(Date.now() - started));
      return res.status(200).json({ ok: true, v: 1, mode: "chat", text, trace });
    }
  } catch (e: any) {
    res.setHeader("X-Trace-Id", trace);
    res.setHeader("X-Latency", String(Date.now() - started));
    return res.status(500).json({ ok: false, v: 1, error: e?.message ?? "failed", trace });
  }
}
