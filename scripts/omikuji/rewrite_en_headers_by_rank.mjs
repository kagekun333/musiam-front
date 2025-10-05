import fs from "fs";
import path from "path";

const ROOT = "src/data/omikuji";
const ENP  = path.join(ROOT, "en.txt");
const RANK_JA = "src/data/rank_map.json";
const JA2EN   = "scripts/omikuji/config/rank.ja2en.json";

const rankJA = JSON.parse(fs.readFileSync(RANK_JA,"utf8")); // id -> JAランク
const ja2en  = JSON.parse(fs.readFileSync(JA2EN,"utf8"));   // JAランク -> ENラベル

const Ord = (n) => {
  if (n === 100) return "One Hundredth";
  const base = ["Zero","First","Second","Third","Fourth","Fifth","Sixth","Seventh","Eighth","Ninth","Tenth"];
  if (n <= 10) return base[n];
  const teen = {11:"Eleven",12:"Twelve",13:"Thirteen",14:"Fourteen",15:"Fifteen",16:"Sixteen",17:"Seventeen",18:"Eighteen",19:"Nineteen"};
  if (teen[n]) return teen[n];
  const tens = {20:"Twenty",30:"Thirty",40:"Forty",50:"Fifty",60:"Sixty",70:"Seventy",80:"Eighty",90:"Ninety"};
  const ord1 = {1:"First",2:"Second",3:"Third",4:"Fourth",5:"Fifth",6:"Sixth",7:"Seventh",8:"Eighth",9:"Ninth"};
  const t = Math.floor(n/10)*10, o = n%10;
  return o===0 ? tens[t] : `${tens[t]}-${ord1[o]}`;
};

// split パターン（One Hundredth 対応版）
const ENG = `(?:(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty|Thirty|Forty|Fifty|Sixty|Seventy|Eighty|Ninety)(?:-(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth))?|One Hundredth)`;
const SPLIT = new RegExp(`\\n(?=第[一二三四五六七八九十百]+　|${ENG}:\\s)`,"g");

let s = fs.readFileSync(ENP,"utf8").replace(/\uFEFF/g,"");
let blocks = s.split(SPLIT).filter(x=>x.trim());

if (blocks.length !== 100) {
  console.error("[rewrite-en-headers] blocks:", blocks.length, "≠ 100"); process.exit(2);
}

let changed = 0;
let samples = [];
blocks = blocks.map((b, i) => {
  const id = i+1;
  const lines = b.split(/\r?\n/);
  const got = (lines[0]||"").trim();
  const jaRank = (rankJA[id]||"").trim();
  const enRank = (ja2en[jaRank]||"").trim();
  const expected = `${Ord(id)}: ${enRank}`;
  if (got !== expected) {
    changed++;
    if (samples.length < 8) samples.push({id, got, expected});
    lines[0] = expected;
  }
  return lines.join("\n");
});

s = blocks.join("\n")+"\n";
fs.writeFileSync(ENP, s, {encoding:"utf8"});
console.log(`[rewrite-en-headers] changed ${changed} headers.`);
if (samples.length) {
  console.log("[rewrite-en-headers] sample diffs:");
  for (const d of samples) console.log(`  #${d.id}\n    - ${d.got}\n    + ${d.expected}`);
}