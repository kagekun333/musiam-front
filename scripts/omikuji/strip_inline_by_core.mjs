import fs from "fs";
import path from "path";

const ROOT="src/data/omikuji";
const CORE=path.join(ROOT,"core.json");
if (!fs.existsSync(CORE)) { console.error("core.json not found"); process.exit(2); }
const core = JSON.parse(fs.readFileSync(CORE,"utf8"));
const poemsById = Object.fromEntries(core.map(x=>[x.id,(x.poem_kanji||[]).map(s=>String(s).replace(/[\u3000\u0020]/g,""))]));

const split=(t)=>t.split(/\n(?=第[一二三四五六七八九十百]+　|(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty|Thirty|Forty|Fifty|Sixty|Seventy|Eighty|Ninety)(?:-(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth))?:\s)/g).filter(x=>x.trim());

function tailKeep(oldBlock, poems){
  const lines = (oldBlock||"").split(/\r?\n/);
  let i = 1, m = 0;
  while (i < lines.length && m < 4) {
    const k = (lines[i]||"").replace(/[\u3000\u0020]/g,"").trim();
    if (k && k === poems[m]) {
      i++; // 詩行
      const nxt = (lines[i]||"").trim();
      const is5 = !!nxt && /^[\u3400-\u9FFF\uF900-\uFAFF]{5}$/.test(nxt.replace(/[\u3000\u0020]/g,""));
      const isLabel = /^([^：:]+)\s*[:：]\s*(.*)$/.test(nxt);
      if (nxt && !is5 && !isLabel) i++; // 訳行ならスキップ
      m++; continue;
    }
    i++;
  }
  return lines.slice(i).join("\n").trim();
}

for (const f of ["ja.txt","en.txt"]) {
  const p = path.join(ROOT,f);
  const raw = fs.readFileSync(p, "utf8").replace(/\uFEFF/g,"");
  const blocks = split(raw);
  const out = blocks.map((b,idx)=>{
    const id = idx+1;
    const poems = poemsById[id] || [];
    const header = (b.split(/\r?\n/)[0]||"").trim();
    const tail = tailKeep(b, poems);
    return [header, ...poems, tail].filter(Boolean).join("\n");
  }).join("\n")+"\n";
  fs.writeFileSync(p, out, {encoding:"utf8"});
  console.log(`[strip-core] cleaned by core: ${p}`);
}