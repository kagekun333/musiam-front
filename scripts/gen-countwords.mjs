#!/usr/bin/env node
// scripts/gen-countwords.mjs
//
// 目的: 「今日の一筆」で表示する伯爵の一言 (countWord) を N 日分まとめて Haiku で生成し、
//       public/data/countword-cache.json に保存する。
//       TodaysPick API は実行時にキャッシュを優先的に読み、Haiku を叩かず配信する。
//
// 使い方:
//   node scripts/gen-countwords.mjs                     # 30日分 (ja) 生成
//   DAYS=90 node scripts/gen-countwords.mjs              # 90日分
//   LANGS=ja,en DAYS=30 node scripts/gen-countwords.mjs  # ja + en
//   DRY_RUN=1 node scripts/gen-countwords.mjs            # API叩かず mock 書き込み
//
// キャッシュ形式:
// {
//   "generatedAt": "...",
//   "days": {
//     "2026-04-20": { "ja": "静かな一頁を…", "en": "A quiet page today..." },
//     ...
//   }
// }
//
// NOTE:
// - Haiku を直接 Anthropic API で叩く。llm-router 経由ではないのは、このスクリプトは Next.js の
//   module解決の外で走るため TS/alias を避けたかった。プロンプト文言は同一。
// - ANTHROPIC_API_KEY 未設定なら DRY_RUN として警告だけ出す（テンプレ埋め）。
// - music/book の ID を日付シードで選び、mood を system prompt に渡す。

import fs from "node:fs/promises";
import path from "node:path";

const WORKSPACE = process.cwd();
const WORKS_JSON = path.join(WORKSPACE, "public/works/works.json");
const WORKS_SSD = path.join(WORKSPACE, "public/works/works-ssd.json");
const OUT_PATH = path.join(WORKSPACE, "public/data/countword-cache.json");

const DAYS = Math.max(1, Number(process.env.DAYS ?? "30"));
const LANGS = (process.env.LANGS ?? "ja")
  .split(",")
  .map((s) => s.trim())
  .filter((l) => l === "ja" || l === "en");

const DRY_RUN = !!process.env.DRY_RUN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

const JA_OPENERS = [
  "星明かりの下では、",
  "今夜の空気には、",
  "宇宙の静けさの奥で、",
  "ひそやかな光のように、",
  "まだ名のない余韻が、",
  "今日の心の軌道には、",
];
const JA_SUBJECTS = [
  "やわらかな答え",
  "小さな入口",
  "澄んだ余白",
  "静かな熱",
  "見落としていた輝き",
  "いま似合う温度",
];
const JA_ENDINGS = [
  "きっと、次の一作へ導いてくれます。",
  "今日はそれを拾う日です。",
  "無理に急がず、ひとつだけ手に取ってください。",
  "耳を澄ませば、ちょうどいい出会いがあります。",
  "その余韻に、今日は素直でいてください。",
];
const EN_OPENERS = [
  "Tonight,",
  "Under a quiet sky,",
  "In the hush between stars,",
  "Along today's orbit,",
];
const EN_SUBJECTS = [
  "a softer answer",
  "a small doorway",
  "a clear pocket of air",
  "a gentler heat",
];
const EN_ENDINGS = [
  "is already moving toward you.",
  "will meet you if you do not rush.",
  "is enough for tonight.",
  "is waiting in the next work you open.",
];

// ---------- helpers ----------

function hash32(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function ymdTokyo(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * 86400000);
  const tokyo = new Date(
    now.getTime() + (9 * 60 - now.getTimezoneOffset()) * 60000
  );
  const y = tokyo.getUTCFullYear();
  const m = String(tokyo.getUTCMonth() + 1).padStart(2, "0");
  const d = String(tokyo.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function loadWorks() {
  const out = [];
  for (const p of [WORKS_JSON, WORKS_SSD]) {
    try {
      const raw = await fs.readFile(p, "utf-8");
      const j = JSON.parse(raw);
      const items = Array.isArray(j?.items) ? j.items : Array.isArray(j) ? j : [];
      out.push(...items);
    } catch {}
  }
  return out;
}

function normalizeType(t) {
  const x = (t ?? "").toLowerCase();
  if (x === "book" || x.includes("book") || x.includes("novel") || x.includes("pdf")) return "book";
  if (x === "music" || x.includes("album") || x.includes("track") || x.includes("song")) return "music";
  return "other";
}

function pickForDay(pool, ymd, kind) {
  const candidates = pool.filter((w) => normalizeType(w.type) === kind);
  if (!candidates.length) return null;
  const idx = hash32(`${ymd}|${kind}`) % candidates.length;
  return candidates[idx];
}

function extractMoods(items) {
  const moodSet = new Set();
  for (const w of items) {
    const tags = Array.isArray(w?.moodTags)
      ? w.moodTags
      : Array.isArray(w?.tags)
      ? w.tags
      : [];
    for (const t of tags) {
      const s = String(t);
      if (/^(ASIN|asin|price|aspect):/i.test(s)) continue;
      if (/^(square|portrait|landscape)$/i.test(s)) continue;
      if (/^genre:/i.test(s)) continue;
      if (s.length > 30) continue;
      moodSet.add(s);
    }
  }
  return Array.from(moodSet).slice(0, 6).join(" / ");
}

function pick(arr, seed, salt) {
  return arr[hash32(`${seed}|${salt}`) % arr.length];
}

function buildLocalLine(lang, ymd, moodLine) {
  const seed = `${ymd}|${lang}`;
  const mood = moodLine ? (lang === "ja" ? `「${moodLine.split(" / ")[0]}」みたいな気分を、` : `that ${moodLine.split(" / ")[0]} feeling `) : "";
  if (lang === "ja") {
    return `${pick(JA_OPENERS, seed, "o")}${mood}${pick(JA_SUBJECTS, seed, "s")}が、${pick(JA_ENDINGS, seed, "e")}`;
  }
  return `${pick(EN_OPENERS, seed, "o")} ${mood}${pick(EN_SUBJECTS, seed, "s")} ${pick(EN_ENDINGS, seed, "e")}`
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- Anthropic call ----------

async function callHaiku({ system, user }) {
  if (!ANTHROPIC_KEY) return { ok: false, text: "", error: "no key" };
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 160,
        temperature: 0.85,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      return { ok: false, text: "", error: `HTTP ${r.status}: ${errText.slice(0, 200)}` };
    }
    const j = await r.json();
    const text = Array.isArray(j?.content)
      ? j.content.map((c) => (c?.type === "text" ? c.text ?? "" : "")).join("").trim()
      : "";
    return { ok: Boolean(text), text };
  } catch (e) {
    return { ok: false, text: "", error: e?.message ?? "call failed" };
  }
}

function systemFor(lang) {
  return lang === "ja"
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
}

function userFor(lang, moodLine) {
  return lang === "ja"
    ? `今日のムード: ${moodLine || "静かな一日"}\n短く、一言。`
    : `Today's mood: ${moodLine || "a quiet day"}\nOne short line.`;
}

function fallbackLine(lang) {
  return lang === "ja"
    ? "今日は、静かな一頁を。耳を澄ませば、あなたに合う一作がある。"
    : "A quiet page today. Listen closely — something here matches you.";
}

function isReusableLine(text, lang) {
  const value = String(text || "").trim();
  if (!value) return false;
  return value !== fallbackLine(lang);
}

// ---------- main ----------

async function main() {
  const works = await loadWorks();
  console.log(`loaded: ${works.length} works`);
  if (!works.length) {
    console.error("no works found, aborting");
    process.exit(1);
  }

  let existing = { days: {} };
  try {
    existing = JSON.parse(await fs.readFile(OUT_PATH, "utf-8"));
    if (!existing.days) existing.days = {};
  } catch {}

  const report = { generated: 0, cached: 0, fallback: 0, errors: [] };

  for (let i = 0; i < DAYS; i++) {
    const ymd = ymdTokyo(i);
    existing.days[ymd] = existing.days[ymd] ?? {};
    const music = pickForDay(works, ymd, "music");
    const book = pickForDay(works, ymd, "book");
    const moodLine = extractMoods([music, book].filter(Boolean));

    for (const lang of LANGS) {
      if (isReusableLine(existing.days[ymd][lang], lang)) {
        report.cached++;
        continue;
      }
      if (DRY_RUN || !ANTHROPIC_KEY) {
        existing.days[ymd][lang] = buildLocalLine(lang, ymd, moodLine) || fallbackLine(lang);
        report.fallback++;
        continue;
      }
      const r = await callHaiku({
        system: systemFor(lang),
        user: userFor(lang, moodLine),
      });
      if (r.ok) {
        existing.days[ymd][lang] = r.text;
        report.generated++;
      } else {
        existing.days[ymd][lang] = fallbackLine(lang);
        report.fallback++;
        report.errors.push({ ymd, lang, error: r.error });
      }
      // 失礼にならない程度のrate limit
      await new Promise((res) => setTimeout(res, 200));
    }
  }

  existing.generatedAt = new Date().toISOString();
  existing.source = "scripts/gen-countwords.mjs";

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(existing, null, 2), "utf-8");

  console.log("------");
  console.log("wrote:", OUT_PATH);
  console.log("report:", {
    generated: report.generated,
    cached_hit: report.cached,
    fallback: report.fallback,
    error_count: report.errors.length,
    days_total: DAYS,
    langs: LANGS,
  });
  if (report.errors.length) {
    console.log("first 3 errors:", report.errors.slice(0, 3));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
