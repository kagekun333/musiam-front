import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const FILE = path.join(ROOT, "scripts", "migrate_kannon100_to_split.mjs");

// 1) 読み込み＆バックアップ
let src = await fs.readFile(FILE, "utf8");
const bakDir = path.join(ROOT, "scripts", "_backup");
await fs.mkdir(bakDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:TZ.]/g,"").slice(0,14);
await fs.writeFile(path.join(bakDir, `migrate_kannon100_to_split.${stamp}.round2.bak.mjs`), src);

// ユーティリティ：関数を関数名で置換
function replaceFunction(name, body){
  const re = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n\\}`, "m");
  if (!re.test(src)) throw new Error(`${name} が見つかりません。`);
  src = src.replace(re, body.trim());
}

// 2) isHeading を強化（漢数字対応・厳密見出し検出）
replaceFunction("isHeading", `
function isHeading(s){
  if(!s) return false;
  const t = s.trim();

  // 例: "第一 大吉" / "第二籤 小吉" / "第四 吉" / "第五 凶"
  //    "第〇一籤 末吉" 等も拾う。漢数字と数字の両方対応。
  const cnNums = "零〇一二三四五六七八九十百千兩两";
  const rankMod = "[大中小末半]?";
  const rank    = "[吉凶]";
  const qian    = "(籤|签)?";
  const pat = new RegExp("^第[" + cnNums + "\\\\d]+\\s*" + qian + "\\s*" + rankMod + rank + "(?:\\s|$)");
  if (pat.test(t)) return true;

  // 「第」がなくても短いランク単独見出し（例: "大吉", "凶"）は見出しとみなす
  if (/^\\s*[大中小末半]?([吉凶])\\s*$/.test(t)) return true;

  return false;
}
`);

// 3) 前処理：見出し直後で強制改行（ヘッダ+本文が1行に連結される個体差対策）
//   アンカー文を探して、その直後に正規化ブロックを（未注入なら）注入
{
  const anchor = "const rawLines = (await fs.readFile(gpath,\"utf8\")).split(/\\r?\\n/);";
  if (src.includes(anchor) && !src.includes("// __INSERTED__: normalize heading-newline")) {
    const injection = `
${anchor}
// __INSERTED__: normalize heading-newline
{
  let raw = (await fs.readFile(gpath,"utf8"));
  // 見出しの直後に改行を強制注入（例: "第五 凶" の直後で切る）
  raw = raw.replace(/(第[零〇一二三四五六七八九十百千兩两\\d]+\\s*(?:籤|签)?\\s*[大中小末半]?[吉凶])(?!\\n)/g, "$1\\n");
  // 句点などで潰れている場合の保険：ランク単独の直後にも改行
  raw = raw.replace(/(^|\\n)\\s*([大中小末半]?[吉凶])\\s*(?!\\n)/g, "$1$2\\n");
  var rawLines = raw.split(/\\r?\\n/);
}
`.trim();
    src = src.replace(anchor, injection);
  }
}

// 4) 4句不足時の強化抽出：全文から漢字4–8字を拾うサブルートを注入
if (!src.includes("function extractPoemByRegex")) {
  const injectAfter = "function fallbackTo4(raw){";
  // 見つかるはずの行の直前に新関数を差し込む
  const re = /function\s+fallbackTo4\s*\(\s*raw\s*\)\s*\{[\s\S]*?\n\}/m;
  if (re.test(src)) {
    const add = `
// 口語や見出しを除外して、全文から4〜8字の漢字句を拾う
function extractPoemByRegex(full){
  const out=[];
  const ban = /[のがをはにで了的吧呢嗎个個們着著把与與於而及和]/;
  const bad = /(第[零〇一二三四五六七八九十百千兩两\\d]+\\s*(?:籤|签)?|[大中小末半]?[吉凶])/;
  const rx  = /[\\p{Script=Han}]{4,8}/gu;
  let m;
  while((m = rx.exec(full)) && out.length<8){
    const seg = m[0];
    if (bad.test(seg)) continue;
    if (ban.test(seg)) continue;
    if (!out.includes(seg)) out.push(seg);
  }
  return out.slice(0,4);
}
`.trim();
    src = src.replace(re, m => add + "\n\n" + m);
  } else {
    throw new Error("fallbackTo4 が見つからず、extractPoemByRegex を注入できませんでした。");
  }
}

// 5) 候補が4未満のとき、extractPoemByRegex を使って補完（冪等）
{
  const hook = "if (candidates2.length>=4) poem4 = candidates2.slice(0,4);";
  if (src.includes(hook) && !src.includes("// __INSERTED__: regex-based supplement")) {
    src = src.replace(
      hook,
      `
${hook}
else if (candidates2.length>0){
  // まず既存候補を活かしつつ不足分を全文から補完
  const extra = extractPoemByRegex(rawLines.join("\\n"));
  const pool = [...candidates2];
  for(const e of extra){ if (pool.length>=4) break; if(!pool.includes(e)) pool.push(e); }
  poem4 = (pool.length>=4 ? pool.slice(0,4) : fallbackTo4(rawLines.join(" ")));
} else {
  // __INSERTED__: regex-based supplement
  const extra = extractPoemByRegex(rawLines.join("\\n"));
  poem4 = (extra.length===4 ? extra : fallbackTo4(rawLines.join(" ")));
}
`.trim()
    );
  }
}

// 6) 最後に書き戻し
await fs.writeFile(FILE, src);
console.log("✅ round2 patched:", FILE);
