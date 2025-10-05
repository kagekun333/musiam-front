import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SRC  = path.join(ROOT, "src", "data", "kannon100");
const OUT  = path.join(ROOT, "src", "data", "omikuji");
const LOCALE = path.join(OUT, "locale");
await fs.mkdir(OUT, {recursive:true});
await fs.mkdir(LOCALE, {recursive:true});

// 許容ランク（\uXXXX）
const RANKS = new Set(["\u5927\u5409","\u4E2D\u5409","\u5C0F\u5409","\u5409","\u534A\u5409","\u672B\u5409","\u672B\u5C0F\u5409","\u51F6","\u5C0F\u51F6","\u534A\u51F6","\u672B\u51F6","\u5927\u51F6"]);
const DEFAULT_RANK = "\u5409"; // 吉
const GEN = "\u539F\u6587";    // 原文

const exists = async p => !!(await fs.stat(p).catch(()=>null));
const tidy = s => s.replace(/\u3000/g," ").trim().replace(/[.\u3002\uFF0E]\s*$/,"");

// 見出しか判定（第 / 籤 / 吉凶 / 数字）
function isHeading(s){
  if(!s) return false;
  const hasDi   = s.includes("\u7B2C");   // 第
  const hasQian = s.includes("\u7C64");   // 籤
  const hasRank = /[\u5409\u51F6]/u.test(s); // 吉 or 凶
  const hasNum  = /\d/.test(s);
  // 例: "第一 大吉" / "第二籤 小吉" / "第四 吉"
  return (hasDi && (hasQian || hasNum || hasRank)) || (hasRank && s.length<=6);
}

// 漢字率で詩候補か判定（句読点・コロンは除外）
function isPoemCandidate(s){
  if (!s) return false;
  if (isHeading(s)) return false;
  if (/[：:\uFF1A]/.test(s)) return false;
  if (/[，、,\uFF0C\u3001\u3002。]/.test(s)) return false;
  const wo = s.replace(/\s/g,"");
  const han = (wo.match(/[\p{Script=Han}]/gu)||[]).length;
  const all = wo.length;
  return all>0 && han/all >= 0.6;
}

// 極短行の結合（例: "佳人一" + "炷" + "香"）
function mergeShorts(arr){
  const out=[];
  for (let i=0;i<arr.length;i++){
    let s = arr[i];
    if (s.length<4){
      while (s.length<4 && i+1<arr.length && arr[i+1].length<=3 && !/[，、,\uFF0C\u3001\u3002。:：]/.test(arr[i+1])) {
        s += arr[++i];
      }
    }
    out.push(s);
  }
  return out;
}

// 最終手段：全体を4等分
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

  const rawLines = (await fs.readFile(gpath,"utf8")).split(/\r?\n/);
  const firstLine = rawLines.find(s=>s.trim().length>0) || "";
  const rank = parseRankFromFirstLine(firstLine) || DEFAULT_RANK;

  // 見出し除外 → 詩候補抽出 → 短行結合
  let lines = rawLines.map(tidy).filter(Boolean);
  lines = lines.filter(s => !isHeading(s));
  lines = lines.filter(s => !/[：:\uFF1A]/.test(s) || s.length<=2);
  lines = lines.filter(s => !/[，、,\uFF0C\u3001\u3002。]/.test(s) || s.length<=3);

  let candidates2 = lines.filter(isPoemCandidate);
  candidates2 = mergeShorts(candidates2).map(tidy).filter(Boolean);

  let poem4;
  if (candidates2.length>=4) poem4 = candidates2.slice(0,4);
  else if (candidates2.length>0){
    poem4 = [...candidates2];
    for (const x of fallbackTo4(rawLines.join(" "))){
      if (poem4.length>=4) break;
      if (!poem4.includes(x)) poem4.push(x);
    }
    poem4 = poem4.slice(0,4);
  } else {
    poem4 = fallbackTo4(rawLines.join(" "));
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
