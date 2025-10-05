// scripts/extract_fortunes.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT   = process.cwd();
const LOCALE = path.join(ROOT, "src", "data", "omikuji", "locale");
const SRC    = path.join(ROOT, "src", "data", "kannon100");

const jaPath = path.join(LOCALE, "ja.json");
const enPath = path.join(LOCALE, "en.json");

const ja = JSON.parse(fs.readFileSync(jaPath, "utf8"));
const en = JSON.parse(fs.readFileSync(enPath, "utf8"));

/** 表記ゆれ語彙 → itemsキー */
const VOCAB = {
  wish:      ["願望"],
  health:    ["疾病", "病氣", "病气", "病気"],
  lost:      ["遺失物", "遺失", "失物"],
  person:    ["盼望的人", "盼望之人", "所盼之人", "尋人", "待人"],
  houseMove: ["蓋新居", "蓋房子", "房子", "宅墓", "搬家", "新居", "建屋", "移徙", "遷居"],
  marriage:  ["結婚", "嫁娶", "結親緣", "婚姻", "交往", "喜慶祝賀", "喜慶", "婚事", "親緣", "結親"],
  travel:    ["旅行", "出行", "行動", "行程", "出遊", "出游", "行路", "遠行", "遠游", "遠遊", "出門", "出门"],
};

const WORD2KEY = Object.entries(VOCAB).reduce((m, [k, arr]) => { for (const w of arr) m.set(w, k); return m; }, new Map());
const tokenAlt = [...WORD2KEY.keys()].map(escapeReg).join("|");
// 区切り：読点・頓号・スラッシュ・空白・全角空白・「等」
const conn = "(?:、|，|,|／|/|・|\\s|　|等)+";

const LABEL_RX = new RegExp(`^(?<labels>(?:${tokenAlt})(?:${conn}(?:${tokenAlt}))*)[:：]\\s*(?<valueSame>.*)?$`);
const LABEL_ONLY_RX = new RegExp(`^(?<labels>(?:${tokenAlt})(?:${conn}(?:${tokenAlt}))*)$`);

// 行内に複数の「ラベル：値」を含むケースを一括抽出（次のラベル出現までを値として扱う）
const INLINE_SEG_RX = new RegExp(
  `(?<labels>(?:${tokenAlt})(?:${conn}(?:${tokenAlt}))*)[:：]\\s*(?<value>[^:：]*?)\\s*(?=(?:${tokenAlt})(?:${conn}(?:${tokenAlt}))*(?:[:：])|$)`,
  "g"
);

function escapeReg(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function tidy(s){ return (s||"").replace(/\u3000/g," ").trim(); }

/** 連結ラベル対策：区切りでsplit→さらに部分一致でVOCAB語を拾う */
function labelsToKeys(labelStr){
  const raw = labelStr.replace(/等$/,"");
  const tokens = raw.split(new RegExp(conn, "u")).map(tidy).filter(Boolean);

  // まずは完全一致で拾う
  const keysSet = new Set();
  for (const tok of tokens){
    const k = WORD2KEY.get(tok);
    if (k) keysSet.add(k);
  }
  // 連結対策：各トークンにVOCAB語が部分文字列として含まれていれば加点
  if (keysSet.size === 0 || tokens.some(t => !WORD2KEY.has(t))){
    // 長い語から順に部分一致探索（誤爆抑制）
    const vocabWords = [...WORD2KEY.keys()].sort((a,b)=>b.length-a.length);
    for (const t of tokens.length ? tokens : [raw]){
      for (const vw of vocabWords){
        if (t.includes(vw)){
          keysSet.add(WORD2KEY.get(vw));
        }
      }
    }
  }
  return [...keysSet];
}

/** 行内「ラベル：値」ペアの一括抽出（同一行に複数あるケース用） */
function extractInlinePairs(line){
  const pairs = [];
  let m;
  INLINE_SEG_RX.lastIndex = 0;
  while ((m = INLINE_SEG_RX.exec(line)) !== null){
    const labels = tidy(m.groups?.labels || "");
    const value  = tidy(m.groups?.value  || "");
    if (!labels || !value) continue;
    const keys = labelsToKeys(labels);
    if (keys.length === 0) continue;
    pairs.push({ keys, value });
  }
  return pairs;
}

/** lines[i]から同一行 or 折返し（「：」のみ行）→ 次非空行を値として取得 */
function pickValue(lines, i){
  const same = lines[i].match(LABEL_RX)?.groups?.valueSame;
  if (same && tidy(same)) return tidy(same);

  for (let j=i+1; j<Math.min(i+6, lines.length); j++){
    const v = tidy(lines[j]);
    if (!v) continue;
    if (LABEL_RX.test(v) || LABEL_ONLY_RX.test(v)) return "";
    if (/^[:：]$/.test(v)){
      for (let k=j+1; k<Math.min(j+4, lines.length); k++){
        const vv = tidy(lines[k]);
        if (!vv) continue;
        if (LABEL_RX.test(vv) || LABEL_ONLY_RX.test(vv)) return "";
        return vv.replace(/^[^:：]+[:：]\s*/, "").trim();
      }
      return "";
    }
    return v.replace(/^[^:：]+[:：]\s*/, "").trim();
  }
  return "";
}

/** 第一段：通常抽出（複合・折返し対応）＋ 行内ペア抽出で先に埋める */
function extractPrimary(lines){
  const out = { wish:"", health:"", lost:"", person:"", houseMove:"", marriage:"", travel:"" };

  for (let i=0; i<lines.length; i++){
    const line = tidy(lines[i]);
    if (!line) continue;

    // 先に同一行での「複数ラベル：値」ペアを丸ごと処理
    const pairs = extractInlinePairs(line);
    for (const {keys, value} of pairs){
      for (const k of keys){ if (!out[k]) out[k] = value; }
    }
    // まだ空いているキーがあるなら、従来の「ラベル行→値行」を処理
    if (Object.values(out).every(Boolean)) continue;

    let labels = "";
    const m1 = line.match(LABEL_RX);
    if (m1){ labels = tidy(m1.groups?.labels||""); }
    else {
      const m2 = line.match(LABEL_ONLY_RX);
      if (!m2) continue;
      labels = tidy(m2.groups?.labels||"");
    }
    const keys = labelsToKeys(labels);
    if (keys.length===0) continue;

    const value = pickValue(lines, i);
    if (!value) continue;

    for (const k of keys){
      if (!out[k]) out[k] = value;
    }
  }
  return out;
}

/** 第二段フォールバック：該当語が含まれる行を大雑把に拾って次行の値を配布 */
function extractFallback(lines, current){
  const out = { ...current };
  const anyToken = new RegExp(`${tokenAlt}`);
  for (let i=0; i<lines.length; i++){
    const line = tidy(lines[i]);
    if (!line || !anyToken.test(line)) continue;

    const keys = labelsToKeys(line.replace(/[:：].*$/,""));
    if (keys.length===0 || keys.every(k => out[k])) continue;

    // 値候補：同一行のコロン以降→なければ次の非空行
    let value = "";
    const colonIdx = Math.max(line.indexOf("："), line.indexOf(":"));
    if (colonIdx >= 0){
      const tail = tidy(line.slice(colonIdx+1));
      if (tail) value = tail;
    }
    if (!value){
      for (let j=i+1; j<Math.min(i+4, lines.length); j++){
        const vv = tidy(lines[j]);
        if (!vv) continue;
        if (LABEL_RX.test(vv) || LABEL_ONLY_RX.test(vv)) break;
        value = vv.replace(/^[^:：]+[:：]\s*/, "").trim();
        break;
      }
    }
    if (!value) continue;

    for (const k of keys){
      if (!out[k]) out[k] = value;
    }
  }
  return out;
}

function extractFortunesFromText(text){
  const lines = text.split(/\r?\n/).map(tidy);
  let out = extractPrimary(lines);
  const needs = ["wish","health","lost","person","houseMove","marriage","travel"].filter(k => !out[k]);
  if (needs.length){
    out = extractFallback(lines, out);
  }
  return out;
}

function updateLocale(localeArr){
  for (const rec of localeArr){
    const n = String(rec.id).padStart(3,"0");
    const gpath = path.join(SRC, n, `原文${n}.txt`);
    if (!fs.existsSync(gpath)) continue;

    const raw = fs.readFileSync(gpath, "utf8");
    const items = extractFortunesFromText(raw);
    rec.items = { ...rec.items, ...items };
  }
}

// 実行＆保存
updateLocale(ja);
updateLocale(en);
fs.writeFileSync(jaPath, JSON.stringify(ja,null,2));
fs.writeFileSync(enPath, JSON.stringify(en, null, 2));
console.log("✅ fortunes extracted → locale/ja.json & en.json updated");
