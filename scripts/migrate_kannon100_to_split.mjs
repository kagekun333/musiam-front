import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SRC  = path.join(ROOT, "src", "data", "kannon100");
const OUT  = path.join(ROOT, "src", "data", "omikuji");
const LOCALE = path.join(OUT, "locale");
await fs.mkdir(OUT, {recursive:true});
await fs.mkdir(LOCALE, {recursive:true});

// 許容ランク（\uXXXX）
const RANKS = new Set([
  "\u5927\u5409","\u4E2D\u5409","\u5C0F\u5409","\u5409",
  "\u534A\u5409","\u672B\u5409","\u672B\u5C0F\u5409",
  "\u51F6","\u5C0F\u51F6","\u534A\u51F6","\u672B\u51F6","\u5927\u51F6"
]);
const DEFAULT_RANK = "\u5409"; // 吉
const GEN = "\u539F\u6587";    // 原文

const exists = async p => !!(await fs.stat(p).catch(()=>null));
const tidy = s => s.replace(/\u3000/g," ").trim().replace(/[.\u3002\uFF0E]\s*$/,"");

// 見出しか判定
function isHeading(s){
  if(!s) return false;
  const t = s.trim();
  const cnNums = "零〇一二三四五六七八九十百千兩两";
  const rankMod = "[大中小末半]?";
  const rank    = "[吉凶]";
  const qian    = "(籤|签)?";
  const pat = new RegExp("^第[" + cnNums + "\\d]+\\s*" + qian + "\\s*" + rankMod + rank + "(?:\\s|$)");
  if (pat.test(t)) return true;
  if (/^\s*[大中小末半]?[吉凶]\s*$/.test(t)) return true;
  return false;
}

// 詩候補判定
function isPoemCandidate(s){
  if (!s) return false;
  if (isHeading(s)) return false;
  if (/[：:\uFF1A，、,\uFF0C\u3001\u3002。]/.test(s)) return false;
  const t = s.replace(/\s/g, "");
  const han = (t.match(/[\p{Script=Han}]/gu)||[]).length;
  const all = t.length;
  if (all < 4 || all > 12) return false;
  if (/[のがをはにで了的吧呢嗎個們著把]/.test(t)) return false;
  return han / all >= 0.7;
}

// 短句マージ
function mergeShorts(arr){
  const tmp=[];
  for (let i=0;i<arr.length;i++){
    let s = arr[i];
    while (s.length < 4 && i+1 < arr.length) {
      const nx = arr[i+1];
      if (nx.length <= 2 && !/[：:\uFF1A，、,\uFF0C\u3001\u3002。]/.test(nx)) {
        s += nx; i++;
      } else break;
    }
    tmp.push(s);
  }
  const out=[];
  for (let i=0;i<tmp.length;i++){
    const cur = tmp[i];
    const nxt = tmp[i+1];
    if (nxt && nxt.length===1 && cur.length<=6) {
      out.push(cur + nxt); i++;
    } else {
      out.push(cur);
    }
  }
  return out;
}

// 正規表現補完
function extractPoemByRegex(full){
  const out=[];
  const ban = /[のがをはにで了的吧呢嗎个個們着著把与與於而及和]/;
  const bad = /(第[零〇一二三四五六七八九十百千兩两\d]+\s*(?:籤|签)?|[大中小末半]?[吉凶])/;
  const rx  = /[\p{Script=Han}]{4,8}/gu;
  let m;
  while((m = rx.exec(full)) && out.length<8){
    const seg = m[0];
    if (bad.test(seg)) continue;
    if (ban.test(seg)) continue;
    if (!out.includes(seg)) out.push(seg);
  }
  return out.slice(0,4);
}

// fallback
function fallbackTo4(raw){
  const joined = raw.replace(/\s+/g," ").trim();
  const L = Math.max(1, Math.ceil(joined.length/4));
  return [0,1,2,3].map(i=> tidy(joined.slice(i*L,(i+1)*L)) || "(missing)");
}

function parseRankFromFirstLine(line){
  if (!line) return null;
  for (const r of RANKS){ if (line.includes(r)) return r; }
  return null;
}

const core=[], ja=[], en=[], audit=[];

for (let id=1; id<=100; id++){
  const n = String(id).padStart(3,"0");
  const dir = path.join(SRC, n);

  const candidates = [
    path.join(dir, `${GEN}${n}.txt`),
    path.join(dir, `${GEN}.txt`),
    path.join(SRC, `${GEN}${n}.txt`),
    path.join(dir, "genbun.txt"),
    path.join(dir, "poem.txt"),
  ];
  let gpath=null; for (const c of candidates){ if (await exists(c)) { gpath=c; break; } }
  if (!gpath) throw new Error(`[MISSING] genbun for id=${id}`);

  // 原文ロード＋見出し改行補正
  let raw = await fs.readFile(gpath,"utf8");
  raw = raw.replace(/(第[零〇一二三四五六七八九十百千兩两\d]+\s*(?:籤|签)?\s*[大中小末半]?[吉凶])(?!\n)/g, "$1\n");
  raw = raw.replace(/(^|\n)\s*([大中小末半]?[吉凶])\s*(?!\n)/g, "$1$2\n");
  const rawLines = raw.split(/\r?\n/);

  const firstLine = rawLines.find(s=>s.trim().length>0) || "";
  const rank = parseRankFromFirstLine(firstLine) || DEFAULT_RANK;

  // 詩候補抽出
  let lines = rawLines.map(tidy).filter(Boolean);
  lines = lines.filter(s => !isHeading(s));
  let candidates2 = lines.filter(isPoemCandidate);
  candidates2 = candidates2.filter(s => s.length >= 4 && s.length <= 12);
  candidates2 = mergeShorts(candidates2).map(tidy).filter(Boolean);

  let poem4;
  if (candidates2.length>=4) {
    poem4 = candidates2.slice(0,4);
  } else if (candidates2.length>0) {
    const extra = extractPoemByRegex(rawLines.join("\n"));
    const pool = [...candidates2];
    for(const e of extra){ if (pool.length>=4) break; if(!pool.includes(e)) pool.push(e); }
    poem4 = (pool.length>=4 ? pool.slice(0,4) : fallbackTo4(rawLines.join(" ")));
  } else {
    const extra = extractPoemByRegex(rawLines.join("\n"));
    poem4 = (extra.length===4 ? extra : fallbackTo4(rawLines.join(" ")));
  }

  const front = path.join(dir, "front.jpg");
  const back  = path.join(dir, "back.jpg");

  core.push({ id, rank, poem_kanji: poem4 });

  const empty = { wish:"", health:"", lost:"", person:"", houseMove:"", marriage:"" };
  ja.push({ id, label:{ short: `No.${id}` }, summary:"", items: {...empty} });
  en.push({ id, label:{ short: `No.${id}` }, summary:"", items: {...empty} });

  audit.push({
    id,
    sources: {
      front: (await exists(front)) ? `/data/kannon100/${n}/front.jpg` : undefined,
      back:  (await exists(back))  ? `/data/kannon100/${n}/back.jpg`  : undefined,
      genbun_txt: gpath.replace(ROOT,"").replace(/\\/g,"/")
    },
    flags:[],
    checked_at: new Date().toISOString()
  });
}

const write = async (p,o)=>{ await fs.mkdir(path.dirname(p),{recursive:true}); await fs.writeFile(p, JSON.stringify(o,null,2)); console.log("WRITE",p); };

await write(path.join(OUT,"core.json"), core);
await write(path.join(LOCALE,"ja.json"), ja);
await write(path.join(LOCALE,"en.json"), en);
await write(path.join(OUT,"audit.json"), audit);
console.log("✅ migrate: done.");
