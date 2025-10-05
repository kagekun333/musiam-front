import fs from "fs";
const ROOT = "src/data/omikuji";
const ORDER_JA = ["願望","健康","失せ物","待ち人","新築・引越","旅行","商売","学問","相場","争事","恋愛","転居","出産","病気","縁談","仕事"];
const ORDER_EN = ["Wish","Health","Lost Items","Person Awaited","New Home & Moving","Travel","Business","Studies","Market","Dispute","Love","Relocation","Childbirth","Illness","Marriage","Work"];
const JA = fs.readFileSync(`${ROOT}/ja.txt`, "utf8").replace(/\uFEFF/g,"");
const EN = fs.readFileSync(`${ROOT}/en.txt`, "utf8").replace(/\uFEFF/g,"");
const aliasJA = JSON.parse(fs.readFileSync("scripts/omikuji/config/category_alias.ja.json","utf8"));
const aliasEN = JSON.parse(fs.readFileSync("scripts/omikuji/config/category_alias.en.json","utf8"));
const rev = (dict)=>{ const m=new Map(); for(const [canon,arr] of Object.entries(dict)){ m.set(canon,canon); for(const a of arr) m.set(a,canon);} return m; };
const revJA = rev(aliasJA), revEN = rev(aliasEN);
const split=(t)=>t.split(/\n(?=第[一二三四五六七八九十百]+　|(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty|Thirty|Forty|Fifty|Sixty|Seventy|Eighty|Ninety)(?:-(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth))?:\s)/g).filter(x=>x.trim());
function normalizeOne(text, rev, ORDER) {
  const out = split(text).map(b=>{
    const lines = b.split(/\r?\n/); if(!lines[0]) return b;
    const header=lines[0], body=lines.slice(1);
    const kv=[], rest=[];
    for(const ln of body){
      const m = ln.match(/^([^：:]+)\s*[:：]\s*(.*)$/);
      if(m){ const key=(rev.get(m[1].trim())||m[1].trim()); kv.push([key,m[2]]); }
      else { rest.push(ln); }
    }
    const seen=new Set(), map=new Map();
    for(const [k,v] of kv) if(!seen.has(k)){ seen.add(k); map.set(k,v); }
    const ordered=[]; for(const k of ORDER) if(map.has(k)) ordered.push(`${k}: ${map.get(k)}`);
    return [header, ...ordered, ...rest].join("\n");
  });
  return out.join("\n")+"\n";
}
fs.writeFileSync(`${ROOT}/ja.txt`, normalizeOne(JA, revJA, ORDER_JA), "utf8");
fs.writeFileSync(`${ROOT}/en.txt`, normalizeOne(EN, revEN, ORDER_EN), "utf8");
console.log("[normalize] categories normalized & ordered.");