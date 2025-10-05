// scripts/kannon_redo.mjs
// tempdata/kannon_redo_targets.json に列挙された (id,lang) だけ再翻訳し、ja.txt / en.txt を上書き保存。
// 原文は src/data/kannon100/<id>/原文*.txt（無ければ ja/en 以外の .txt 最大サイズ）。
// 上書き前に .bak を作成。
// OpenAI 互換 (OPENAI_BASE_URL/OPENAI_MODEL) or 公式APIのどちらでも利用可。

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== パス設定 =====
const ROOT = path.resolve(__dirname, '..', 'src', 'data', 'kannon100');
const TARGETS_JSON = path.resolve(__dirname, '..', 'tempdata', 'kannon_redo_targets.json');

// ===== 翻訳設定 =====
const ENGINE = (process.env.TRANS_ENGINE || 'openai').toLowerCase();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini-transcribe';
const TEMPERATURE = Number(process.env.TRANS_TEMP || 0.2);

// 1ファイル内での分割（文字ベースの素朴分割）
const CHUNK_SIZE = Number(process.env.TRANS_CHUNK || 4000);

// ===== ユーティリティ =====
function listTxt(dir) {
  return fs.readdirSync(dir).filter(n => n.toLowerCase().endsWith('.txt'));
}

function resolveSrcPath(dir, folderId) {
  const txts = listTxt(dir);
  // 原文*.txt
  const genbunRegex = /^原文.*\.txt$/i;
  const genbun = txts.filter(n => genbunRegex.test(n));
  if (genbun.length > 0) {
    const idRegex = new RegExp(folderId);
    const idMatches = genbun.filter(n => idRegex.test(n));
    const pool = idMatches.length ? idMatches : genbun;
    let best = pool[0], bestSize = fs.statSync(path.join(dir, best)).size;
    for (const name of pool.slice(1)) {
      const sz = fs.statSync(path.join(dir, name)).size;
      if (sz > bestSize) { best = name; bestSize = sz; }
    }
    return path.join(dir, best);
  }
  // それ以外（ja/en以外最大）
  const others = txts.filter(n => {
    const low = n.toLowerCase();
    return low !== 'ja.txt' && low !== 'en.txt';
  });
  if (others.length > 0) {
    let best = others[0], bestSize = fs.statSync(path.join(dir, best)).size;
    for (const name of others.slice(1)) {
      const sz = fs.statSync(path.join(dir, name)).size;
      if (sz > bestSize) { best = name; bestSize = sz; }
    }
    return path.join(dir, best);
  }
  return null;
}

function toChunks(s, size) {
  const out = [];
  for (let i = 0; i < s.length; i += size) out.push(s.slice(i, i + size));
  return out;
}

async function translateChunk(text, targetLang) {
  const sys = `You are a professional literary translator. Translate faithfully and naturally.
- Keep paragraphs and inline symbols.
- Do not add commentary.
- Target language: ${targetLang}.`;

  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: text }
    ],
    temperature: TEMPERATURE
  };

  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY || 'DUMMY'}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text().catch(()=> '');
    throw new Error(`OpenAI API error: ${res.status} ${res.statusText} ${t}`);
  }
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? '';
}

async function translateFull(text, langCode) {
  const targetLangName = (langCode === 'ja') ? 'Japanese' : (langCode === 'en' ? 'English' : langCode);
  const chunks = toChunks(text, CHUNK_SIZE);
  let out = '';
  for (const ch of chunks) {
    const tr = await translateChunk(ch, targetLangName);
    out += tr.endsWith('\n') ? tr : (tr + '\n');
  }
  return out.trim() + '\n';
}

// ===== メイン =====
if (!fs.existsSync(TARGETS_JSON)) {
  console.error(`[redo] not found: ${TARGETS_JSON}. Run kannon_pick_redo.mjs first.`);
  process.exit(1);
}

const targets = JSON.parse(fs.readFileSync(TARGETS_JSON, 'utf8'));
if (!Array.isArray(targets) || targets.length === 0) {
  console.log(`[redo] empty targets. Nothing to do.`);
  process.exit(0);
}

if (ENGINE === 'openai' && !OPENAI_API_KEY && !OPENAI_BASE_URL.startsWith('http://localhost')) {
  console.warn(`[redo] WARNING: OPENAI_API_KEY is empty. If you are calling a local OpenAI-compatible endpoint, ignore this.`);
}

let ok = 0, ng = 0;

for (const t of targets) {
  const id = t.id;
  const lang = t.lang;
  const dir = path.join(ROOT, id);
  if (!fs.existsSync(dir)) {
    console.warn(`[skip] missing dir: ${dir}`);
    continue;
  }

  const srcPath = resolveSrcPath(dir, id);
  if (!srcPath || !fs.existsSync(srcPath)) {
    console.warn(`[skip] missing src for ${id}: ${srcPath}`);
    continue;
  }

  const src = fs.readFileSync(srcPath, 'utf8');
  const outPath = path.join(dir, lang === 'ja' ? 'ja.txt' : 'en.txt');

  try {
    const translated = await translateFull(src, lang);

    // .bak 退避
    if (fs.existsSync(outPath)) {
      const bak = outPath + '.bak';
      try { fs.copyFileSync(outPath, bak); } catch {}
    }

    fs.writeFileSync(outPath, translated, 'utf8');
    console.log(`[OK] ${id} ${lang} -> ${outPath}`);
    ok++;
  } catch (e) {
    console.error(`[ERR] ${id} ${lang}: ${e.message}`);
    ng++;
  }
}

console.log(`[redo] DONE. OK=${ok}, NG=${ng}`);
