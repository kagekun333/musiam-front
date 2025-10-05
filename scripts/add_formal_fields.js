const fs = require('fs');
const path = require('path');

// 入出力（デフォルト: ranked -> final）
const inPath  = process.argv[2] || './src/data/kannon_100_ranked.json';
const outPath = process.argv[3] || './src/data/kannon_100_final.json';

// ランク → code/weight マッピング
const RANK_MAP = {
  '大吉': { code: 'daikichi', weight: 5 },
  '吉':   { code: 'kichi',    weight: 4 },
  '小吉': { code: 'shokichi', weight: 3 },
  '末吉': { code: 'suekichi', weight: 2 },
  '末小吉':{ code: 'sueshokichi', weight: 2 },
  '半吉': { code: 'han-kichi', weight: 2 },
  '凶':   { code: 'kyo',      weight: 1 },
};

function zeroPad(n, d=3){ return String(n).padStart(d,'0'); }

function buildDisplay(n){
  const pad = zeroPad(n);
  return {
    number_padded: pad,
    display_ja: `第${pad}番`,
    display_zh: `第${pad}籤`,
  };
}

function addFormalFields(entry){
  const n = entry.number;
  const base = buildDisplay(n);
  const rk = RANK_MAP[entry.rank] || { code: 'unknown', weight: 0 };

  // 詩行の軽い整形：両端空白除去＆空行除去
  const poem = (entry.poem || []).map(s => String(s).trim()).filter(Boolean);

  return {
    ...entry,
    ...base,
    rank_code: rk.code,
    rank_weight: rk.weight,
    poem,
  };
}

function main(){
  if(!fs.existsSync(inPath)){
    console.error(`[ERR] not found: ${inPath}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(inPath, 'utf-8'));
  const out = data.map(addFormalFields);

  // 安全のためソート（1..100）
  out.sort((a,b)=>a.number-b.number);

  // 出力先ディレクトリを確保
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf-8');
  console.log(`[OK] wrote ${outPath} (${out.length} items)`);
}

main();
