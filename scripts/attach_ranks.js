const fs = require('fs');
const path = require('path');

const inJson = path.resolve(process.argv[2] || './src/data/kannon_100.json');
const rankMapPath = path.resolve(process.argv[3] || './src/data/rank_map.json');
const outJson = path.resolve(process.argv[4] || './src/data/kannon_100_ranked.json');

if (!fs.existsSync(inJson) || !fs.existsSync(rankMapPath)) {
  console.error('usage: node scripts/attach_ranks.js <in.json> <rank_map.json> <out.json>');
  process.exit(1);
}

const lots = JSON.parse(fs.readFileSync(inJson, 'utf-8'));
const rankMap = JSON.parse(fs.readFileSync(rankMapPath, 'utf-8'));

const ranked = lots.map(x => ({
  ...x,
  rank: rankMap[String(x.number)] || null
}));

// 検証：配分チェック
const dist = ranked.reduce((acc, x) => {
  acc[x.rank || 'null'] = (acc[x.rank || 'null'] || 0) + 1;
  return acc;
}, {});
console.log('[CHECK] distribution:', dist);

fs.writeFileSync(outJson, JSON.stringify(ranked, null, 2), 'utf-8');
console.log(`[OK] wrote ${outJson} (${ranked.length} items)`);
