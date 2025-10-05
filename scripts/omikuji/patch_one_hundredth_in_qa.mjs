import fs from "fs";
const targets = ["scripts/omikuji/qa_validate.mjs"];

// qa_validate の分割用 ENG パターン
const re = /\(\?:First\|Second\|Third\|Fourth\|Fifth\|Sixth\|Seventh\|Eighth\|Ninth\|Tenth\|Eleven\|Twelve\|Thirteen\|Fourteen\|Fifteen\|Sixteen\|Seventeen\|Eighteen\|Nineteen\|\(\?:Twenty\|Thirty\|Forty\|Fifty\|Sixty\|Seventy\|Eighty\|Ninety\)\(\?:-\(\?:First\|Second\|Third\|Fourth\|Fifth\|Sixth\|Seventh\|Eighth\|Ninth\)\)\?\)/g;

for (const p of targets) {
  let s = fs.readFileSync(p, "utf8");
  if (!re.test(s)) { console.log(`[qa-patch] ENG split pattern not found in ${p}`); continue; }
  s = s.replace(re, m => m + '|One Hundredth');     // ← ここで 100 を注入
  fs.writeFileSync(p, s, { encoding: "utf8" });
  console.log(`[qa-patch] updated ${p}`);
}