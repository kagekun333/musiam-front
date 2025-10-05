// scripts/postprocess_from_json.js
// JSONの text[] から「見出し / 四句+説明 / ラベル群 / 注意書き」を抽出して 原文NNN.txt を出力
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "src", "data", "kannon100");
const JSON_PATH = path.join(DATA_DIR, "kannon100.json");

// --- 抽出パラメータ（必要なら後でここだけ調整） ---
const MAX_BLANKS = 3;                         // タイトルと説明の間に許す空行数
const WANT_PAIRS = 4;                          // 四句目標
const LABEL_KEYS = [
  "願望","疾病","盼望的人","遺失物","失物",
  "蓋新居","搬家","嫁娶","旅行","交往","商売","求財","學業","訴訟","萬事"
];

// 見出し（第◯ ◯吉 系）
const HEADING_RE = /第[一二三四五六七八九十百零〇\d]+\s*(?:大吉|中吉|小吉|吉|末吉|末小吉|半吉|凶|大凶)/;

// タイトル候補：漢字2-12（句読点なし）
const TITLE_RE = /^[一-龥]{2,12}$/;

// 1行終端とみなす句読点
const SENT_END = /[。．.!！?？]/;

// ノイズを除く（URLやPDF告知、ライブ告知など）
function isNoise(line){
  if (!line) return true;
  const s = line.trim();
  if (!s) return true;
  if (/https?:\/\//i.test(s)) return true;
  if (/youtube|JAXA|PDF|LIVE直播|研究室/i.test(s)) return true;
  if (/^\d{4}\.\d{1,2}\.\d{1,2}/.test(s)) return true;
  if (/^\./.test(s)) return true;
  return false;
}

function normalize(lines){
  // 空白整理＆ノイズ除去（ただし“萬事…”等を残すため全消しはしない）
  const out = [];
  for (let raw of lines){
    if (raw==null) continue;
    let s = String(raw).replace(/\r/g,"").trim();
    if (!s) { out.push(""); continue; }
    // 重複スペースの簡易整理
    s = s.replace(/\u00a0/g," ").replace(/[ \t]+/g," ").replace(/[　]+/g," ");
    out.push(s);
  }
  return out;
}

function readJson(){
  const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  if (!Array.isArray(data)) throw new Error("kannon100.json format?");
  return data;
}

function extractHeading(lines){
  for (const s of lines){
    const m = s.match(HEADING_RE);
    if (m) return m[0].replace(/\s+/g,"");
  }
  return "";
}

function extractPairs(lines){
  // タイトル(漢字のみ) → 直後〜数行以内の説明（句点まで）を探す
  const pairs = [];
  for (let i=0; i<lines.length; i++){
    const t = lines[i];
    if (!t || !TITLE_RE.test(t)) continue;

    // 同一行に説明が続くケース
    const sameLine = t.split(" ");
    if (sameLine.length >= 2 && SENT_END.test(sameLine.slice(1).join(" "))){
      const title = sameLine[0];
      const expl  = sameLine.slice(1).join(" ");
      pairs.push([title, expl]);
      if (pairs.length >= WANT_PAIRS) break;
      continue;
    }

    // 次行以降（空行を挟んでOK）
    let j=i+1, blanks=0, expl="";
    while (j<lines.length && blanks<=MAX_BLANKS){
      const s = lines[j];
      if (!s) { blanks++; j++; continue; }
      if (TITLE_RE.test(s)) break;             // 次のタイトルにぶつかった
      if (SENT_END.test(s)) { expl = s; break; }
      // 句点がない長文は次行を連結して判定
      const cand = s + " " + (lines[j+1]||"");
      if (SENT_END.test(cand)) { expl = cand; break; }
      j++;
    }
    if (expl){
      pairs.push([t, expl]);
      if (pairs.length >= WANT_PAIRS) break;
    }
  }
  return pairs;
}

function extractLabels(lines){
  // 「願望：～」「疾病：～」は同一行 or 次行に値が来る両方を許容
  const res = [];
  for (let i=0; i<lines.length; i++){
    const s = lines[i];
    if (!s) continue;
    for (const k of LABEL_KEYS){
      if (s.startsWith(k+"：") || s.startsWith(k+":")){
        res.push(s);
        break;
      }
      if (s===k+"：" || s===k+":"){
        const next = (lines[i+1]||"").trim();
        if (next) res.push(`${k}：${next}`);
      }
    }
  }
  return res;
}

function extractCaution(lines){
  // 「萬事…」「謹慎」「小心」「當心」「粗心大意…」などを拾う
  for (const s of lines){
    if (!s) continue;
    if (/萬事/.test(s) || /謹慎|小心|當心|粗心大意/.test(s)){
      // 1文だけ返す
      const m = s.match(/.*?[。．.!！?？]/);
      return m ? m[0] : s;
    }
  }
  return "";
}

function buildDoc(heading, pairs, labels, caution){
  const b = [];
  if (heading) b.push(heading, "");
  for (const [t, e] of pairs){
    b.push(t);
    b.push(e);
    b.push("");
  }
  for (const L of labels) b.push(L);
  if (labels.length) b.push("");
  if (caution) b.push(caution);
  return b.join("\n");
}

function run(){
  const arr = readJson();
  let ok=0, fail=0;
  for (const rec of arr){
    const n = rec.number;
    const id = String(n).padStart(3,"0");
    const dir = path.join(DATA_DIR, id);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive:true });

    const lines = normalize(rec.text||[]);
    const linesForCore = lines.filter(s => !isNoise(s)); // 軽いノイズ除去

    const heading = extractHeading(linesForCore);
    const pairs   = extractPairs(linesForCore);
    const labels  = extractLabels(linesForCore);
    const caution = extractCaution(linesForCore);

    const doc = buildDoc(heading, pairs, labels, caution);
    const out = path.join(dir, `原文${id}.txt`);
    fs.writeFileSync(out, doc.trim()+"\n", "utf8");

    if (heading && pairs.length>=2) ok++; else fail++;
  }
  console.log("[postprocess] written 原文NNN.txt  -> OK:", ok, " / weak:", fail);
}
run();
