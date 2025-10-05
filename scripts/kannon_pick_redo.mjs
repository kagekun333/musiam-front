// scripts/kannon_pick_redo.mjs
// 監査結果 tempdata/kannon_audit.json を読み、再翻訳対象の (id,lang) を抽出。
// 既定では paragraph_loss / almost_identical を対象にする。
// 出力: tempdata/kannon_redo_targets.json

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IN = path.resolve(__dirname, '..', 'tempdata', 'kannon_audit.json');
const OUT = path.resolve(__dirname, '..', 'tempdata', 'kannon_redo_targets.json');

// デフォ対象（必要ならここに "too_short" 等を追加可能）
const TARGET_ISSUES = new Set(['paragraph_loss', 'almost_identical']);

if (!fs.existsSync(IN)) {
  console.error(`[pick_redo] not found: ${IN}. Run kannon_audit.mjs first.`);
  process.exit(1);
}

const audit = JSON.parse(fs.readFileSync(IN, 'utf8'));

// issue→(id,lang) をまとめてユニーク化
const key = (id, lang) => `${id}::${lang}`;
const targetsMap = new Map();

for (const r of audit) {
  if (!r || !r.issue || !r.id || !r.lang) continue;
  if (TARGET_ISSUES.has(r.issue)) {
    const k = key(r.id, r.lang);
    if (!targetsMap.has(k)) targetsMap.set(k, { id: r.id, lang: r.lang });
  }
}

const targets = Array.from(targetsMap.values()).sort((a, b) => a.id.localeCompare(b.id));

fs.writeFileSync(OUT, JSON.stringify(targets, null, 2), 'utf8');

console.log(`[pick_redo] DONE: ${targets.length} targets`);
console.log(`  wrote: ${OUT}`);
