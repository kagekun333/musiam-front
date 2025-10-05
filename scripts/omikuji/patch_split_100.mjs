import fs from "fs";

const p = "scripts/omikuji/qa_validate.mjs";
let s = fs.readFileSync(p, "utf8");

// split() の英語見出し部分を、One Hundredth を含む形に丸ごと置換
// 旧: ... |(?:First|...|Ninety)(?:-(?:First|...|Ninth))?:\s)
// 新: ... |(?:(?:First|...|Ninety)(?:-(?:First|...|Ninth))?|One Hundredth):\s)
s = s.replace(
  /\/\\n\(\?=第\[一二三四五六七八九十百]\+　\|\(\?:First\|Second\|Third\|Fourth\|Fifth\|Sixth\|Seventh\|Eighth\|Ninth\|Tenth\|Eleven\|Twelve\|Thirteen\|Fourteen\|Fifteen\|Sixteen\|Seventeen\|Eighteen\|Nineteen\|Twenty\|Thirty\|Forty\|Fifty\|Sixty\|Seventy\|Eighty\|Ninety\)\(\?:-\(\?:First\|Second\|Third\|Fourth\|Fifth\|Sixth\|Seventh\|Eighth\|Ninth\)\)\?:\\s\)\/g/,
  '/\\n(?=第[一二三四五六七八九十百]+　|(?:(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty|Thirty|Forty|Fifty|Sixty|Seventy|Eighty|Ninety)(?:-(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth))?|One Hundredth):\\s)/g'
);

fs.writeFileSync(p, s, {encoding:"utf8"});
console.log("[patch] qa_validate.mjs split() updated to include One Hundredth.");