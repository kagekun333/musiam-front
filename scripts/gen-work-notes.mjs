#!/usr/bin/env node
// scripts/gen-work-notes.mjs
//
// 目的: 全作品(works.json + works-ssd.json merge)に「伯爵の解説文」(120〜160字) を
//       Haiku でバッチ生成し、public/works/works-notes.json に保存する。
//       /works/[id] ページがビルド時に読み、SEOテキストと世界観を同時に強化する。
//
// 使い方:
//   ANTHROPIC_API_KEY=sk-... node scripts/gen-work-notes.mjs           # 未生成分のみ
//   LIMIT=20 node scripts/gen-work-notes.mjs                           # 20件だけ(試走)
//   FORCE=1 node scripts/gen-work-notes.mjs                            # 全件再生成
//   DRY_RUN=1 node scripts/gen-work-notes.mjs                          # API叩かない
//
// 出力形式: { "generatedAt": "...", "notes": { "<workId>": "解説文", ... } }
// コスト目安: Haiku 307件 ≈ $0.15 前後。
// NOTE: gen-countwords.mjs と同じ方針で Anthropic API を直接叩く(TS/alias回避)。

import fs from "node:fs/promises";
import path from "node:path";

const WORKSPACE = process.cwd();
const WORKS_JSON = path.join(WORKSPACE, "public/works/works.json");
const WORKS_SSD = path.join(WORKSPACE, "public/works/works-ssd.json");
const OUT_PATH = path.join(WORKSPACE, "public/works/works-notes.json");

// .env.local を自動読み込み (環境変数が未設定の場合のみ補完)
try {
  const envRaw = await fs.readFile(path.join(WORKSPACE, ".env.local"), "utf-8");
  for (const line of envRaw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch { /* .env.local 無しでも可 */ }

const DRY_RUN = !!process.env.DRY_RUN;
const FORCE = !!process.env.FORCE;
const LIMIT = Number(process.env.LIMIT ?? "0");
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
// PROVIDER=groq で強制Groq。既定: anthropic優先、失敗時groqフォールバック
const PROVIDER = (process.env.PROVIDER || "auto").toLowerCase();

async function readJson(p, fallback) {
  try {
    return JSON.parse(await fs.readFile(p, "utf-8"));
  } catch {
    return fallback;
  }
}

function buildPrompt(work) {
  const type = String(work.type || "").toLowerCase().includes("book") ? "書籍" : "楽曲";
  const tags = [...(work.moodTags || []), ...(work.tags || [])].slice(0, 6).join("、");
  return [
    `作品名: ${work.title}`,
    `種別: ${type}`,
    tags ? `タグ: ${tags}` : "",
    work.releasedAt ? `発表: ${work.releasedAt}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const SYSTEM = [
  "あなたは「伯爵MUSIAM」の主、ABI伯爵。自作の作品を一篇ずつ来館者に紹介する。",
  "与えられた作品情報から、120〜160字の日本語の解説文を1つだけ書く。",
  "規則:",
  "- 一人称は「私」。落ち着いた、わずかに芝居がかった館の主の口調。",
  "- 作品の聴きどころ/読みどころを情景として描く。誇張した宣伝文句は使わない。",
  "- 事実が分からない部分は断定せず、雰囲気の描写に徹する。",
  "- 出力は解説文のみ。前置き・記号・改行なし。",
].join("\n");

async function callHaiku(userText) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 300,
      system: SYSTEM,
      messages: [{ role: "user", content: userText }],
    }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return (json.content?.[0]?.text || "").trim();
}

async function callGroq(userText) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 300,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userText },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return (json.choices?.[0]?.message?.content || "").trim();
}

async function generate(userText) {
  if (PROVIDER === "groq") return callGroq(userText);
  if (PROVIDER === "anthropic") return callHaiku(userText);
  // auto: Anthropic優先 → 失敗したらGroq
  if (ANTHROPIC_KEY) {
    try {
      return await callHaiku(userText);
    } catch (e) {
      if (!GROQ_KEY) throw e;
    }
  }
  if (GROQ_KEY) return callGroq(userText);
  throw new Error("APIキーがありません (ANTHROPIC_API_KEY / GROQ_API_KEY)");
}

async function main() {
  const master = await readJson(WORKS_JSON, { items: [] });
  const ssd = await readJson(WORKS_SSD, { items: [] });
  const byId = new Map();
  for (const w of [...(master.items || []), ...(ssd.items || [])]) {
    if (w?.id != null && w.title && !byId.has(String(w.id))) byId.set(String(w.id), w);
  }

  const existing = await readJson(OUT_PATH, { notes: {} });
  const notes = FORCE ? {} : { ...(existing.notes || {}) };

  let targets = [...byId.values()].filter((w) => !notes[String(w.id)]);
  if (LIMIT > 0) targets = targets.slice(0, LIMIT);
  console.log(`対象 ${targets.length} 件 (既存 ${Object.keys(notes).length} 件)`);

  const hasKey = ANTHROPIC_KEY || GROQ_KEY;
  if (!hasKey && !DRY_RUN) {
    console.warn("APIキー未設定。DRY_RUN として実行します。");
  }
  console.log(`provider=${PROVIDER} (anthropic key: ${ANTHROPIC_KEY ? "あり" : "なし"} / groq key: ${GROQ_KEY ? "あり" : "なし"})`);

  let done = 0;
  for (const w of targets) {
    const id = String(w.id);
    try {
      if (DRY_RUN || !hasKey) {
        notes[id] = `（仮）${w.title} — 館の収蔵品。静かな夜に、ひとつどうぞ。`;
      } else {
        notes[id] = await generate(buildPrompt(w));
        // rate-limit配慮: Groq無料枠は約30req/分なので2.2秒間隔
        const wait = PROVIDER === "groq" || (!ANTHROPIC_KEY && GROQ_KEY) ? 2200 : 250;
        await new Promise((r) => setTimeout(r, wait));
      }
      done++;
      if (done % 20 === 0) {
        await fs.writeFile(OUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), notes }, null, 1));
        console.log(`… ${done}/${targets.length} (途中保存)`);
      }
    } catch (e) {
      console.warn(`SKIP ${id}: ${e.message}`);
    }
  }

  await fs.writeFile(OUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), notes }, null, 1));
  console.log(`完了: ${done} 件生成 → ${path.relative(WORKSPACE, OUT_PATH)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
