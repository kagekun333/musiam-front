import fs from "fs"; import path from "path";
const ROOT="src/data/omikuji", OUT="tempdata/qa_omikuji.json";
const CORE="src/data/omikuji/core.json", RANK_JA="src/data/rank_map.json", JA2EN="scripts/omikuji/config/rank.ja2en.json";
const core = JSON.parse(fs.readFileSync(CORE,"utf8"));
const coreById = Object.fromEntries(core.map(x=>[x.id,(x.poem_kanji||[]).map(s=>String(s).replace(/[\u3000\u0020]/g,""))]));
const rankJA = JSON.parse(fs.readFileSync(RANK_JA,"utf8"));
const ja2en  = JSON.parse(fs.readFileSync(JA2EN,"utf8"));
const K=(n)=>{const k=['','一','二','三','四','五','六','七','八','九']; if(n===100)return'百'; const t=Math.floor(n/10),o=n%10; if(n<10)return k[n]; if(n===10)return'十'; let s=''; if(t>1)s+=k[t]; if(t>=1)s+='十'; if(o>0)s+=k[o]; return s;};
const Ord=(n)=>{ if(n===100) return "One Hundredth";const b=["Zero","First","Second","Third","Fourth","Fifth","Sixth","Seventh","Eighth","Ninth","Tenth"]; if(n<=10)return b[n]; const teen={11:"Eleven",12:"Twelve",13:"Thirteen",14:"Fourteen",15:"Fifteen",16:"Sixteen",17:"Seventeen",18:"Eighteen",19:"Nineteen"}; if(teen[n])return teen[n]; const tens={20:"Twenty",30:"Thirty",40:"Forty",50:"Fifty",60:"Sixty",70:"Seventy",80:"Eighty",90:"Ninety"}; const t=Math.floor(n/10)*10,o=n%10; if(o===0)return tens[t]; const om={1:"First",2:"Second",3:"Third",4:"Fourth",5:"Fifth",6:"Sixth",7:"Seventh",8:"Eighth",9:"Ninth"}; return `${tens[t]}-${om[o]}`;};
const split=(text)=>text.split(/\n(?=第[一二三四五六七八九十百]+　|(?:(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty|Thirty|Forty|Fifty|Sixty|Seventy|Eighty|Ninety)(?:-(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth))?|One Hundredth):\s)/g).filter(x=>x.trim());
function validate(file, lang){
  const raw = fs.readFileSync(path.join(ROOT,file),'utf8').replace(/\uFEFF/g,"");
  const blocks = split(raw); const errors = [];
  if (blocks.length !== 100) errors.push({type:"block_count", got:blocks.length});
  blocks.forEach((b,idx)=>{
    const id = idx+1; const lines = b.split(/\r?\n/); const header = (lines[0]||"").trim();
    const rj = (rankJA[id]||"").trim(); const ren = (ja2en[rj]||"").trim();
    const expectJA = `第${K(id)}　${rj}`; const expectEN = `${Ord(id)}: ${ren}`;
    if (lang==="ja" && header !== expectJA) errors.push({type:"header", id, got:header, expected:expectJA});
    if (lang==="en" && header !== expectEN) errors.push({type:"header", id, got:header, expected:expectEN});
    const poems = coreById[id] || []; let i = 1;
    for (const p of poems) {
      let found = false;
      while (i < lines.length) {
        const k = (lines[i]||"").replace(/[\u3000\u0020]/g,"").trim();
        if (k === p) {
          const trans = (lines[i+1]||"").trim();
          if (!trans) errors.push({type:"translation_missing", id, poem:p});
          i += 2; found = true; break;
        } i++;
      }
      if (!found) errors.push({type:"poem_missing", id, poem:p});
    }
    if (/=== TEXT END ===/.test(b)) errors.push({type:"noise", id});
  });
  return {blocks:blocks.length, errors};
}
const ja = validate("ja.txt","ja");
const en = validate("en.txt","en");
const out = { ts:new Date().toISOString(), ja, en, ok: ja.errors.length===0 && en.errors.length===0 };
fs.mkdirSync("tempdata",{recursive:true});
fs.writeFileSync(OUT, JSON.stringify(out,null,2));
console.log(out.ok ? "[QA] PASS" : "[QA] FAIL", "→", OUT);
if(!out.ok) process.exitCode = 1;

