import fs from "node:fs";

const BASE = "src/data/kannon_100.json";
const MAP  = "src/data/rank_map.json";
const OUT  = "src/data/kannon_100_final.json";

const rankCode = { "大吉":"A","吉":"B","半吉":"C","小吉":"D","末吉":"E","末小吉":"F","凶":"G","大凶":"H" };
const weight   = { "大吉":90,"吉":75,"半吉":60,"小吉":55,"末吉":40,"末小吉":30,"凶":10,"大凶":0 };

const base = JSON.parse(fs.readFileSync(BASE, "utf8"));
const map  = JSON.parse(fs.readFileSync(MAP, "utf8"));

const out = base.map(it => {
  const rank = map[String(it.number)] || it.rank || "吉";
  return {
    ...it,
    display_ja: it.display_ja || `第${String(it.number).padStart(3, "0")}番`,
    rank,
    rank_code: rankCode[rank] || "?",
    rank_weight: weight[rank] ?? 50
  };
});

fs.writeFileSync(OUT, JSON.stringify(out, null, 2), "utf8");
console.log(`[build_kannon] wrote ${OUT}`);
