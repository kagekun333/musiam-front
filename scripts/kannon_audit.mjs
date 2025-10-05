// scripts/kannon_audit.mjs
// Node >= 18 / Windows PowerShell想定（UTF-8）
// 目的: src/data/kannon100/001..100/ 内の 原文*.txt / ja.txt / en.txt を監査し、怪しい訳だけ特定する

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== 設定 =====
const ROOT = path.resolve(__dirname, '..', 'src', 'data', 'kannon100'); // 001〜100 があるディレクトリ
const OUT_DIR = path.resolve(__dirname, '..', 'tempdata');
const FOLDERS = Array.from({ length: 100 }, (_, i) => String(i + 1).padStart(3, '0'));

// 言語ファイルの期待名
const JA_NAME = 'ja.txt';
const EN_NAME = 'en.txt';

// 閾値（必要に応じて調整）
const MIN_CHARS = 40;          // 訳文がこれ未満なら「短すぎ」
const MAX_IDENTICAL = 0.85;    // 原文とほぼ同一（未翻訳疑い）
const PARA_LOSS_RATIO = 0.33;  // 段落数が原文の33%以下なら段落崩れ
const MIN_RATIO_TO_SRC = 0.35; // 訳の長さが原文の35%未満なら短絡疑い

// ===== ユーティリティ =====
const ensureDir = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); };

const readTxt = (p) => {
  try {
    return fs.readFileSync(p, 'utf8'); // UTF-8前提（BOM含んでもOK）
  } catch {
    return null;
  }
};

const isJapaneseLike = (s) => /[一-龯ぁ-んァ-ヴー々〆〇]/.test(s || '');
const isEnglishLike = (s) => /[A-Za-z]/.test(s || '');

const normalize = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();

const similarity = (a, b) => {
  const s1 = normalize(a);
  const s2 = normalize(b);
  if (!s1 && !s2) return 1;
  if (!s1 || !s2) return 0;
  const m = s1.length, n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  const dist = dp[m][n];
  const maxLen = Math.max(m, n);
  return 1 - dist / maxLen;
};

// 原文候補の決定ルール：原文*.txt を最優先 → 無ければ ja/en 以外の .txt 最大サイズ
function resolveSrcPath(dir, folderId) {
  const files = fs.readdirSync(dir);
  const txts = files.filter(n => n.toLowerCase().endsWith('.txt'));

  // 1) 原文*.txt 優先（大小混在対応・全角対応）
  const genbunRegex = /^原文.*\.txt$/i;
  const genbunCandidates = txts.filter(n => genbunRegex.test(n));
  if (genbunCandidates.length > 0) {
    // もし複数あれば、(a) フォルダIDを含むもの優先 → (b) サイズ最大
    let best = genbunCandidates[0];
    // (a) ID一致を優先
    const idRegex = new RegExp(folderId);
    const idMatches = genbunCandidates.filter(n => idRegex.test(n));
    const pool = idMatches.length > 0 ? idMatches : genbunCandidates;
    // (b) サイズ最大
    let bestSize = -1;
    for (const name of pool) {
      const size = fs.statSync(path.join(dir, name)).size;
      if (size > bestSize) { best = name; bestSize = size; }
    }
    return { srcPath: path.join(dir, best), chosen: best };
  }

  // 2) それ以外：ja/en以外の .txt の最大サイズ
  const others = txts.filter(n => {
    const low = n.toLowerCase();
    return low !== JA_NAME && low !== EN_NAME;
  });
  if (others.length > 0) {
    let best = others[0], bestSize = fs.statSync(path.join(dir, best)).size;
    for (const name of others.slice(1)) {
      const sz = fs.statSync(path.join(dir, name)).size;
      if (sz > bestSize) { best = name; bestSize = sz; }
    }
    return { srcPath: path.join(dir, best), chosen: best };
  }

  // 3) 見つからない
  return { srcPath: null, chosen: null };
}

// ===== 実行本体 =====
ensureDir(OUT_DIR);
const rows = []; // 出力レコード（行ごとに1 issue）
const summary = { ja: 0, en: 0, totalIssues: 0 };

const PLACEHOLDER_RE = /\{[^}]{0,150}\}|\[[^\]]{0,150}\]|<[^>]{0,150}>|%%|TODO|TRANSLATE/i;

for (const folder of FOLDERS) {
  const dir = path.join(ROOT, folder);

  // 原文の特定
  const { srcPath, chosen } = resolveSrcPath(dir, folder);
  const jaPath = path.join(dir, JA_NAME);
  const enPath = path.join(dir, EN_NAME);

  const src = srcPath ? readTxt(srcPath) : null;
  if (src === null) {
    rows.push({
      id: folder,
      lang: 'both',
      issue: 'missing_src',
      path: srcPath ?? path.join(dir, '原文*.txt'),
      detail: 'expected 原文*.txt or any *.txt except ja/en'
    });
    summary.totalIssues++;
    // 原文がないと品質評価できないので次へ
    continue;
  }

  const srcParas = src.split(/\n{2,}/).length;
  const srcLen = src.length;

  // 言語別チェック
  const check = (lang, p, expect) => {
    const itemBase = { id: folder, lang, path: p };

    if (!fs.existsSync(p)) {
      rows.push({ ...itemBase, issue: 'missing_target', detail: path.basename(p) });
      summary[lang]++; summary.totalIssues++;
      return;
    }

    const tgt = readTxt(p);
    const issues = [];
    const trimmed = (tgt ?? '').trim();

    // 0) メタ情報（どの原文を採用したか）
    rows.push({
      id: folder,
      lang,
      issue: 'info_src_chosen',
      path: srcPath,
      detail: chosen ?? path.basename(srcPath)
    });

    // 1) 空/短すぎ
    if (!trimmed) issues.push('empty');
    if (trimmed.length < MIN_CHARS) issues.push('too_short');

    // 2) 原文比で短すぎ
    if (srcLen >= 200 && trimmed.length / srcLen < MIN_RATIO_TO_SRC) {
      issues.push('too_short_vs_src');
    }

    // 3) プレースホルダ/未訳痕
    if (PLACEHOLDER_RE.test(tgt)) issues.push('placeholder_left');

    // 4) 原文とほぼ同一
    const sim = similarity(src, tgt);
    if (sim > MAX_IDENTICAL) issues.push('almost_identical');

    // 5) 言語らしさ
    if (expect === 'ja') {
      if (!isJapaneseLike(tgt) && isEnglishLike(tgt)) issues.push('lang_mismatch_expected_ja');
    } else if (expect === 'en') {
      if (!isEnglishLike(tgt) && isJapaneseLike(tgt)) issues.push('lang_mismatch_expected_en');
    }

    // 6) 段落崩れ（原文>=3段落なら比率チェック）
    const tgtParas = (tgt ?? '').split(/\n{2,}/).length;
    if (srcParas >= 3 && tgtParas <= Math.max(1, Math.floor(srcParas * PARA_LOSS_RATIO))) {
      issues.push('paragraph_loss');
    }

    for (const iss of issues) {
      rows.push({ ...itemBase, issue: iss });
      summary[lang]++; summary.totalIssues++;
    }
  };

  check('ja', jaPath, 'ja');
  check('en', enPath, 'en');
}

// ===== 出力 =====
const reportJson = path.join(OUT_DIR, 'kannon_audit.json');
const reportCsv  = path.join(OUT_DIR, 'kannon_audit.csv');

fs.writeFileSync(reportJson, JSON.stringify(rows, null, 2), 'utf8');

const csvHeader = 'id,lang,issue,path,detail';
const csvLines = rows.map(r => [
  r.id ?? '', r.lang ?? '', r.issue ?? '', r.path ?? '', r.detail ?? ''
].map(x => `"${String(x).replace(/"/g, '""')}"`).join(','));
fs.writeFileSync(reportCsv, [csvHeader, ...csvLines].join('\n'), 'utf8');

// サマリ
const byIssue = rows.reduce((m, r) => {
  m[r.issue] = (m[r.issue] ?? 0) + 1;
  return m;
}, {});

console.log(`[kannon_audit] DONE`);
console.log(`  total folders scanned: ${FOLDERS.length}`);
console.log(`  total issues: ${summary.totalIssues}`);
console.log(`  ja issues: ${summary.ja}, en issues: ${summary.en}`);
console.log(`  breakdown by issue:`, byIssue);
console.log(`  wrote: ${reportJson}`);
console.log(`  wrote: ${reportCsv}`);
