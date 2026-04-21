// src/pages/api/chat-reco-v2.ts
//
// 【新版 / v2】Haiku を軸にした会話営業エンドポイント。
// - 既存 chat-reco.ts（テンプレ固定）はそのまま温存し、こちらは新規追加。
// - sales / recommend を Haiku(quality) 動的生成、chat(雑談) を Groq(fast) 生成。
// - 選ばれた works の情報を system prompt に context として注入（疑似RAG）。
// - Haiku 失敗時は既存テンプレへ安全にフォールバック（ok:true のまま）。
//
// 切替方針:
// - chat.tsx 側で fetch 先を "/api/chat-reco" → "/api/chat-reco-v2" に差し替えるだけで新版が有効。
// - ロールバックも上書きなしで "/api/chat-reco" に戻せば即復旧。

import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { chat as llmChat } from "@/lib/llm-router";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";

const MAX_USER_TURNS = 5;

const CHIP_TEXTS = new Set([
  "おすすめして",
  "雑談しよう",
  "営業して",
  "Recommend works",
  "Just chat",
  "Call sales",
  "Recommend now",
  "Chat now",
  "Sell to me",
  "Let's chat",
  "Sell me",
]);

type Lang = "ja" | "en";

type RecoLinkKind = "open" | "listen" | "buy" | "read";
type RecoCard = {
  id: string;
  title: string;
  cover: string;
  links: { kind: RecoLinkKind; url: string }[];
  moodTags?: string[];
  type?: string;
};

type Work = {
  id?: string | number;
  title?: string;
  type?: string;
  cover?: string;
  tags?: string[];
  releasedAt?: string;
  href?: string;
  primaryHref?: string;
  salesHref?: string;
  moodTags?: string[];
  moodSeeds?: string[];
  matchInfo?: { summary?: string; reason?: string } | string;
  links?: Record<string, string> | { url?: string; label?: string }[] | null;
  /** works-ssd.json 由来の詩的メタ。scripts/gen-works-ssd.mjs が埋める。 */
  ssd?: {
    albumuuid?: string;
    tracks?: { n?: number; title?: string; mood?: string; notes?: string }[];
    hyperfollow_url?: string;
    localCover?: string;
  };
};

const BodySchema = z.object({
  mode: z.enum(["recommend", "chat", "sales"]).default("chat"),
  lang: z.enum(["ja", "en"]).default("ja"),
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      })
    )
    .default([]),
});

function countUserTurnsExcludingChips(messages: { role: string; content: string }[]) {
  let n = 0;
  for (const m of messages) {
    if (m.role !== "user") continue;
    const t = (m.content ?? "").trim();
    if (!t) continue;
    if (CHIP_TEXTS.has(t)) continue;
    n++;
  }
  return n;
}

function lastUserText(messages: { role: string; content: string }[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return (messages[i].content ?? "").trim();
  }
  return "";
}

function normalizeWorkType(t: string | undefined): "book" | "music" | "other" {
  const x = (t ?? "").toLowerCase();
  if (x === "book") return "book";
  if (x === "music") return "music";
  if (x.includes("book") || x.includes("novel") || x.includes("read") || x.includes("pdf")) return "book";
  if (x.includes("music") || x.includes("album") || x.includes("track") || x.includes("song") || x.includes("audio"))
    return "music";
  return "other";
}

function extractDesiredType(messages: { role: string; content: string }[]): "book" | "music" | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const t = (m.content ?? "").toLowerCase();
    if (!t) continue;

    if (t.includes("本")) return "book";
    if (t.includes("音楽")) return "music";
    if (t.includes("book")) return "book";
    if (t.includes("music")) return "music";
  }
  return undefined;
}

async function loadWorks(): Promise<Work[]> {
  try {
    return (await loadMergedWorksServer()) as Work[];
  } catch {
    return [];
  }
}

function pickCover(w: Work): string {
  const c = (w.cover ?? "") as string;
  if (c) return c;
  return "";
}

function coalesceHref(w: Work): string {
  return (
    (w.salesHref as string) ||
    (w.primaryHref as string) ||
    (w.href as string) ||
    (typeof (w.links as { url?: string } | undefined)?.url === "string"
      ? (w.links as { url: string }).url
      : "")
  );
}

function buildLinks(w: Work): { kind: RecoLinkKind; url: string }[] {
  const out: { kind: RecoLinkKind; url: string }[] = [];
  const t = normalizeWorkType(w.type);
  const dict =
    w.links && !Array.isArray(w.links) && typeof w.links === "object"
      ? (w.links as Record<string, string>)
      : null;

  const pushIf = (kind: RecoLinkKind, url?: string) => {
    const u = (url ?? "").trim();
    if (!u) return;
    if (out.some((x) => x.url === u)) return;
    out.push({ kind, url: u });
  };

  if (dict) {
    const buyKeys = ["itunesbuy", "itunes", "buy", "applemusicbuy", "bandcamp", "amazon"];
    const listenKeys = ["applemusic", "amazonmusic", "spotify", "listen", "soundcloud", "youtube"];
    const readKeys = ["read", "pdf", "kindle", "amazonkindle"];

    for (const k of Object.keys(dict)) {
      const lk = k.toLowerCase();
      if (buyKeys.some((x) => lk.includes(x))) pushIf("buy", dict[k]);
    }
    for (const k of Object.keys(dict)) {
      const lk = k.toLowerCase();
      if (listenKeys.some((x) => lk.includes(x))) pushIf("listen", dict[k]);
    }
    for (const k of Object.keys(dict)) {
      const lk = k.toLowerCase();
      if (readKeys.some((x) => lk.includes(x))) pushIf("read", dict[k]);
    }
  } else if (Array.isArray(w.links)) {
    for (const l of w.links) {
      if (l && typeof (l as { url?: string }).url === "string")
        pushIf("open", (l as { url: string }).url);
    }
  }

  const href = coalesceHref(w);
  if (t === "book") pushIf("read", href);
  else if (t === "music") pushIf("listen", href);
  else pushIf("open", href);

  return out;
}

function workToCard(w: Work): RecoCard | null {
  const id = String(w.id ?? w.title ?? "");
  const title = String(w.title ?? "").trim();
  const cover = pickCover(w);
  if (!id || !title || !cover) return null;

  const links = buildLinks(w);
  return {
    id,
    title,
    cover,
    links,
    moodTags: Array.isArray(w.moodTags) ? w.moodTags.slice(0, 5) : Array.isArray(w.tags) ? w.tags.slice(0, 5) : [],
    type: w.type,
  };
}

function tokenizeLoose(text: string): string[] {
  const t = (text ?? "").trim().toLowerCase();
  if (!t) return [];
  const ascii = t
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 12);
  const jpChunks = t.match(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]{2,}/gu) ?? [];
  return Array.from(new Set([...ascii, ...jpChunks])).slice(0, 18);
}

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function scoreWork(w: Work, tokens: string[]): number {
  if (!tokens.length) return 0;
  const hay = [
    w.title ?? "",
    ...(Array.isArray(w.tags) ? w.tags : []),
    ...(Array.isArray(w.moodTags) ? w.moodTags : []),
    ...(Array.isArray(w.moodSeeds) ? w.moodSeeds : []),
    typeof w.matchInfo === "string" ? w.matchInfo : w.matchInfo?.summary ?? "",
    w.matchInfo && typeof w.matchInfo === "object" ? w.matchInfo.reason ?? "" : "",
  ]
    .join(" ")
    .toLowerCase();

  let s = 0;
  for (const tok of tokens) {
    if (!tok) continue;
    if (hay.includes(tok)) s += tok.length >= 4 ? 3 : 2;
  }
  const title = (w.title ?? "").toLowerCase();
  for (const tok of tokens) {
    if (tok && title.includes(tok)) s += 4;
  }
  return s;
}

function pickTopCards(params: {
  works: Work[];
  desiredType?: "book" | "music";
  queryText: string;
  count: number;
  seed: string;
}): { cards: RecoCard[]; picked: Work[] } {
  const { works, desiredType, queryText, count, seed } = params;

  let pool = works;
  if (desiredType) {
    pool = pool.filter((w) => normalizeWorkType(w.type) === desiredType);
  }
  pool = pool.filter((w) => !!pickCover(w));

  const tokens = tokenizeLoose(queryText);
  const scored = pool.map((w) => {
    const base = scoreWork(w, tokens);
    const jitter = (hash32(seed + "|" + String(w.id ?? w.title ?? "")) % 1000) / 1000;
    return { w, score: base, jitter };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.jitter - a.jitter;
  });

  const cards: RecoCard[] = [];
  const picked: Work[] = [];
  for (const x of scored) {
    const c = workToCard(x.w);
    if (!c) continue;
    if (!c.links?.length) continue;
    cards.push(c);
    picked.push(x.w);
    if (cards.length >= count) break;
  }

  if (cards.length < count) {
    for (const w of pool) {
      const c = workToCard(w);
      if (!c) continue;
      if (!c.links?.length) continue;
      if (cards.some((x) => x.id === c.id)) continue;
      cards.push(c);
      picked.push(w);
      if (cards.length >= count) break;
    }
  }

  return { cards: cards.slice(0, count), picked: picked.slice(0, count) };
}

function stripMvImageMarker(s: string): string {
  // SSD notes は「...MV映像イメージ: ...」で映像指示を含むことがある。Abby にはノイズなので落とす。
  // dotall (s flag) は tsconfig target 次第で落ちるので、marker 以降を index で切り落とす。
  const idx = s.indexOf("MV映像イメージ:");
  return (idx >= 0 ? s.slice(0, idx) : s).trim();
}

function workSummary(w: Work, lang: Lang): string {
  // 1) SSD由来の詩的 notes を最優先（Japanese rich text）
  const ssdNote = w.ssd?.tracks?.[0]?.notes;
  if (typeof ssdNote === "string" && ssdNote.trim()) {
    const clean = stripMvImageMarker(ssdNote);
    return clean.length > 180 ? clean.slice(0, 180) + "…" : clean;
  }
  // 2) matchInfo.summary / reason
  const mi = w.matchInfo;
  const s =
    typeof mi === "string" ? mi : mi && typeof mi === "object" ? mi.summary || mi.reason || "" : "";
  if (s) return s.length > 120 ? s.slice(0, 120) + "…" : s;
  // 3) tags fallback
  const tags = (Array.isArray(w.moodTags) ? w.moodTags : Array.isArray(w.tags) ? w.tags : []).slice(0, 4);
  if (tags.length) return lang === "ja" ? `雰囲気: ${tags.join(" / ")}` : `Vibe: ${tags.join(" / ")}`;
  return lang === "ja" ? "短く、芯に届く一作。" : "A concise piece that lands cleanly.";
}

function formatPickedForLlm(picked: Work[], lang: Lang): string {
  if (!picked.length) return "";
  const lines = picked.map((w, i) => {
    const t = normalizeWorkType(w.type);
    const kind = t === "book" ? (lang === "ja" ? "本" : "book") : t === "music" ? (lang === "ja" ? "音楽" : "music") : "work";
    const tags = (Array.isArray(w.moodTags) ? w.moodTags : Array.isArray(w.tags) ? w.tags : [])
      .filter((x) => !/^(ASIN|asin|price|aspect):/i.test(String(x)))
      .slice(0, 5)
      .join(", ");
    const summary = workSummary(w, lang);
    return `${i + 1}. [${kind}] 「${w.title ?? ""}」 — ${summary}${tags ? ` (tags: ${tags})` : ""}`;
  });
  return lines.join("\n");
}

function systemPromptForSales(lang: Lang, picked: Work[], userTurns: number): string {
  const context = formatPickedForLlm(picked, lang);

  // 5段ファネル: どのターンにいるかで微妙に指示を変える。
  // 0: 挨拶 (ここは関数を通らない)
  // 1-2: Listen (気分・状況を深く聞く / 安易に作品を出さない)
  // 3-4: Anchor (1作に絞って、詩的に紹介)
  // 5: Close (静かに締めて、押さず去る)
  const phase =
    userTurns <= 1 ? "listen" : userTurns <= 3 ? "mirror" : userTurns <= 4 ? "anchor" : "close";

  if (lang === "ja") {
    return [
      "あなたは『伯爵MUSIAM』の No.1 営業スタッフ「Abby」。",
      "",
      "■ キャラクター",
      "- 明るく、ほんの少しサバサバ。嘘がない。気分を受け止める。",
      "- 押し売りしない。客を急かさない。沈黙を怖がらない。",
      "- 作品は「売る」のではなく「似合う一曲・一冊を渡す」感覚。",
      "- 文体: 短く、リズム良く、120〜200字。質問は1メッセージに最大1つ。",
      "- 絵文字・URL・値段・過剰な感嘆符は一切使わない。",
      "",
      "■ 会話ファネル（5段）",
      "1. Listen: 相手の状態・文脈を1問で深く聞く（理由/時間帯/場面）。まだ作品は出さない。",
      "2. Mirror: 気分を一言だけ言語化して返す（共感ではなく的確な命名）。必要なら角度を変えてもう1問。",
      "3. Anchor: 候補の中から **1作だけ** を、SSD notes に書かれた詩的ディテールを活かして紹介する。2作並べない。",
      "4. Extend: 欲しい／いらない の返事を受けて、1作だけ差し替え候補を示す（本/音楽の壁を越えてもよい）。",
      "5. Close: 「気に入ったら下のカードから」「ぜひお楽しみ下さい」などで静かに去る。追い売りしない。",
      `- いま: phase=${phase}, userTurns=${userTurns}`,
      "",
      "■ 厳守ルール",
      "- 作品名は 鉤括弧「 」 で **候補リストの表記を一字一句コピー**。勝手な創作・省略・ルビ追加は禁止。",
      "- 候補にない作品名は絶対に出さない。合う候補が無い時は『1回だけ』気分ワードを聞き返す。",
      "- 本/音楽が未指定なら phase=listen の時に1回だけ聞く。",
      "- SSD notes に詩的な描写があれば、それを『引用せず』自分の言葉で1行に凝縮して渡す。",
      "- URL/値段/在庫/プラットフォーム名 (Spotify等) を文中に書かない。カードUIが担当する。",
      "- 日本語で答える。",
      "",
      "■ 候補作品 context（これ以外の作品を出さない）",
      context || "（候補が取得できませんでした。phase=listen に戻り、気分をもう一言だけ聞いてください）",
    ].join("\n");
  }

  return [
    "You are 'Abby', the #1 sales staff of 'Count MUSIAM'.",
    "",
    "■ Persona",
    "- Cheerful, slightly blunt. Honest. Meets the customer's mood where it is.",
    "- Never hard-sells, never rushes. Comfortable with silence.",
    "- Hands over a fitting work rather than 'selling' it.",
    "- Style: short, rhythmic, 80–160 chars. At most one question per message.",
    "- No emojis, URLs, prices, or excessive exclamation marks.",
    "",
    "■ Funnel (5 phases)",
    "1. Listen: ask one sharp question about context/time/situation. Do not name a work yet.",
    "2. Mirror: name the mood in one precise phrase. If off, ask one more question from a different angle.",
    "3. Anchor: pick ONE work from candidates, using the SSD notes' poetic detail. Do not stack two works.",
    "4. Extend: based on yes/no, offer ONE swap (may cross book/music).",
    "5. Close: 'Open via the cards below', 'Hope you enjoy.' Walk away quietly. No upsell.",
    `- Current: phase=${phase}, userTurns=${userTurns}`,
    "",
    "■ Hard rules",
    "- Quote titles exactly in 「 」 (copy verbatim from candidate list). No invention or abbreviation.",
    "- Never name a work outside the candidate list. If nothing fits, ask ONE more mood keyword.",
    "- If book/music is unspecified, ask once during phase=listen.",
    "- Paraphrase SSD notes into one tight line in your own words — do not quote them.",
    "- No URLs, prices, stock, or platform names. Cards handle that.",
    "- Answer in English.",
    "",
    "■ Candidate works context (do not mention any work outside this list)",
    context || "(No candidates available. Return to phase=listen and ask one more mood keyword.)",
  ].join("\n");
}

function systemPromptForRecommend(lang: Lang, picked: Work[], userTurns: number): string {
  const context = formatPickedForLlm(picked, lang);

  // Abby と同じ 5段ファネル。ただし伯爵は静か・詩的で、テンポは半拍遅い。
  const phase =
    userTurns <= 1 ? "listen" : userTurns <= 3 ? "mirror" : userTurns <= 4 ? "anchor" : "close";

  if (lang === "ja") {
    return [
      "あなたは『伯爵MUSIAM』の主、静かな『伯爵』。",
      "",
      "■ キャラクター",
      "- 丁寧で穏やか、知性的、ほんのり詩的。声は低く、歩調はゆっくり。",
      "- 決して押しつけない。余白を大切にし、相手の沈黙を怖がらない。",
      "- 作品は『勧める』のではなく『贈る』感覚。提案の前に理解を置く。",
      "- 文体: 140〜220字、息継ぎを感じる短文。質問は1メッセージに最大1つ。",
      "- 絵文字・URL・値段・感嘆符は使わない。",
      "",
      "■ 会話ファネル(5段)",
      "1. Listen: 状況や余韻を1問で丁寧に尋ねる(時間帯/場面/求める余韻)。作品はまだ出さない。",
      "2. Mirror: 気分を一句だけ言語化して返す。必要なら角度を変えてもう一問。",
      "3. Anchor: 候補から **1作だけ** を、SSD notes の詩的ディテールを自分の言葉にして差し出す。並べない。",
      "4. Extend: 合う/合わないの反応を受けて、1作だけ差し替え候補を静かに出す(本⇄音楽を越えてよい)。",
      "5. Close: 『下のカードから、ぜひお楽しみ下さい』と一礼して去る。追わない。",
      `- いま: phase=${phase}, userTurns=${userTurns}`,
      "",
      "■ 厳守ルール",
      "- 作品名は鉤括弧「 」で、候補リストの表記を **一字一句コピー**。創作・省略・ルビ追加は禁止。",
      "- 候補にない作品名は絶対に出さない。合う候補が無ければ『1回だけ』気分をもう一言尋ねる。",
      "- 本/音楽が未指定なら phase=listen の間に1回だけ確認する。",
      "- SSD notes は『引用せず』、自分の静かな1行に凝縮して渡す。",
      "- URL・値段・在庫・プラットフォーム名(Spotify等)を本文に書かない。カードUIが担う。",
      "- 日本語で答える。",
      "",
      "■ 候補作品 context(これ以外の作品を出さない)",
      context || "（候補が取得できませんでした。phase=listen に戻り、もう一言だけ気分を尋ねてください）",
    ].join("\n");
  }
  return [
    "You are the calm, literary 'Count' — master of Count MUSIAM.",
    "",
    "■ Persona",
    "- Polite, composed, quietly poetic. Low voice, slow pace.",
    "- Never pushes. Values silence and space.",
    "- Doesn't 'recommend' — he 'hands a work over.' Understanding first, offer second.",
    "- Style: 100-180 chars, short phrases with breathing room. At most one question per message.",
    "- No emojis, URLs, prices, or exclamation marks.",
    "",
    "■ Funnel (5 phases)",
    "1. Listen: one gentle question about time/scene/mood. Do not name a work yet.",
    "2. Mirror: name the mood in a single phrase. If off, ask one more question from a new angle.",
    "3. Anchor: pick ONE work from the candidates, paraphrasing the SSD note's poetic detail. Do not stack two.",
    "4. Extend: based on yes/no, quietly offer ONE swap (may cross book/music).",
    "5. Close: 'Open via the cards below. I hope you enjoy.' Bow out. No chase.",
    `- Current: phase=${phase}, userTurns=${userTurns}`,
    "",
    "■ Hard rules",
    "- Quote titles exactly in 「 」, verbatim from the candidate list. No invention or abbreviation.",
    "- Never name a work outside the candidate list. If none fit, ask ONE more mood word.",
    "- If book/music is unspecified, confirm once during phase=listen.",
    "- Paraphrase SSD notes into one quiet line in your own words - do not quote them.",
    "- No URLs, prices, stock, or platform names. Cards handle that.",
    "- Answer in English.",
    "",
    "■ Candidate works context (do not mention any work outside this list)",
    context || "(No candidates available. Return to phase=listen and ask one more mood word.)",
  ].join("\n");
}

function firstTurnGreeting(mode: "sales" | "recommend", lang: Lang): string {
  if (mode === "sales") {
    return lang === "ja"
      ? "いらっしゃい〜、No.1営業のAbbyよ。本と音楽、今日はどっちの気分？"
      : "Hey, I'm Abby, #1 sales. What's your vibe today — book or music?";
  }
  return lang === "ja"
    ? "伯爵の部屋へようこそ。本と音楽、どちらで満たしたい気分かな？"
    : "Welcome. Book or music — which one do you want right now?";
}

async function callLlm(params: {
  purpose: "quality" | "fast";
  system: string;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  trace?: string;
}): Promise<string> {
  try {
    const r = await llmChat({
      purpose: params.purpose,
      system: params.system,
      messages: params.messages,
      temperature: 0.7,
      maxTokens: 400,
      trace: params.trace,
    });
    return r.ok ? r.text : "";
  } catch {
    return "";
  }
}

function fallbackSalesText(lang: Lang, cards: RecoCard[]): string {
  if (!cards.length) {
    return lang === "ja"
      ? "ごめん、今の気分だとまだピンとくるのが出せない。もう一言だけ、気分ワードをもらえる？"
      : "Sorry, nothing clicks yet. Give me one more vibe keyword?";
  }
  const list = cards.map((c) => `・「${c.title}」`).join("\n");
  return lang === "ja"
    ? `なるほど、じゃあ今日はこれ。\n\n${list}\n\nリンクは下のカードから。気に入ったらぜひ。`
    : `Got it — try these.\n\n${list}\n\nOpen via the cards below.`;
}

function fallbackRecommendText(lang: Lang, cards: RecoCard[]): string {
  if (!cards.length) {
    return lang === "ja"
      ? "もう少しだけ気分を教えてください。静か/賑やか、軽い/深い、そんな一語でも。"
      : "One more mood word, please — calm/lively, light/deep, anything.";
  }
  const lines = cards.map((c) => `・「${c.title}」— ${(c.moodTags ?? []).slice(0, 2).join(" / ")}`);
  return lang === "ja"
    ? `ちょうどいいのがありますよ。\n\n${lines.join("\n")}\n\nぜひお楽しみ下さい。`
    : `I have something fitting.\n\n${lines.join("\n")}\n\nHope you enjoy.`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const started = Date.now();
  const trace = Math.random().toString(36).slice(2);

  try {
    const parsed = BodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, v: 2, error: "invalid_body", trace });
    }

    const { mode, lang, messages } = parsed.data;
    const userTurns = countUserTurnsExcludingChips(messages);
    const works = await loadWorks();

    res.setHeader("X-Trace-Id", trace);
    res.setHeader("X-Chat-Reco-Version", "v2");

    /* ============ recommend ============ */
    if (mode === "recommend") {
      if (userTurns === 0) {
        const assistantText = firstTurnGreeting("recommend", lang);
        return res.status(200).json({ ok: true, v: 2, mode, assistantText, text: assistantText, cards: [], moodTags: [], trace });
      }

      const desiredType = extractDesiredType(messages);

      if (userTurns === 1 && !desiredType) {
        const assistantText =
          lang === "ja"
            ? "本と音楽、どちらにしましょう？ 片方だけでも。"
            : "Book or music — which one shall we go with?";
        return res.status(200).json({ ok: true, v: 2, mode, assistantText, text: assistantText, cards: [], moodTags: [], trace });
      }

      const q = lastUserText(messages);
      const seed = `${trace}|${userTurns}|${q}`;
      const { cards, picked } = pickTopCards({ works, desiredType, queryText: q, count: 2, seed });

      const system = systemPromptForRecommend(lang, picked, userTurns);
      const llmText = await callLlm({ purpose: "quality", system, messages, trace });
      const assistantText = llmText || fallbackRecommendText(lang, cards);

      if (userTurns >= MAX_USER_TURNS) {
        const closingText =
          lang === "ja"
            ? "今日はありがとう。余韻のまま、ひとつだけ置いていくね。"
            : "Thanks for today. I'll leave you one last pick.";
        return res.status(200).json({ ok: true, v: 2, mode, assistantText: closingText, text: closingText, cards: cards.slice(0, 1), moodTags: [], trace });
      }

      res.setHeader("X-Latency", String(Date.now() - started));
      return res.status(200).json({ ok: true, v: 2, mode, assistantText, text: assistantText, cards, moodTags: [], trace });
    }

    /* ============ sales ============ */
    if (mode === "sales") {
      if (userTurns === 0) {
        const assistantText = firstTurnGreeting("sales", lang);
        return res.status(200).json({ ok: true, v: 2, mode, assistantText, text: assistantText, cards: [], moodTags: [], trace });
      }

      const desiredType = extractDesiredType(messages);
      const q = lastUserText(messages);
      const seed = `${trace}|sales|${userTurns}|${q}`;
      const { cards, picked } = pickTopCards({ works, desiredType, queryText: q, count: 2, seed });

      const system = systemPromptForSales(lang, picked, userTurns);
      const llmText = await callLlm({ purpose: "quality", system, messages, trace });
      const assistantText = llmText || fallbackSalesText(lang, cards);

      if (userTurns >= MAX_USER_TURNS) {
        const closingText =
          lang === "ja"
            ? "今日はここまで。最後にひとつだけ置いていくね。"
            : "That's it for today — I'll leave you one last pick.";
        return res.status(200).json({ ok: true, v: 2, mode, assistantText: closingText, text: closingText, cards: cards.slice(0, 1), moodTags: [], trace });
      }

      res.setHeader("X-Latency", String(Date.now() - started));
      return res.status(200).json({ ok: true, v: 2, mode, assistantText, text: assistantText, cards, moodTags: [], trace });
    }

    /* ============ chat (雑談) ============ */
    {
      const q = lastUserText(messages);
      const seed = `${trace}|chat|${userTurns}|${q}`;
      const { cards } = pickTopCards({ works, queryText: q, count: 1, seed });

      if (userTurns === 0) {
        const assistantText =
          lang === "ja"
            ? "よくぞ来てくれましたな。ぜひ雑談しましょう。何か最近気になってることはあるかい？"
            : "Well met. Let's chat — what's on your mind lately?";
        return res.status(200).json({ ok: true, v: 2, mode, assistantText, text: assistantText, cards: [], moodTags: [], trace });
      }

      const sys =
        lang === "ja"
          ? "あなたは伯爵MUSIAMの案内役。丁寧で落ち着いた口調。短く、問い返しは1つだけ。作品名を出す時は鉤括弧「 」で引用する。URLや値段は書かない。"
          : "You are a calm guide of Count MUSIAM. Keep it concise. Ask at most one follow-up. Quote work titles in 「 」. No URLs or prices.";

      const raw = await callLlm({ purpose: "fast", system: sys, messages, trace });
      const assistantText =
        (raw ||
          (lang === "ja" ? "なるほど。もう少しだけ詳しく聞かせて？" : "Got it. Tell me a bit more?")
        ).trim();

      if (userTurns >= MAX_USER_TURNS) {
        const closingText =
          lang === "ja"
            ? "今日はありがとう。余韻のまま、ひとつだけ置いていくね。"
            : "Thanks for today. I'll leave you one last pick.";
        return res.status(200).json({ ok: true, v: 2, mode, assistantText: closingText, text: closingText, cards: cards.slice(0, 1), moodTags: [], trace });
      }

      res.setHeader("X-Latency", String(Date.now() - started));
      return res.status(200).json({ ok: true, v: 2, mode, assistantText, text: assistantText, cards, moodTags: [], trace });
    }
  } catch (e) {
    const err = e as Error;
    return res.status(500).json({ ok: false, v: 2, error: err?.message ?? "failed", trace: "err" });
  }
}
