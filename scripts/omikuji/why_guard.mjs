import fs from "fs";
const ROOT="src/data/omikuji";
const split=(t)=>t.split(/\n(?=第[一二三四五六七八九十百]+　|(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty|Thirty|Forty|Fifty|Sixty|Seventy|Eighty|Ninety)(?:-(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth))?:\s)/g).filter(x=>x.trim());
const isFive = (s)=>/^[^\s]{5}$/.test(String(s).replace(/[\u3000\u0020]/g,"").trim());
for (const f of ["ja.txt","en.txt"]) {
  const p=`${ROOT}/${f}`;
  const raw=fs.readFileSync(p,"utf8").replace(/\uFEFF/g,"");
  const blocks = split(raw);
  let hit = [];
  blocks.forEach((b,idx)=>{
    const ls=b.split(/\r?\n/).slice(1);
    let pairs=0;
    for (let i=0;i<ls.length-1;i++){
      if (isFive(ls[i]) && String(ls[i+1]).trim()) { pairs++; if (pairs>=2) break; }
    }
    if (pairs>=2) hit.push(idx+1);
  });
  if (hit.length) console.error(`[why-guard] ${f}: ids`, hit.slice(0,20).join(","), hit.length>20?"...":"");
  else console.log(`[why-guard] ${f}: OK`);
}