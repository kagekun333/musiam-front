// src/app/api/todays-pick/route.ts
//
// 「今日の一筆」用の日替わり候補 API。
// - 日付ベースのシードで、その日一日は同じ結果を返す（同じ端末・全員で一致）。
// - music 1 件 + book 1 件 + 伯爵からの一言（Haiku 生成、失敗時はテンプレ）。
// - 24時間のエッジキャッシュ。
//
// GET /api/todays-pick?lang=ja   →  JSON

import { NextRequest, NextResponse } from "next/server";
import { chat as llmChat } from "@/lib/llm-router";
import fs from "node:fs/promises";
import path from "node:path";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import { getPrimaryPublicHref } from "@/lib/work-links";
import { buildDailyCountWord, fallbackCountWord } from "@/lib/countword";

type RawWork = {
  id?: string | number;
  title?: string;
  type?: string;
  cover?: string;
  tags?: string[];
  moodTags?: string[];
  href?: string;
  primaryHref?: string;
  salesHref?: string;
  links?: Record<string, string> | unknown;
};

type PickItem = {
  id: string;
  title: string;
  cover: string;
  href: string;
  type: "music" | "book";
  moodTags: string[];
};

type PickResult = {
  ok: boolean;
  ymd: string;
  music: PickItem | null;
  book: PickItem | null;
  countWord: string; // 伯爵の一言（既にキャッシュ済）
};

function ymdTokyo(): string {
  // JSTを基準に日付シードを作る（UTC跨ぎで揺れないように）。
  const now = new Date();
  const tokyo = new Date(now.getTime() + (9 * 60 - now.getTimezoneOffset()) * 60000);
  const y = tokyo.getUTCFullYear();
  const m = String(tokyo.getUTCMonth() + 1).padStart(2, "0");
  const d = String(tokyo.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function normalizeType(t: string | undefined): "music" | "book" | "other" {
  const x = (t ?? "").toLowerCase();
  if (x === "music" || x.includes("album") || x.includes("track") || x.includes("song")) return "music";
  if (x === "book" || x.includes("book") || x.includes("novel") || x.includes("pdf")) return "book";
  return "other";
}

function preferredHref(w: RawWork): string {
  return getPrimaryPublicHref({
    ...w,
    links:
      w.links && typeof w.links === "object" && !Array.isArray(w.links)
        ? (w.links as Record<string, string | null | undefined>)
        : undefined,
  }) || "";
}

function toPickItem(w: RawWork): PickItem | null {
  const t = normalizeType(w.type);
  if (t === "other") return null;
  const id = String(w.id ?? w.title ?? "");
  const title = String(w.title ?? "").trim();
  const cover = String(w.cover ?? "").trim();
  const href = preferredHref(w);
  if (!id || !title || !cover || !href) return null;
  const moodTags = (Array.isArray(w.moodTags) ? w.moodTags : Array.isArray(w.tags) ? w.tags : [])
    .filter((x) => !/^(ASIN|asin|price|aspect):/i.test(String(x)) && !/^(square|portrait|landscape)$/i.test(String(x)))
    .slice(0, 3);
  return { id, title, cover, href, type: t, moodTags };
}

async function loadWorks(): Promise<RawWork[]> {
  return (await loadMergedWorksServer()) as RawWork[];
}

function dailyPick(pool: RawWork[], ymd: string, kind: "music" | "book"): PickItem | null {
  const candidates = pool
    .map(toPickItem)
    .filter((x): x is PickItem => x !== null && x.type === kind);
  if (!candidates.length) return null;
  const seed = `${ymd}|${kind}`;
  const idx = hash32(seed) % candidates.length;
  return candidates[idx];
}

/** 事前生成された countWord キャッシュを読む（scripts/gen-countwords.mjs の出力）。 */
async function readCountWordCache(ymd: string, lang: "ja" | "en"): Promise<string | null> {
  try {
    const p = path.join(process.cwd(), "public/data/countword-cache.json");
    const raw = await fs.readFile(p, "utf-8");
    const j = JSON.parse(raw) as { days?: Record<string, Record<string, string>> };
    const t = j?.days?.[ymd]?.[lang];
    if (typeof t === "string" && t.trim().length > 0) return t.trim();
  } catch {
    // cache が未生成でも fail-silent。MISS として null を返す。
  }
  return null;
}

function isUsableCachedCountWord(text: string, lang: "ja" | "en") {
  const trimmed = String(text || "").trim();
  if (!trimmed) return false;
  return trimmed !== fallbackCountWord(lang);
}

async function composeCountWord(
  lang: "ja" | "en",
  ymd: string,
  music: PickItem | null,
  book: PickItem | null
): Promise<string> {
  // 1) 事前生成キャッシュを最優先（コスト0、レイテンシ~1ms）
  const cached = await readCountWordCache(ymd, lang);
  if (cached && isUsableCachedCountWord(cached, lang)) return cached;

  // 2) キャッシュが固定文なら、ローカルの組み合わせで日替わりを生成
  const local = buildDailyCountWord(lang, ymd, [music, book]);
  if (local) return local;

  // 3) それでも駄目なら Haiku を当日分だけ叩く（保険）
  const mood =
    [music, book]
      .filter((x): x is PickItem => !!x)
      .flatMap((x) => x.moodTags)
      .slice(0, 4)
      .join(" / ") || (lang === "ja" ? "静かな一日" : "a quiet day");

  const system =
    lang === "ja"
      ? [
          "あなたは伯爵MUSIAMの館主、落ち着いた伯爵。",
          "今日の一言を 50〜80字で、詩的に、丁寧に、押しつけずに紡ぐ。",
          "作品名は書かない。気分ワードだけ受け取り、詩情を返す。",
          "絵文字・URL・記号装飾は使わない。",
        ].join("\n")
      : [
          "You are the Count, keeper of Count MUSIAM.",
          "Craft one calm, softly poetic line (~40-70 chars).",
          "Do not name works. Receive only mood words and return a poetic line.",
          "No emojis, URLs, or decorative punctuation.",
        ].join("\n");

  const userPrompt =
    lang === "ja"
      ? `今日のムード: ${mood}\n短く、一言。`
      : `Today's mood: ${mood}\nOne short line.`;

  const r = await llmChat({
    purpose: "quality",
    system,
    messages: [{ role: "user", content: userPrompt }],
    maxTokens: 160,
    temperature: 0.8,
  });
  if (r.ok && r.text) return r.text.trim();

  // 4) 最終フォールバック（テンプレ）
  return fallbackCountWord(lang);
}

export async function GET(req: NextRequest) {
  const lang = (req.nextUrl.searchParams.get("lang") === "en" ? "en" : "ja") as "ja" | "en";
  const ymd = ymdTokyo();

  const works = await loadWorks();
  const music = dailyPick(works, ymd, "music");
  const book = dailyPick(works, ymd, "book");
  const countWord = await composeCountWord(lang, ymd, music, book);

  const body: PickResult = {
    ok: true,
    ymd,
    music,
    book,
    countWord,
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      // 24時間のエッジキャッシュ（同じ lang+日付で同じ）
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
    },
  });
}
