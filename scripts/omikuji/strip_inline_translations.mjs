import fs from "fs";
const ROOT="src/data/omikuji";
const split=(t)=>t.split(/\n(?=第[一二三四五六七八九十百]+　|(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty|Thirty|Forty|Fifty|Sixty|Seventy|Eighty|Ninety)(?:-(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth))?:\s)/g).filter(x=>x.trim());
const isFive=(s)=>/^[^\s]{5}$/.test(String(s).replace(/[\u3000\u0020]/g,"").trim());
for (const f of ["ja.txt","en.txt"]) {
  const p=`${ROOT}/${f}`; if(!fs.existsSync(p)) continue;
  const raw=fs.readFileSync(p,"utf8").replace(/\uFEFF/g,"");
  const out=split(raw).map(b=>{
    const lines=b.split(/\r?\n/); if(!lines[0]) return b;
    const body=lines.slice(1); const nb=[];
    for(let i=0;i<body.length;i++){
      const key=String(body[i]).replace(/[\u3000\u0020]/g,"").trim();
      if(isFive(key)){ nb.push(key); if(i+1<body.length) i++; } else nb.push(body[i]);
    }
    return [lines[0],...nb].join("\n");
  }).join("\n")+"\n";
  fs.writeFileSync(p,out,{encoding:"utf8"}); console.log(`[strip-inline] cleaned: ${p}`);
}