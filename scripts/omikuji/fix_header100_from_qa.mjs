import fs from "fs";

const QA="tempdata/qa_omikuji.json";
const EN="src/data/omikuji/en.txt";
const qa=JSON.parse(fs.readFileSync(QA,"utf8"));
const err=(qa.en.errors||[]).find(e=>e.type==="header" && e.id===100);
if(!err){ console.log("[hdr100] no header error for id=100; nothing to do."); process.exit(0); }
const expected=err.expected; // e.g. "One Hundredth: Great Blessing"

let s=fs.readFileSync(EN,"utf8").replace(/\uFEFF/g,"");
const ordRe='(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|(?:Twenty|Thirty|Forty|Fifty|Sixty|Seventy|Eighty|Ninety)(?:-(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth))?|One Hundredth)';
const SPLIT=new RegExp('\\n(?=第[一二三四五六七八九十百]+　|'+ordRe+':\\s)','g');
const blocks=s.split(SPLIT).filter(x=>x.trim());
if(blocks.length<100){ console.error("[hdr100] still",blocks.length,"blocks; cannot patch safely."); process.exit(2); }

const b100=blocks[99].split(/\r?\n/);
b100[0]=expected;
blocks[99]=b100.join("\n");
s=blocks.join("\n")+"\n";
fs.writeFileSync(EN,s,{encoding:"utf8"});
console.log("[hdr100] patched header to:", expected);