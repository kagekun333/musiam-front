import fs from "node:fs";

const FILE = process.argv.includes("--file")
  ? process.argv[process.argv.indexOf("--file") + 1]
  : "src/data/kannon_100_final.json";
const OUT = process.argv.includes("--out")
  ? process.argv[process.argv.indexOf("--out") + 1]
  : "tempdata/qa_report.json";

const POS = ["能夠","可以","吉","喜","順","安","成","得","好","解","治","見","至","来","入","利","旺","発"];
const NEG = ["難","不會","不能","災","禍","敗","憂","失","病","危","凶","悪","破","滅","退","遅","阻","損"];
const DLY = ["遲","久","拖","延","遲遲","長く","しばらく","のち"];

const data = JSON.parse(fs.readFileSync(FILE, "utf8"));

function scoreText(lines) {
  const t = (lines || []).join(" ");
  const count = (arr) => arr.reduce((s, w) => s + ((t.match(new RegExp(w, "g")) || []).length), 0);
  const p = count(POS), n = count(NEG), d = count(DLY);
  return 2 * p - 2 * n - 1 * d;
}
function suggestRank(s) {
  if (s <= -4) return "大凶";
  if (s <= -1) return "凶";
  if (s <=  1) return "末小吉";
  if (s <=  2) return "末吉";
  if (s <=  4) return "小吉";
  if (s <=  5) return "半吉";
  if (s <=  8) return "吉";
  return "大吉";
}
function isIncomplete(lines) {
  if (!lines || !lines.length) return true;
  if (lines.length < 3) return true;
  return lines.some((l) => /[：:]\s*$/.test((l || "").trim()));
}

const details = [];
const incompleteIds = [], mismatchIds = [];

for (const it of data) {
  const s = scoreText(it.poem);
  const sug = suggestRank(s);
  const inc = isIncomplete(it.poem);
  const mis = it.rank && it.rank !== sug;
  details.push({
    number: it.number,
    score: s,
    current_rank: it.rank || null,
    suggested_rank: sug,
    incomplete: inc,
    mismatch: mis,
    display_ja: it.display_ja,
  });
  if (inc) incompleteIds.push(it.number);
  if (mis) mismatchIds.push(it.number);
}

const bothIds = incompleteIds.filter((x) => mismatchIds.includes(x));

const report = {
  file: FILE,
  summary: {
    total: data.length,
    incomplete: incompleteIds.length,
    mismatch: mismatchIds.length,
    both: bothIds.length,
  },
  lists: { incompleteIds, mismatchIds, bothIds },
  details,
};

fs.writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");
console.log(`[omikuji_validate] wrote ${OUT}`);
if (incompleteIds.length || mismatchIds.length) process.exitCode = 1;
