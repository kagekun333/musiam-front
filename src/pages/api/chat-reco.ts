// src/pages/api/chat-reco.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

/**
 * chat.tsx expects:
 *  - assistantText: string
 *  - cards: {id,title,type?,cover,links:[{kind,url}],moodTags?}[]
 *  - moodTags: string[]
 *  - mode: "recommend" | "chat" | "sales"
 */

const MAX_USER_TURNS = 5;

// 「チップ/ボタン文言」を userTurns から除外（※UIに合わせて必要なら追加）
const CHIP_TEXTS = new Set([
  // ja
  "おすすめして",
  "雑談しよう",
  "営業して",
  // en（UIの実文言に合わせて）
  "Recommend works",
  "Just chat",
  "Call sales",
  "Recommend now",
  "Chat now",
  "Sell to me",
  "Let's chat",
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
  // 直近の user から優先（recommendで使う）
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    const t = (m.content ?? "").toLowerCase();
    if (!t) continue;

    // 日本語
    if (t.includes("本")) return "book";
    if (t.includes("音楽")) return "music";

    // 英語
    if (t.includes("book")) return "book";
    if (t.includes("music")) return "music";
  }
  return undefined;
}

async function loadWorks(): Promise<Work[]> {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const p = path.join(process.cwd(), "public/works/works.json");
    const raw = await fs.readFile(p, "utf-8");
    const json = JSON.parse(raw);
    const items: Work[] = Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : [];
    return items;
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
  // 1) 作品ごとに「買わせたい/見せたい」優先リンクがあるなら優先
  // salesHref / primaryHref があれば、それを先頭に使える
  return (
    (w.salesHref as string) ||
    (w.primaryHref as string) ||
    (w.href as string) ||
    (typeof (w.links as any)?.url === "string" ? (w.links as any).url : "")
  );
}

function buildLinks(w: Work): { kind: RecoLinkKind; url: string }[] {
  const out: { kind: RecoLinkKind; url: string }[] = [];

  const t = normalizeWorkType(w.type);

  // links が dict の場合：キーから kind を推定して優先順に並べる
  const dict = w.links && !Array.isArray(w.links) && typeof w.links === "object" ? (w.links as Record<string, string>) : null;

  const pushIf = (kind: RecoLinkKind, url?: string) => {
    const u = (url ?? "").trim();
    if (!u) return;
    if (out.some((x) => x.url === u)) return;
    out.push({ kind, url: u });
  };

  if (dict) {
    // 「buy」系を最優先で出したい
    const buyKeys = ["itunesbuy", "itunes", "buy", "applemusicbuy", "bandcamp", "amazon"];
    const listenKeys = ["applemusic", "spotify", "listen", "soundcloud", "youtube"];
    const readKeys = ["read", "pdf", "kindle", "amazonkindle"];

    // buy
    for (const k of Object.keys(dict)) {
      const lk = k.toLowerCase();
      if (buyKeys.some((x) => lk.includes(x))) pushIf("buy", dict[k]);
    }
    // listen
    for (const k of Object.keys(dict)) {
      const lk = k.toLowerCase();
      if (listenKeys.some((x) => lk.includes(x))) pushIf("listen", dict[k]);
    }
    // read
    for (const k of Object.keys(dict)) {
      const lk = k.toLowerCase();
      if (readKeys.some((x) => lk.includes(x))) pushIf("read", dict[k]);
    }
  } else if (Array.isArray(w.links)) {
    // 配列なら url を拾って open 扱い
    for (const l of w.links) {
      if (l && typeof (l as any).url === "string") pushIf("open", (l as any).url);
    }
  }

  // 最後の保険：href/primary/sales を open or read/listen に入れる
  const href = coalesceHref(w);
  if (t === "book") pushIf("read", href);
  else if (t === "music") pushIf("listen", href);
  else pushIf("open", href);

  // 何も無ければ out は空（UI側はリンク無しカードとして出る）
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
  // 日本語は分かち書きが難しいので「そのまま」も混ぜる＋英数字は分割
  const ascii = t
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 12);
  const jpChunks = t.match(/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]{2,}/gu) ?? [];
  return Array.from(new Set([...ascii, ...jpChunks])).slice(0, 18);
}

function hash32(s: string): number {
  // 軽量な安定ハッシュ
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
  // タイトル一致を強めに
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
}): RecoCard[] {
  const { works, desiredType, queryText, count, seed } = params;

  let pool = works;

  if (desiredType) {
    pool = pool.filter((w) => normalizeWorkType(w.type) === desiredType);
  }

  // cover必須（カードUIの核）
  pool = pool.filter((w) => !!pickCover(w));

  const tokens = tokenizeLoose(queryText);

  const scored = pool.map((w) => {
    const base = scoreWork(w, tokens);
    // 同点の並びを固定しつつ「毎回同じ」から脱出するための擬似乱数
    const jitter = (hash32(seed + "|" + String(w.id ?? w.title ?? "")) % 1000) / 1000;
    return { w, score: base, jitter };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.jitter - a.jitter;
  });

  const cards: RecoCard[] = [];
  for (const x of scored) {
    const c = workToCard(x.w);
    if (!c) continue;
    // リンクが完全に空のカードは避ける（最低1つは欲しい）
    if (!c.links?.length) continue;
    cards.push(c);
    if (cards.length >= count) break;
  }

  // それでも不足したら、スコア無視で埋める
  if (cards.length < count) {
    for (const w of pool) {
      const c = workToCard(w);
      if (!c) continue;
      if (!c.links?.length) continue;
      if (cards.some((x) => x.id === c.id)) continue;
      cards.push(c);
      if (cards.length >= count) break;
    }
  }

  return cards.slice(0, count);
}

function descForCard(w: Work, lang: Lang): string {
  const mi = w.matchInfo;
  const s =
    typeof mi === "string"
      ? mi
      : mi && typeof mi === "object"
      ? mi.summary || mi.reason || ""
      : "";
  if (s) return s.length > 80 ? s.slice(0, 80) + "…" : s;

  // fallback：tags/moodTags
  const tags = (Array.isArray(w.moodTags) ? w.moodTags : Array.isArray(w.tags) ? w.tags : []).slice(0, 3);
  if (tags.length) return lang === "ja" ? `雰囲気: ${tags.join(" / ")}` : `Vibe: ${tags.join(" / ")}`;

  return lang === "ja" ? "短く、芯に届く一作です。" : "A concise piece that lands cleanly.";
}

/** ===== Groq (LLM) optional: chatモードだけで使用 =====
 * sales / recommend は安定のため基本テンプレ運用
 */
async function groqChat(messages: { role: "system" | "user" | "assistant"; content: string }[]) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return "";

  const model = process.env.GROQ_MODEL || "llama-3.1-70b-versatile";
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 450,
    }),
  });

  if (!resp.ok) return "";
  const data = await resp.json();
  return String(data?.choices?.[0]?.message?.content ?? "");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const started = Date.now();
  const trace = Math.random().toString(36).slice(2);

  try {
    const parsed = BodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, v: 1, error: "invalid_body", trace });
    }

    const { mode, lang, messages } = parsed.data;
    const userTurns = countUserTurnsExcludingChips(messages);

    const works = await loadWorks();

    res.setHeader("X-Trace-Id", trace);

    // ===== recommend：質問・流れを固定 =====
    if (mode === "recommend") {
      // チップ直後（userTurns=0）：ファーストクエスチョン固定（現状のままOK）
      if (userTurns === 0) {
        const assistantText =
          lang === "ja"
            ? "伯爵の部屋へようこそ。本と音楽、どちらで満たしたい気分かな？"
            : "Welcome. Book or music — which one do you want right now?";
        return res.status(200).json({ ok: true, v: 1, mode, assistantText, text: assistantText, cards: [], moodTags: [], trace });
      }

      const desiredType = extractDesiredType(messages);

      // 2問目固定：本/音楽の返答を受けて、次の質問も固定
      if (userTurns === 1) {
        const assistantText =
          lang === "ja"
            ? desiredType === "music"
              ? "音楽を聴きたい気分なんですね。どんな作品を聴きたい気分かな？（例：ジャンル / 雰囲気 / テンポ）"
              : "本を読みたい気分なんですね。どんな作品を読みたい気分かな？（例：ジャンル / 雰囲気 / テーマ）"
            : desiredType === "music"
            ? "Got it — you want music. What kind (genre / vibe / tempo) are you in the mood for?"
            : "Got it — you want a book. What kind (genre / vibe / theme) are you in the mood for?";
        return res.status(200).json({ ok: true, v: 1, mode, assistantText, text: assistantText, cards: [], moodTags: [], trace });
      }

      // 3手目以降：前置き固定→作品タイトルを正確に→軽い説明→締め
      const q = lastUserText(messages);
      const seed = `${trace}|${userTurns}|${q}`;
      const cards = pickTopCards({
        works,
        desiredType,
        queryText: q,
        count: 2,
        seed,
      });

      // 作品説明は works から生成（存在すれば matchInfo / tags ）
      const pickedWorksById = new Map<string, Work>();
      for (const w of works) {
        const id = String(w.id ?? w.title ?? "");
        if (id) pickedWorksById.set(id, w);
      }

      const lines: string[] = [];
      for (const c of cards) {
        const w = pickedWorksById.get(c.id);
        const d = w ? descForCard(w, lang) : lang === "ja" ? "ぜひお楽しみください。" : "Enjoy it.";
        lines.push(`・「${c.title}」— ${d}`);
      }

      const assistantText =
        lang === "ja"
          ? `なるほど、それならちょうどいいのがありますよ。\n\n${lines.join("\n")}\n\nぜひお楽しみ下さい。`
          : `Perfect — I’ve got just the thing.\n\n${lines.join("\n")}\n\nHope you enjoy.`;

      // 締め（5ターン到達）は静かに1枚だけ置く
      if (userTurns >= MAX_USER_TURNS) {
        const closingCard = cards.slice(0, 1);
        const closingText =
          lang === "ja" ? "今日はありがとう。余韻のまま、ひとつだけ置いていくね。" : "Thanks for today. I’ll leave you one last pick.";
        return res.status(200).json({ ok: true, v: 1, mode, assistantText: closingText, text: closingText, cards: closingCard, moodTags: [], trace });
      }

      return res.status(200).json({ ok: true, v: 1, mode, assistantText, text: assistantText, cards, moodTags: [], trace });
    }

    // ===== sales：安定化のため基本テンプレ（Abby固定） =====
    if (mode === "sales") {
      const q = lastUserText(messages);
      const desiredType = extractDesiredType(messages);
      const seed = `${trace}|sales|${userTurns}|${q}`;

      // sales は「売る」ので、リンク優先は buy > listen/read > open を buildLinks が担保
      const cards = pickTopCards({
        works,
        desiredType,
        queryText: q,
        count: 2,
        seed,
      });

      // 会話テンプレ（性別/口調ブレ排除）
      let assistantText = "";
      if (userTurns === 0) {
        assistantText =
          lang === "ja"
            ? "いらっしゃいませ〜ご指名ありがとう。No.1営業のAbbyよ。今日は何を手に入れたい？（本 / 音楽 / そのほか）"
            : "Hey~ I’m Abby, your #1 sales rep. What do you want today? (book / music / other)";
        return res.status(200).json({ ok: true, v: 1, mode, assistantText, text: assistantText, cards, moodTags: [], trace });
      }

      if (userTurns === 1) {
        assistantText =
          lang === "ja"
            ? (desiredType === "music"
                ? "音楽ね。気分はどっち？（アゲたい / 落ち着きたい / ぶっ壊したい）"
                : desiredType === "book"
                ? "本ね。気分はどっち？（癒されたい / 刺激がほしい / 深く沈みたい）"
                : "了解。気分はどっち？（アゲたい / 落ち着きたい / 刺激がほしい）")
            : "Got it. What’s the vibe? (hype / calm / intense)";
        return res.status(200).json({ ok: true, v: 1, mode, assistantText, text: assistantText, cards, moodTags: [], trace });
      }

      // 作品提示（タイトルを正確に言う）
      if (cards.length) {
        const list = cards.map((c) => `・「${c.title}」`).join("\n");
        assistantText =
          lang === "ja"
            ? `なるほど。じゃあ今日はこれ。\n\n${list}\n\nリンクは下のカードから開けるよ。`
            : `Perfect. Here are my picks:\n\n${list}\n\nOpen them via the cards below.`;
      } else {
        assistantText =
          lang === "ja"
            ? "ごめん、今のデータだと候補が取れなかった。別の気分ワードを一つだけ言って？"
            : "I couldn’t pull candidates from the current data. Give me one more vibe keyword.";
      }

      // 締め
      if (userTurns >= MAX_USER_TURNS) {
        const closingText =
          lang === "ja" ? "今日はここまで。最後にひとつだけ置いていくね。" : "That’s it for today — I’ll leave you one last pick.";
        return res.status(200).json({ ok: true, v: 1, mode, assistantText: closingText, text: closingText, cards: cards.slice(0, 1), moodTags: [], trace });
      }

      return res.status(200).json({ ok: true, v: 1, mode, assistantText, text: assistantText, cards, moodTags: [], trace });
    }

    // ===== chat：雑談はLLM（必要最低限）＋カードは控えめに1枚だけ =====
    {
      const q = lastUserText(messages);
      const seed = `${trace}|chat|${userTurns}|${q}`;
      const cards = pickTopCards({ works, queryText: q, count: 1, seed });

      // 1ターン目は固定（現状維持）
      if (userTurns === 0) {
        const assistantText =
          lang === "ja"
            ? "よくぞ来てくれましたな。ぜひ雑談しましょう。何か最近気になってることはあるかい？"
            : "Well met. Let’s chat — what’s on your mind lately?";
        return res.status(200).json({ ok: true, v: 1, mode, assistantText, text: assistantText, cards: [], moodTags: [], trace });
      }

      const sys =
        lang === "ja"
          ? "あなたは伯爵MUSIAMの案内役。丁寧で落ち着いた口調。短く、問い返しは1つだけ。"
          : "You are a calm guide. Keep it concise. Ask at most one follow-up question.";

      const raw = await groqChat([{ role: "system", content: sys }, ...messages]);
      const assistantText = (raw || (lang === "ja" ? "なるほど。もう少しだけ詳しく聞かせて？" : "Got it. Tell me a bit more?")).trim();

      if (userTurns >= MAX_USER_TURNS) {
        const closingText =
          lang === "ja" ? "今日はありがとう。余韻のまま、ひとつだけ置いていくね。" : "Thanks for today. I’ll leave you one last pick.";
        return res.status(200).json({ ok: true, v: 1, mode, assistantText: closingText, text: closingText, cards: cards.slice(0, 1), moodTags: [], trace });
      }

      res.setHeader("X-Latency", String(Date.now() - started));
      return res.status(200).json({ ok: true, v: 1, mode, assistantText, text: assistantText, cards, moodTags: [], trace });
    }
  } catch (e: any) {
    return res.status(500).json({ ok: false, v: 1, error: e?.message ?? "failed", trace: "err" });
  }
}