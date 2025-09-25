// scripts/generate-mood-tags.mjs
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

/* ========= 設定 ========= */
const MOOD_TAG_VOCABULARY = [
  "静けさ","ノスタルジー","切なさ","高揚","熱狂","多幸感","勇気","浄化","孤独","神秘",
  "夜更け","朝の光","都会","自然","旅心","海辺","宇宙","祈り","哀愁","希望",
  "凛然","優美","緊張","陶酔","怒り",
];
const VOCAB_SET = new Set(MOOD_TAG_VOCABULARY);

const API_BASE_URL = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/,"");
const API_KEY      = process.env.OPENAI_API_KEY || "lm-studio"; // LM StudioはダミーでOK
const MODEL        = process.env.CODEX_MODEL || "qwen2.5-7b-instruct-1m";

const LIMIT       = parseInt(process.env.LIMIT || "0", 10); // 0=無制限
const OVERWRITE   = process.env.OVERWRITE === "1";           // 既存moodTagsを上書き
const START_INDEX = parseInt(process.env.START_INDEX || "0", 10);
const TIMEOUT_MS  = parseInt(process.env.TIMEOUT_MS || "60000", 10);

const WORKS_PATH  = path.join(process.cwd(), "public", "works", "works.json");
const CACHE_PATH  = path.join(process.cwd(), ".musiam", "out", "mood-tags.json");

/* ========= ユーティリティ ========= */
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
const isLocalBase = ()=>/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(API_BASE_URL);

async function withTimeout(run) {
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), TIMEOUT_MS);
  try { return await run(ctrl.signal); } finally { clearTimeout(t); }
}

async function readWorks() {
  const raw = await fs.readFile(WORKS_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return { items: parsed, wrap: (x)=>x };
  const key = ["items","works","data"].find(k=>Array.isArray(parsed?.[k]));
  if (!key) throw new Error("Unexpected works.json format: need array or {items|works|data}");
  return { items: parsed[key], wrap: (x)=>({ ...parsed, [key]: x }) };
}

async function readCache() {
  try { return JSON.parse(await fs.readFile(CACHE_PATH,"utf8")) || {}; }
  catch { await fs.mkdir(path.dirname(CACHE_PATH), { recursive:true }); return {}; }
}
async function writeCache(obj) {
  await fs.mkdir(path.dirname(CACHE_PATH), { recursive:true });
  await fs.writeFile(CACHE_PATH, JSON.stringify(obj,null,2)+"\n", "utf8");
}

/* ========= プロンプト ========= */
function buildSystemPrompt() {
  return "あなたは音楽/アート/書籍のキュレーターです。下記の語彙のみから3〜7語のムードタグを必ず選び、JSON配列だけを出力してください。説明文や余計な文字は厳禁。";
}
function buildUserPrompt(title, description, seeds) {
  const lines = [
    "Vocabulary:",
    MOOD_TAG_VOCABULARY.map(t=>`- ${t}`).join("\n"),
    "",
    `Title: ${title}`,
  ];
  const desc = String(description||"").trim();
  if (desc) lines.push("", "Description (hint):", desc.slice(0,240));
  if (Array.isArray(seeds) && seeds.length) {
    lines.push("", "Seed tags (prefer if appropriate):", seeds.join(", "));
  }
  lines.push("", 'Output example: ["静けさ","祈り","宇宙"]');
  return lines.join("\n");
}

/* ========= レスポンス解析 ========= */
function pickJsonArray(text) {
  if (!text) return [];
  const trimmed = String(text).trim();
  const s = trimmed.indexOf("["); const e = trimmed.lastIndexOf("]");
  const body = (s!==-1 && e!==-1 && e>=s) ? trimmed.slice(s,e+1) : trimmed;
  try { const arr = JSON.parse(body); return Array.isArray(arr)?arr:[]; } catch { return []; }
}
function normalizeTags(arr) {
  if (!Array.isArray(arr)) return [];
  const out=[], seen=new Set();
  for (const x of arr) {
    const v = typeof x==="string" ? x.trim() : "";
    if (!v || !VOCAB_SET.has(v) || seen.has(v)) continue;
    seen.add(v); out.push(v);
  }
  return (out.length>=3 && out.length<=7) ? out : [];
}

/* ========= フォールバック規則 ========= */
const FALLBACK_RULES = [
  { re: /(stardust|zero\s*gravity|cosmos|宇宙|星|銀河)/i, tags: ["宇宙","神秘","高揚"] },
  { re: /(night|noche|midnight|夜|宵|闇)/i, tags: ["夜更け","神秘","高揚"] },
  { re: /(tropical|beach|海|浜|潮|lagoon|mermaid|人魚)/i, tags: ["海辺","自然","陶酔"] },
  { re: /(tokyo|東京|都会|city|metro|都市)/i, tags: ["都会","高揚","夜更け"] },
  { re: /(meltdown|fuego|炎|核|fusion)/i, tags: ["高揚","緊張","夜更け"] },
  { re: /(love|恋|愛|約束)/i, tags: ["切なさ","希望","優美"] },
  { re: /(剣|刀|sword|blade|war|戦)/i, tags: ["緊張","勇気","高揚"] },
  { re: /(夕焼け|twilight|dawn|黎明|朝)/i, tags: ["朝の光","希望","ノスタルジー"] },
  { re: /(祈|神|寺|temple|gospel)/i, tags: ["祈り","神秘","優美"] },
  { re: /(灰色|哀|nostal|ノスタル|昔)/i, tags: ["哀愁","ノスタルジー","静けさ"] },
];
const DEFAULT_FILL = ["静けさ","希望","旅心","ノスタルジー","高揚","神秘","哀愁"];

function salvageFromTitle(title) {
  const tags = new Set();
  for (const r of FALLBACK_RULES) if (r.re.test(title)) r.tags.forEach(t=>tags.add(t));
  for (const t of DEFAULT_FILL) { if (tags.size>=3) break; tags.add(t); }
  return [...tags].slice(0,5);
}

/* ========= LLM呼び出し（OpenAI互換 /chat/completions） ========= */
async function chatComplete({ model, system, user }) {
  const url = `${API_BASE_URL}/chat/completions`;
  return withTimeout(async (signal) => {
    const r = await fetch(url, {
      method: "POST", signal,
      headers: { "Content-Type":"application/json", "Authorization":`Bearer ${API_KEY}` },
      body: JSON.stringify({
        model, messages: [{role:"system",content:system},{role:"user",content:user}],
        temperature: 0, max_tokens: 128,
      }),
    });
    if (!r.ok) {
      const t = await r.text().catch(()=>r.statusText);
      throw new Error(`/chat/completions ${r.status} ${r.statusText} - ${t}`);
    }
    const j = await r.json();
    return String(j?.choices?.[0]?.message?.content || "").trim();
  });
}

async function retryStrict(title, description, seeds) {
  const sys = "語彙だけから必ず3語。JSON配列以外は一切出力しない。例: [\"静けさ\",\"高揚\",\"夜更け\"]";
  const usr = buildUserPrompt(title, description, seeds) + "\n\n出力は3語ちょうど。";
  const text = await chatComplete({ model: MODEL, system: sys, user: usr });
  return normalizeTags(pickJsonArray(text));
}

/* ========= 生成本体 ========= */
async function fetchMoodTags(title, description, seeds) {
  // 1) 通常プロンプト
  try {
    const text = await chatComplete({
      model: MODEL,
      system: buildSystemPrompt(),
      user: buildUserPrompt(title, description, seeds),
    });
    const t1 = normalizeTags(pickJsonArray(text));
    if (t1.length) return t1;
  } catch (_) {}

  // 2) 厳格プロンプト（3語限定）
  try {
    const t2 = await retryStrict(title, description, seeds);
    if (t2.length) return t2;
  } catch (_) {}

  // 3) タイトル規則フォールバック
  const fb = salvageFromTitle(title);
  if (fb.length>=3) {
    console.log("  (fallback)", fb.join(", "));
    return fb;
  }
  throw new Error("LLM returned no valid tags.");
}

/* ========= メイン ========= */
async function main() {
  if (!MODEL && isLocalBase()) console.warn("WARN: CODEX_MODEL is empty. Using local default.");
  else if (!MODEL) { console.error("Missing CODEX_MODEL"); process.exit(1); }

  const { items, wrap } = await readWorks();
  const cache = await readCache();

  let updated = 0, visited = 0;
  for (let i=0;i<items.length;i++) {
    if (i < START_INDEX) continue;
    const w = items[i];
    if (!OVERWRITE && Array.isArray(w?.moodTags) && w.moodTags.length) continue;
    if (LIMIT && updated >= LIMIT) break;

    const title = String(w?.title || "").trim();
    if (!title) continue;

    visited++;
    console.log(`(${updated+1}${LIMIT?`/${LIMIT}`:""}) ${title}`);

    const key = (w?.id ? `id:${w.id}` : `title:${title}`);
    try {
      // キャッシュ
      const cached = cache[key];
      let tags = Array.isArray(cached) ? normalizeTags(cached) : [];

      if (!tags.length) {
        tags = await fetchMoodTags(title, w?.description, w?.moodSeeds);
      }
      if (!tags.length) throw new Error("no valid tags");

      w.moodTags = tags;
      cache[key] = tags;
      updated++;

      if (updated % 5 === 0) await writeCache(cache);
      console.log("  →", tags.join(", "));

      if (isLocalBase()) await sleep(150);
    } catch (err) {
      console.error("  ×", err instanceof Error ? err.message : String(err));
    }
  }

  if (updated > 0) {
    await fs.writeFile(WORKS_PATH, JSON.stringify(wrap(items), null, 2) + "\n", "utf8");
    await writeCache(cache);
    console.log(`\nUpdated moodTags for ${updated} work(s). Processed ${visited} item(s).`);
  } else {
    console.log("No updates were necessary.");
  }
}

main().catch(e=>{ console.error(e?.stack || String(e)); process.exit(1); });
