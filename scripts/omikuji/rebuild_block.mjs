import fs from "fs"; import path from "path";
const ids = process.argv.slice(2).map(x=>parseInt(x,10)).filter(Boolean);
if(!ids.length){ console.error("please pass ids"); process.exit(1); }
const ROOT="src/data/omikuji", CORE="src/data/omikuji/core.json", RANK="src/data/rank_map.json", JA2EN="scripts/omikuji/config/rank.ja2en.json";

const core=JSON.parse(fs.readFileSync(CORE,"utf8"));
const rankMap=JSON.parse(fs.readFileSync(RANK,"utf8"));
const ja2en=JSON.parse(fs.readFileSync(JA2EN,"utf8"));

const K=(n)=>{const k=['','一','二','三','四','五','六','七','八','九']; if(n===100)return'百'; const t=Math.floor(n/10),o=n%10; if(n<10)return k[n]; if(n===10)return'十'; let s=''; if(t>1)s+=k[t]; if(t>=1)s+='十'; if(o>0)s+=k[o]; return s;};
const Ord=(n)=>{const b=["Zero","First","Second","Third","Fourth","Fifth","Sixth","Seventh","Eighth","Ninth","Tenth"]; if(n<=10)return b[n]; const teen={11:"Eleven",12:"Twelve",13:"Thirteen",14:"Fourteen",15:"Fifteen",16:"Sixteen",17:"Seventeen",18:"Eighteen",19:"Nineteen"}; if(teen[n])return teen[n]; const tens={20:"Twenty",30:"Thirty",40:"Forty",50:"Fifty",60:"Sixty",70:"Seventy",80:"Eighty",90:"Ninety"}; const t=Math.floor(n/10)*10,o=n%10; if(o===0)return tens[t]; const om={1:"First",2:"Second",3:"Third",4:"Fourth",5:"Fifth",6:"Sixth",7:"Seventh",8:"Eighth",9:"Ninth"}; return `${tens[t]}-${om[o]}`;};

const read=(p)=>fs.readFileSync(p,"utf8").replace(/\uFEFF/g,"");
const split=(t)=>t.split(/\n(?=第[一二三四五六七八九十百]+　|(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty|Thirty|Forty|Fifty|Sixty|Seventy|Eighty|Ninety)(?:-(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth))?:\s)/g).filter(x=>x.trim());

function tailKeep(oldBlock, poems){
  const lines=(oldBlock||"").split(/\r?\n/); let i=1,m=0;
  while(i<lines.length && m<4){
    const k=(lines[i]||"").replace(/[\u3000\u0020]/g,"").trim();
    if(k && k===poems[m]){ i+=2; m++; continue; }
    i++;
  }
  return lines.slice(i).join("\n").trim();
}

let jaAll=read(path.join(ROOT,"ja.txt")), enAll=read(path.join(ROOT,"en.txt"));
let jaBlocks=split(jaAll), enBlocks=split(enAll);

ids.forEach(id=>{
  const item = core.find(x=>x.id===id);
  if(!item) throw new Error(`core missing id=${id}`);
  const poems = (item.poem_kanji||[]).map(s=>String(s).replace(/[\u3000\u0020]/g,""));
  if(poems.length!==4) throw new Error(`id=${id} poem_kanji lines != 4`);

  const rJA=(rankMap[id]||"").trim();
  const rEN=((ja2en[rJA]||"").trim());
  const headJA=`第${K(id)}　${rJA}`;
  const headEN=`${Ord(id)}: ${rEN}`;

  const wJA = split(read(path.join(ROOT,"ja.with_trans.txt")))[id-1]||"";
  const wEN = split(read(path.join(ROOT,"en.with_trans.txt")))[id-1]||"";
  const pick=(blk)=>{ const ls=blk.split(/\r?\n/).slice(1); const t=[]; for(let i=0;i<ls.length;i+=2){ if(!ls[i+1])break; t.push(ls[i+1].trim()); if(t.length===4)break; } return t; };
  const tJA=pick(wJA), tEN=pick(wEN);

  const bodyJA = poems.map((s,i)=>[s, (tJA[i]||"")]).flat().join("\n").trim();
  const bodyEN = poems.map((s,i)=>[s, (tEN[i]||"")]).flat().join("\n").trim();
  const tailJA = tailKeep(jaBlocks[id-1], poems);
  const tailEN = tailKeep(enBlocks[id-1], poems);

  jaBlocks[id-1] = [headJA, bodyJA, tailJA].filter(Boolean).join("\n")+"\n";
  enBlocks[id-1] = [headEN, bodyEN, tailEN].filter(Boolean).join("\n")+"\n";
  console.log(`[rebuild] id=${id} done`);
});

fs.writeFileSync(path.join(ROOT,"ja.txt"), jaBlocks.join("\n"), "utf8");
fs.writeFileSync(path.join(ROOT,"en.txt"), enBlocks.join("\n"), "utf8");