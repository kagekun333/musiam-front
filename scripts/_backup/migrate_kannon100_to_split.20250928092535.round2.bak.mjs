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

  // 句読点・コロンなどは古典四句では原則使わない
  if (/[：:\uFF1A，、,\uFF0C\u3001\u3002。]/.test(s)) return false;

  const t = s.replace(/\s/g, "");
  const han = (t.match(/[\p{Script=Han}]/gu)||[]).length;
  const all = t.length;

  // 古典の定型：おおむね4〜12字（5〜7字が多い）
  if (all < 4 || all > 12) return false;

  // 口語助詞が混じる場合は除外
  if (/[のがをはにで了的吧呢嗎個們著把]/.test(t)) return false;

  return han / all >= 0.7;
}

// 極短行の結合（例: "佳人一" + "炷" + "香"）
function mergeShorts(arr){
  const tmp=[];
  for (let i=0;i<arr.length;i++){
    let s = arr[i];
    // まず4字未満は次の極短（〜2字）を連結
    while (s.length < 4 && i+1 < arr.length) {
      const nx = arr[i+1];
      if (nx.length <= 2 && !/[：:\uFF1A，、,\uFF0C\u3001\u3002。]/.test(nx)) {
        s += nx;
        i++;
      } else break;
    }
    tmp.push(s);
  }
  // 後段：単独1字行が残っていたら直前へ吸収（例：「佳人一炷」+「香」）
  const out=[];
  for (let i=0;i<tmp.length;i++){
    const cur = tmp[i];
    const nxt = tmp[i+1];
    if (nxt && nxt.length===1 && cur.length<=6) {
      out.push(cur + nxt);
      i++; // 次を消費
    } else {
      out.push(cur);
    }
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
// 追加フィルタ：4〜12字のみ許容（口語長文や極短の混入を防止）
candidates2 = candidates2.filter(s => s.length >= 4 && s.length <= 12);
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
