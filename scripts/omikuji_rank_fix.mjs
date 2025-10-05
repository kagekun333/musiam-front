// scripts/omikuji_rank_fix.mjs
// Usage: node scripts/omikuji_rank_fix.mjs path/to/omikuji.final.json

import fs from "fs";

const file = process.argv[2] || "dist/omikuji.final.json";
if (!fs.existsSync(file)) {
  console.error(`[ERR] File not found: ${file}`);
  process.exit(1);
}

// どの表記で来ても "Luck" 軸に揃える総合マップ
const TO_LUCK = {
  // Fortune → Luck
  "Great Fortune": "Great Luck",
  "Good Fortune": "Good Luck",
  "Minor Fortune": "Small Luck",
  "Partial Fortune": "Mixed Luck",
  "Future Fortune": "Later Luck",
  "Slight Future Fortune": "Slight Later Luck",
  "Misfortune": "Bad Luck",

  // Blessing → Luck（旧ファイル想定）
  "Great Blessing": "Great Luck",
  "Small Blessing": "Small Luck",
  "Half Blessing": "Mixed Luck",
  "Late Blessing": "Later Luck",
  "Lesser Late Blessing": "Slight Later Luck",

  // Auspice/Omen → Luck（高級表現の掃除）
  "Great Auspice": "Great Luck",
  "Auspice": "Good Luck",
  "Lesser Auspice": "Small Luck",
  "Half Auspice": "Mixed Luck",
  "Deferred Auspice": "Later Luck",
  "Faint Auspice": "Slight Later Luck",
  "Omen of Misfortune": "Bad Luck",

  // 既に Luck 系ならそのまま
  "Great Luck": "Great Luck",
  "Good Luck": "Good Luck",
  "Small Luck": "Small Luck",
  "Mixed Luck": "Mixed Luck",
  "Later Luck": "Later Luck",
  "Slight Later Luck": "Slight Later Luck",
  "Bad Luck": "Bad Luck",
};

const raw = fs.readFileSync(file, "utf8");
const data = JSON.parse(raw);

let rankChanges = 0;
let headerChanges = 0;

for (const item of data) {
  // 1) rank_en → Luck 軸に
  const beforeRank = item.rank_en?.trim?.() ?? item.rank_en;
  const afterRank = TO_LUCK[beforeRank] ?? beforeRank;
  if (afterRank !== beforeRank) {
    item.rank_en = afterRank;
    rankChanges++;
  }

  // 2) header_en のコロン以降を Luck 軸に
  //    "Twenty-Third: Great Blessing" → "Twenty-Third: Great Luck"
  if (typeof item.header_en === "string") {
    const m = item.header_en.match(/^(.*?):\s*(.+)$/);
    if (m) {
      const left = m[1];
      const right = m[2].trim();
      const mappedRight = TO_LUCK[right] ?? right;
      const newHeader = `${left}: ${mappedRight}`;
      if (newHeader !== item.header_en) {
        item.header_en = newHeader;
        headerChanges++;
      }
    }
  }
}

// backup & write
const backup = `${file}.bak`;
fs.writeFileSync(backup, raw, "utf8");
fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");

console.log(`[OK] Updated: ${file}`);
console.log(` - rank_en changed:   ${rankChanges}`);
console.log(` - header_en changed: ${headerChanges}`);
console.log(`Backup written -> ${backup}`);
