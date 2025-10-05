import fs from "fs";
const ROOT="src/data/omikuji";
const core = JSON.parse(fs.readFileSync(`${ROOT}/core.json`,"utf8"));
const poemsById = Object.fromEntries(core.map(x=>[x.id,(x.poem_kanji||[]).map(s=>String(s).replace(/[\u3000\u0020]/g,""))]));
const split=(t)=>t.split(/\n(?=第[一二三四五六七八九十百]+　|(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty|Thirty|Forty|Fifty|Sixty|Seventy|Eighty|Ninety)(?:-(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth))?:\s)/g).filter(x=>x.trim());
function looksTranslatedByCore(text){
  const blocks=split(text); if(blocks.length<1) return false;
  for(let i=0;i<blocks.length;i++){
    const id=i+1; const poems=poemsById[id]||[]; if(poems.length!==4) continue;
    const ls=blocks[i].split(/\r?\n/).slice(1);
    let j=0;
    for(const p of poems){
      while(j<ls.length){
        const k=(ls[j]||"").replace(/[\u3000\u0020]/g,"").trim();
        if(k===p){
          const nxt=(ls[j+1]||"").trim();
          const is5  = !!nxt && /^[\u3400-\u9FFF\uF900-\uFAFF]{5}$/.test(nxt.replace(/[\u3000\u0020]/g,""));
          const label= /^([^：:]+)\s*[:：]\s*(.*)$/.test(nxt);
          // 次行が「訳っぽい自由文」だけ NG。5字 or ラベルはOK。
          if(nxt && !is5 && !label){ return true; }
          j+=2; break;
        }
        j++;
      }
    }
  }
  return false;
}
for (const f of ["ja.txt","en.txt"]) {
  const raw=fs.readFileSync(`${ROOT}/${f}`,"utf8").replace(/\uFEFF/g,"");
  if (looksTranslatedByCore(raw)) { console.error(`[guard] ${f}: translated-looking (core-based)`); process.exit(2); }
  else console.log(`[guard] ${f}: base looks un-translated (core-based).`);
}