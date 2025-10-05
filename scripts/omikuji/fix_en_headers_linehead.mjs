import fs from "fs";

const P = "src/data/omikuji/en.txt";
let s = fs.readFileSync(P, "utf8").replace(/\uFEFF/g, "");

// 英語見出しの正規表現（qa_validateと同等）
const tens = "(?:Twenty|Thirty|Forty|Fifty|Sixty|Seventy|Eighty|Ninety)";
const ones = "(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth)";
const ENG  = `(?:${ones}|Tenth|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|${tens}(?:-${ones})?)`;

// 「行頭にない見出し」の直前へ改行を挿入
//   条件: 直前が \n ではない位置で、そこから行頭アンカー ^ の見出しが始まっている
// Node 22 は後読みOK
const re = new RegExp(`(?<!\\n)(?=^${ENG}:\\s)`, "gm");
s = s.replace(re, "\n");

fs.writeFileSync(P, s, {encoding:"utf8"});
console.log("[en-fix] ensured headers start at line-beginnings.");