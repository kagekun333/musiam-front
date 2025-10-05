import fs from "fs";
import path from "path";

const ROOT="src/data/omikuji";
const ENP = path.join(ROOT,"en.txt");
const CORE = path.join(ROOT,"core.json");
const RANK_JA = "src/data/rank_map.json";
const JA2EN   = "scripts/omikuji/config/rank.ja2en.json";
const T_EN    = "scripts/omikuji/translations_en.json";

// --- helpers ---
const Ord=(n)=>{ if(n===100) return "One Hundredth";
  const b=["Zero","First","Second","Third","Fourth","Fifth","Sixth","Seventh","Eighth","Ninth","Tenth"];
  if(n<=10) return b[n];
  const teen={11:"Eleven",12:"Twelve",13:"Thirteen",14:"Fourteen",15:"Fifteen",16:"Sixteen",17:"Seventeen",18:"Eighteen",19:"Nineteen"};
  if(teen[n]) return teen[n];
  const tens={20:"Twenty",30:"Thirty",40:"Forty",50:"Fifty",60:"Sixty",70:"Seventy",80:"Eighty",90:"Ninety"};
  const om={1:"First",2:"Second",3:"Third",4:"Fourth",5:"Fifth",6:"Sixth",7:"Seventh",8:"Eighth",9:"Ninth"};
  const t=Math.floor(n/10)*10,o=n%10; return o===0?tens[t]:`${tens[t]}-${om[o]}`;
};
// split（One Hundredth対応）
const ENG=`(?:(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty|Thirty|Forty|Fifty|Sixty|Seventy|Eighty|Ninety)(?:-(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth))?|One Hundredth)`;
const SPLIT=new RegExp(`\\n(?=第[一二三四五六七八九十百]+　|${ENG}:\\s)`,"g");
const nosp = (s)=>String(s||"").replace(/[\u3000\u0020]/g,"");

// tail を温存：既存ブロックから 4句（＋既存訳1行あれば飛ばす）を読み飛ばした残り
function tailKeep(oldBlock, poems){
  const lines=(oldBlock||"").split(/\r?\n/);
  let i=1,m=0;
  while(i<lines.length && m<4){
    const k=nosp(lines[i]||"").trim();
    if(k && k===poems[m]){
      i++; // 詩行
      const nxt=(lines[i]||"").trim();
      const is5 = !!nxt && /^[\u3400-\u9FFF\uF900-\uFAFF]{5}$/.test(nosp(nxt));
      const isLabel = /^([^：:]+)\s*[:：]\s*(.*)$/.test(nxt);
      if(nxt && !is5 && !isLabel) i++; // 既存訳らしき行をスキップ
      m++; continue;
    }
    i++;
  }
  return lines.slice(i).join("\n").trim();
}

// --- load ---
const core   = JSON.parse(fs.readFileSync(CORE,"utf8"));
const rankJA = JSON.parse(fs.readFileSync(RANK_JA,"utf8"));
const ja2en  = JSON.parse(fs.readFileSync(JA2EN,"utf8"));
const ten    = JSON.parse(fs.readFileSync(T_EN,"utf8"));
const poemsById = Object.fromEntries(core.map(x=>[x.id,(x.poem_kanji||[]).map(nosp)]));

// --- rebuild EN blocks ---
let s = fs.readFileSync(ENP,"utf8").replace(/\uFEFF/g,"");
let blocks = s.split(SPLIT).filter(x=>x.trim());
if(blocks.length!==100){ console.error("[doctor-en] blocks=",blocks.length,"≠100"); process.exit(2); }

let changed=0, fixedTrans=0, out=[];
for(let idx=0; idx<100; idx++){
  const id = idx+1;
  const oldB = blocks[idx];
  const headerExpected = `${Ord(id)}: ${(ja2en[(rankJA[id]||"").trim()]||"").trim()}`;
  const poems = poemsById[id]||[];
  const tail = tailKeep(oldB, poems);

  // 4句 + 直下訳（translations_en.json）を強制再構成
  const body = [];
  for(const p of poems){
    const t = (ten[nosp(p)]||"").toString().trim() || "TBD";
    body.push(p);
    body.push(t);
    if(!t || t==="TBD") fixedTrans++;
  }
  const newBlock = [headerExpected, ...body, tail].filter(Boolean).join("\n");
  if(newBlock.trim()!==oldB.trim()) changed++;
  out.push(newBlock);
}

fs.writeFileSync(ENP, out.join("\n")+"\n", {encoding:"utf8"});
console.log(`[doctor-en] rebuilt en.txt: changed ${changed} blocks, placeholders(or empty) seen ${fixedTrans} lines (OK).`);