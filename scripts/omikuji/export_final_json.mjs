import fs from "fs";
import path from "path";

// ---- 入力ファイル ----
const ROOT = "src/data/omikuji";
const JA_TXT = path.join(ROOT,"ja.txt");
const EN_TXT = path.join(ROOT,"en.txt");
const CORE   = path.join(ROOT,"core.json");
const RANK_JA= "src/data/rank_map.json";
const JA2EN  = "scripts/omikuji/config/rank.ja2en.json";
const ALIAS_JA = "scripts/omikuji/config/category_alias.ja.json";
const ALIAS_EN = "scripts/omikuji/config/category_alias.en.json";

// ---- 出力ファイル ----
const OUT_DIR = "dist";
const OUT_JSON= path.join(OUT_DIR, "omikuji.final.json");
const OUT_TODO= path.join(OUT_DIR, "omikuji.translation_todo.csv");

// ---- ユーティリティ ----
const nosp = s => String(s||"").replace(/[\u3000\u0020]/g,"");
const rd = p => fs.readFileSync(p,"utf8").replace(/\uFEFF/g,"");
const Ord=(n)=>{ if(n===100) return "One Hundredth";
  const b=["Zero","First","Second","Third","Fourth","Fifth","Sixth","Seventh","Eighth","Ninth","Tenth"];
  if(n<=10)return b[n];
  const teen={11:"Eleven",12:"Twelve",13:"Thirteen",14:"Fourteen",15:"Fifteen",16:"Sixteen",17:"Seventeen",18:"Eighteen",19:"Nineteen"};
  if(teen[n])return teen[n];
  const tens={20:"Twenty",30:"Thirty",40:"Forty",50:"Fifty",60:"Sixty",70:"Seventy",80:"Eighty",90:"Ninety"};
  const om={1:"First",2:"Second",3:"Third",4:"Fourth",5:"Fifth",6:"Sixth",7:"Seventh",8:"Eighth",9:"Ninth"};
  const t=Math.floor(n/10)*10,o=n%10; return o===0?tens[t]:`${tens[t]}-${om[o]}`;
};
// 見出し split（One Hundredth 対応）
const ENG = `(?:(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty|Thirty|Forty|Fifty|Sixty|Seventy|Eighty|Ninety)(?:-(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth))?|One Hundredth)`;
const SPLIT = new RegExp(`\\n(?=第[一二三四五六七八九十百]+　|${ENG}:\\s)`,"g");

// ---- ロード ----
const core   = JSON.parse(rd(CORE));                         // [{id, poem_kanji:[4], ...}]
const rankJA = JSON.parse(rd(RANK_JA));                      // {id: "大吉", ...}
const ja2en  = JSON.parse(rd(JA2EN));                        // {"大吉":"Great Blessing", ...}
const aliasJA= fs.existsSync(ALIAS_JA)? JSON.parse(rd(ALIAS_JA)) : {};
const aliasEN= fs.existsSync(ALIAS_EN)? JSON.parse(rd(ALIAS_EN)) : {};

const poemsById = Object.fromEntries(core.map(x=>[x.id,(x.poem_kanji||[]).map(nosp)]));

// ---- tail 正規化（ラベルを正規キーへ） ----
const CANON_JA = ["願望","待人","失物","旅行","商売","学問","相場","争事","恋愛","転居","出産","病気","縁談"];
const CANON_EN = ["Wish","Expected person","Lost item","Travel","Business","Study","Market","Dispute","Romance","Moving","Birth","Illness","Marriage prospect"];

// エイリアス → 正規キー
function canonize(label, lang){
  const L = (label||"").trim();
  if(!L) return "";
  const a = (lang==="ja"?aliasJA:aliasEN) || {};
  // 完全一致 → マップ
  if(a[L]) return a[L];
  // 既に正規キーならそのまま
  if(lang==="ja" && CANON_JA.includes(L)) return L;
  if(lang==="en" && CANON_EN.includes(L)) return L;
  // ざっくり簡易正規化（英語は大文字小文字つぶす）
  const L2 = lang==="en" ? L.replace(/\./g,"").trim().toLowerCase() : L;
  const fuzzEN = Object.fromEntries(CANON_EN.map(k=>[k.toLowerCase(),k]));
  if(lang==="en" && fuzzEN[L2]) return fuzzEN[L2];
  return L; // 不明な場合はそのまま返す（後で QA で弾けるようにする）
}

// tail 行を {label,text}[] へ
function parseTail(blockText){
  const lines = blockText.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const items = [];
  for(const line of lines){
    const m = line.match(/^([^：:]+)\s*[:：]\s*(.+)$/);
    if(!m) continue;
    items.push({label:m[1].trim(), text:m[2].trim()});
  }
  return items;
}

// id のブロックから 4句×訳 と tail を抜き出す
function extractFrom(langText, id, poems){
  const blocks = langText.split(SPLIT).filter(x=>x.trim());
  const b = blocks[id-1]||"";
  const ls = b.split(/\r?\n/);
  const header = (ls[0]||"").trim();

  let i=1, got=[], seen=0;
  while(i<ls.length && seen<4){
    // 詩行を探す（スペース除去一致）
    let found=false;
    for(; i<ls.length; i++){
      const k = nosp(ls[i]||"").trim();
      if(k===poems[seen]){
        const trans = (ls[i+1]||"").trim();
        got.push({orig: ls[i].trim(), trans});
        i+=2; found=true; seen++; break;
      }
    }
    if(!found) break;
  }
  const tail = ls.slice(i).join("\n").trim();
  return {header, lines: got, tail};
}

// ---- 生成 ----
const jaTxt = rd(JA_TXT);
const enTxt = rd(EN_TXT);

const out = [];
const todoRows = [["id","line_idx(1-4)","orig","ja_trans","en_trans"]];

for(let id=1; id<=100; id++){
  const poems = poemsById[id]||[];
  const ja = extractFrom(jaTxt, id, poems);
  const en = extractFrom(enTxt, id, poems);

  const rankJa = (rankJA[id]||"").trim();
  const rankEn = (ja2en[rankJa]||"").trim();

  // tail を JA/EN で key 合流
  const tJa = parseTail(ja.tail).map(x=>({key:canonize(x.label,"ja"), text:x.text}));
  const tEn = parseTail(en.tail).map(x=>({key:canonize(x.label,"en"), text:x.text}));
  const tailMap = new Map();
  for(const it of tJa){ const k=it.key||it.label; if(!k) continue; tailMap.set(k, {key_ja:it.key||it.label, text_ja:it.text, text_en:""}); }
  for(const it of tEn){
    const k=it.key||it.label; if(!k) continue;
    if(tailMap.has(k)) tailMap.get(k).text_en = it.text;
    else tailMap.set(k, {key_en:it.key||it.label, text_en:it.text, text_ja:""});
  }
  // key の JA/EN を揃える（既知セットなら対応づけ）
  const tail = [];
  for(const [k,v] of tailMap){
    // 既知セットに入っていれば揃える
    if(CANON_JA.includes(k)){
      const idx = CANON_JA.indexOf(k);
      tail.push({ key_ja: CANON_JA[idx], key_en: CANON_EN[idx], text_ja: v.text_ja||"", text_en: v.text_en||"" });
    }else if(CANON_EN.includes(k)){
      const idx = CANON_EN.indexOf(k);
      tail.push({ key_ja: CANON_JA[idx], key_en: CANON_EN[idx], text_ja: v.text_ja||"", text_en: v.text_en||"" });
    }else{
      // 不明キーはそのまま
      tail.push({ key_ja: v.key_ja||k, key_en: v.key_en||k, text_ja: v.text_ja||"", text_en: v.text_en||"" });
    }
  }

  // 五字四句（orig は core と一致させる／訳は抽出結果）
  const lines = poems.map((p,idx)=>{
    const j = ja.lines[idx]||{orig:p, trans:""};
    const e = en.lines[idx]||{orig:p, trans:""};
    // TODO 抽出漏れを防ぐため orig は core を採用し、訳だけ抽出
    const ja_tr = (j.trans||"").trim();
    const en_tr = (e.trans||"").trim();
    if(!ja_tr || ja_tr==="（訳準備中）" || !en_tr || en_tr==="TBD"){
      todoRows.push([id, idx+1, p, ja_tr, en_tr]);
    }
    return { orig: p, ja: ja_tr, en: en_tr };
  });

  out.push({
    id,
    rank_ja: rankJa,
    rank_en: rankEn,
    header_ja: ja.header,
    header_en: en.header,
    lines,
    tail
  });
}

// ---- 出力 & サマリ ----
fs.mkdirSync(OUT_DIR, {recursive:true});
fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2), {encoding:"utf8"});
fs.writeFileSync(OUT_TODO, todoRows.map(r=>r.map(x=>String(x).replaceAll('"','""')).map(x=>`"${x}"`).join(",")).join("\n"), {encoding:"utf8"});

const tbdCount = todoRows.length-1;
console.log(`[export] wrote ${OUT_JSON}`);
console.log(`[export] wrote ${OUT_TODO} (rows=${tbdCount})`);
console.log(`[export] OK: 100 entries, each with 4 lines + normalized tail.`);