// scripts/fix_bundle_heading_from_core.mjs
import fs from "node:fs";

// ---- helpers ----
function getCorePoem(rec) {
  if (rec?.poem?.hanbun && Array.isArray(rec.poem.hanbun)) return rec.poem.hanbun;
  if (Array.isArray(rec.poem_kanji)) return rec.poem_kanji;
  if (Array.isArray(rec.poem)) return rec.poem;
  return [];
}

// 見出し検出を少し強めに（簡体「签」も拾う）
const HEAD_RX_HARD = [
  // 冒頭が「第〇…（大吉/中吉/小吉/吉/半吉/末吉/末小吉/凶/小凶/大凶）」の行
  /^[第].*?(?:大吉|中吉|小吉|吉|半吉|末吉|末小吉|凶|小凶|大凶)/u,
  // 「籤」「签」を含む行
  /[籤签]/u,
  // 「第〇〜」かつ「吉/凶」を含む行
  /^第[\d〇零一二三四五六七八九十百千]+.*[吉凶]/u,
];

function isHeadingLine(s){
  const t = (s ?? "").trim();
  if (!t) return false;
  return HEAD_RX_HARD.some(rx => rx.test(t));
}

function sanitizeToFour(lines) {
  const clean = (lines || []).filter(l => !isHeadingLine(l)).filter(Boolean);
  return clean.slice(0, 4);
}

// ---- load core ----
const core = JSON.parse(fs.readFileSync("src/data/omikuji/core.json", "utf8"));
const coreMap = new Map(core.map(it => [it.id, sanitizeToFour(getCorePoem(it))]));

// ---- fix each bundle ----
for (const lang of ["ja", "en"]) {
  const p = `dist/omikuji_bundle.${lang}.json`;
  const arr = JSON.parse(fs.readFileSync(p, "utf8"));
  let fixed = 0;

  for (const it of arr) {
    const lines = it?.poem?.hanbun;
    if (!Array.isArray(lines)) continue;

    // 1) まず自前で除去
    let next = sanitizeToFour(lines);

    // 2) 4句未満 or まだ見出しがあれば core を正とする
    if (next.length !== 4 || next.some(isHeadingLine)) {
      const fallback = coreMap.get(it.id) || [];
      if (fallback.length === 4) {
        next = fallback;
      } else {
        // 最後の保険：自前クリーン + core を合成して先頭4句
        next = sanitizeToFour([...next, ...fallback]);
      }
    }

    if (Array.isArray(next) && next.length === 4 && next.every(s => s && s.trim())) {
      // 変更があるときだけ反映
      const changed = JSON.stringify(next) !== JSON.stringify(lines);
      if (changed) {
        it.poem.hanbun = next;
        fixed++;
      }
    }
  }

  fs.writeFileSync(p, JSON.stringify(arr, null, 2));
  console.log(`fixed ${fixed} entries in ${p}`);
}
