// scripts/normalize_kannon_headers.mjs
// 目的：ja/en.txt の見出し統一 & 四句クレンジング & 簡易QAレポート
// 入力：src/data/kannon100/NNN/ja.txt, en.txt  （直前工程の同期済みファイル）
// 参照：src/data/omikuji/core.json（四句、既に同期済みだが5字検査に利用）
// 参照：src/data/kannon100/kannon100.json（JA/ENランクのフォールバック）
// 出力：上書き保存（.prev バックアップ作成）

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve("src/data/kannon100");
const CORE = path.resolve("src/data/omikuji/core.json");           // for 5字検査
const META = path.resolve("src/data/kannon100/kannon100.json");    // fallback rank

const START = "=== TEXT START ===";
const END   = "=== TEXT END ===";

const JA_RANK_CANON = ["大吉","吉","小吉","末小吉","半吉","凶"];
const JA_RANK_SYNS = [
  ["大吉", ["大吉","大吉吉","大吉運","第一等大吉"]],
  ["吉",   ["吉","吉運","中吉","良"]],
  ["小吉", ["小吉"]],
  ["末小吉", ["末小吉","末吉","末小"]],
  ["半吉", ["半吉","半小吉","半吉運"]],
  ["凶",   ["凶","不吉","凶運","悪運","凶惡","凶悪"]],
];

const EN_RANK_CANON = [
  ["Great Fortune", ["Great Fortune","Great Good Fortune","Great Auspice","Great Blessing","Great"]],
  ["Good Fortune",  ["Good Fortune","Good"]],
  ["Small Fortune", ["Small Fortune","Small Good Fortune"]],
  ["Minor Good Fortune", ["Minor Good Fortune","Minor Good"]],
  ["Half Good Fortune",  ["Half Good Fortune","Half Good","Semi-Lucky","Half Lucky"]],
  ["Misfortune",    ["Misfortune","Unlucky","Bad Luck"]],
];

const toLines = t => t.replace(/^\uFEFF/, "").replace(/\r/g,"").split("\n");
const strip = s => (s||"").trim();
const isFiveHan = s => /^[\p{Script=Han}]{5}$/u.test(strip(s));
const kanjiNums = ["零","一","二","三","四","五","六","七","八","九"];
function toKanji(num){
  // 1〜100 専用の簡易（十進）表記：第九十五 → 9*10+5 等
  if (num === 100) return "百";
  const tens = Math.floor(num/10), ones = num%10;
  let out = "";
  if (tens>0){
    if (tens===1) out += "十";
    else out += kanjiNums[tens] + "十";
  }
  if (ones>0) out += kanjiNums[ones];
  if (out==="") out = "零";
  return out;
}
function ordinalEn(n){
  const ords = ["Zero","First","Second","Third","Fourth","Fifth","Sixth","Seventh","Eighth","Ninth","Tenth"];
  // 簡易：11-19, 20-99 にも対応（例: Twenty-First）
  const small = ["","First","Second","Third","Fourth","Fifth","Sixth","Seventh","Eighth","Ninth"];
  const tensWords = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
  if (n<=10) return ords[n];
  if (n<20){
    const map = {11:"Eleventh",12:"Twelfth",13:"Thirteenth",14:"Fourteenth",15:"Fifteenth",16:"Sixteenth",17:"Seventeenth",18:"Eighteenth",19:"Nineteenth"};
    return map[n];
  }
  if (n===100) return "One Hundredth";
  const tens = Math.floor(n/10), ones = n%10;
  if (ones===0) return `${tensWords[tens]}ieth`.replace("y ieth","ieth"); // Forty → Fortieth 対応簡易
  const base = tensWords[tens];
  const ord = small[ones].replace(/First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth/, m=>{
    const map={First:"First",Second:"Second",Third:"Third",Fourth:"Fourth",Fifth:"Fifth",Sixth:"Sixth",Seventh:"Seventh",Eighth:"Eighth",Ninth:"Ninth"}; return map[m];
  });
  return `${base}-${ord}`;
}
function canonRankJA(s){
  const src = strip(s);
  for (const [canon, alts] of JA_RANK_SYNS){
    if (src.includes(canon)) return canon;
    for (const a of alts){ if (src.includes(a)) return canon; }
  }
  return ""; // 未判定
}
function canonRankEN(s){
  const src = strip(s);
  for (const [canon, alts] of EN_RANK_CANON){
    if (new RegExp(canon,"i").test(src)) return canon;
    for (const a of alts){ if (new RegExp(a,"i").test(src)) return canon; }
  }
  return "";
}
async function readJSONIf(p){ try{ return JSON.parse(await fs.readFile(p,"utf8")); }catch{ return null; } }

function parseBlock(txt){
  const arr = toLines(txt).map(x=>x.replace(/\s+$/,"")); // 末尾空白除去
  // 抜粋
  const start = arr.findIndex(l => strip(l)===START);
  const end   = arr.findIndex(l => strip(l)===END);
  const body  = (start>=0 && end>start) ? arr.slice(start+1, end) : arr;
  const lines = body.filter(l => strip(l) && strip(l)!==START && strip(l)!==END);
  return { lines, start, end };
}

function splitOut(lines){
  // 先頭1行 = 見出し、続く 8 行 = (漢文→説明)*4、その後はカテゴリ
  const header = lines[0] || "";
  const rest = lines.slice(1);
  const pairs = [];
  for (let i=0;i<8;i+=2) pairs.push([rest[i]||"", rest[i+1]||""]);
  const items = rest.slice(8);
  return { header, pairs, items };
}

function composeJA(id, rank, pairs, items){
  const head = `第${toKanji(id)}　${rank}`;
  return [
    START,
    head,
    ...pairs.flat().map(s=>s),
    ...items,
    END,
    ""
  ].join("\n");
}
function composeEN(id, rank, pairs, items){
  const head = `${ordinalEn(id)}: ${rank}`;
  return [
    START,
    head,
    ...pairs.flat().map(s=>s),
    ...items,
    END,
    ""
  ].join("\n");
}

async function run(){
  const core = await readJSONIf(CORE) || [];
  const poemById = new Map(core.map(x => [Number(x.id), (x.poem_kanji||[]).slice(0,4)]));
  const meta = await readJSONIf(META) || {};
  const metaById = new Map((meta.data||meta||[]).map?.(x=>[Number(x.id), x]) ?? []); // 柔軟

  const dirs = (await fs.readdir(ROOT, { withFileTypes:true }))
    .filter(d => d.isDirectory() && /^\d{3}$/.test(d.name))
    .map(d => d.name)
    .sort((a,b)=>Number(a)-Number(b));

  let issues = [];

  for (const d of dirs){
    const id = Number(d);
    const dir = path.join(ROOT, d);
    const jaPath = path.join(dir, "ja.txt");
    const enPath = path.join(dir, "en.txt");

    const jaRaw = await fs.readFile(jaPath, "utf8");
    const enRaw = await fs.readFile(enPath, "utf8");

    const ja = parseBlock(jaRaw);
    const en = parseBlock(enRaw);

    const J = splitOut(ja.lines);
    const E = splitOut(en.lines);

    // ランク推定（まず現行見出しから正規化、ダメなら meta から）
    let rankJA = canonRankJA(J.header);
    if (!rankJA){
      const m = metaById.get(id);
      if (m?.rank_ja) rankJA = canonRankJA(m.rank_ja) || strip(m.rank_ja);
    }
    let rankEN = canonRankEN(E.header);
    if (!rankEN){
      const m = metaById.get(id);
      if (m?.rank_en) rankEN = canonRankEN(m.rank_en) || strip(m.rank_en);
    }

    // 四句：句中スペース除去 & 5字検査
    const poem = poemById.get(id) || [];
    for (let i=0;i<4;i++){
      // J/Eの1行目,3行目...が漢文（コアから来てる前提だが保険でスペース除去）
      J.pairs[i][0] = J.pairs[i][0].replace(/\s+/g,"");
      E.pairs[i][0] = E.pairs[i][0].replace(/\s+/g,"");
      // 5字検査
      const okJ = isFiveHan(J.pairs[i][0]);
      const okE = isFiveHan(E.pairs[i][0]);
      if (!okJ || !okE){
        issues.push(`[WARN] ${d} L${i+1}: not 5 Han -> JA="${J.pairs[i][0]}", EN="${E.pairs[i][0]}"`);
        // core.json の該当句があればそれで強制上書き
        if (poem[i] && isFiveHan(poem[i])) {
          J.pairs[i][0] = poem[i];
          E.pairs[i][0] = poem[i];
        }
      }
    }

    // 見出し再構成
    if (!rankJA) issues.push(`[WARN] ${d} JA rank unresolved from header "${J.header}"`);
    if (!rankEN) issues.push(`[WARN] ${d} EN rank unresolved from header "${E.header}"`);
    const jaNew = composeJA(id, rankJA || "　", J.pairs, J.items);
    const enNew = composeEN(id, rankEN || "Fortune", E.pairs, E.items);

    // バックアップ＆上書き
    await fs.writeFile(path.join(dir, "ja.txt.prev2"), jaRaw, "utf8");
    await fs.writeFile(path.join(dir, "en.txt.prev2"), enRaw, "utf8");
    await fs.writeFile(jaPath, jaNew, "utf8");
    await fs.writeFile(enPath, enNew, "utf8");

    console.log(`[FIX] ${d}  JA="${strip(J.header)}" -> "${`第${toKanji(id)}　${rankJA||""}`}",  EN="${strip(E.header)}" -> "${ordinalEn(id)}: ${rankEN||""}"`);
  }

  if (issues.length){
    console.log("\n=== QA REPORT ===");
    for (const s of issues) console.log(s);
  } else {
    console.log("\nAll headers and poems normalized.");
  }
}

run().catch(e=>{ console.error(e); process.exit(1); });
