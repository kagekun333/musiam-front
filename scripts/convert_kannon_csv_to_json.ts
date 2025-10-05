import * as fs from 'fs';

type JPEN = { literal?: string; interpretive?: string; poetic?: string; };
type KannonLot = {
  number: number;
  header?: string;
  poem: string[];
  sourceUrl?: string;
  jp: JPEN;
  en: JPEN;
};

const args = process.argv.slice(2);
const inCsv = args[0];
const outJson = args[1];

if (!inCsv || !outJson) {
  console.error('usage: npx ts-node scripts/convert_kannon_csv_to_json.ts <in.csv> <out.json>');
  process.exit(1);
}

// 依存ゼロの簡易CSVパーサ（※カンマ埋め込みなし前提。詩は " / " 区切り）
const raw = fs.readFileSync(inCsv, 'utf-8').replace(/\r\n/g, '\n');
const lines = raw.split('\n').filter(Boolean);
if (lines.length === 0) {
  console.error('empty csv');
  process.exit(2);
}
const headerLine = lines.shift() as string;
const cols = headerLine.split(',');

const idx = {
  number: cols.indexOf('number'),
  header: cols.indexOf('header'),
  poem: cols.indexOf('poem'),
  source_url: cols.indexOf('source_url')
};

function cell(cells: string[], i: number): string {
  return i >= 0 && i < cells.length ? cells[i] : '';
}

const data: KannonLot[] = [];
for (const line of lines) {
  const cells = line.split(',');
  const number = Number(cell(cells, idx.number));
  if (!number) continue;
  const header = cell(cells, idx.header);
  const poemCell = cell(cells, idx.poem);
  const sourceUrl = cell(cells, idx.source_url);
  data.push({
    number,
    header: header || undefined,
    poem: (poemCell || '').split(' / ').map(s => s.trim()).filter(Boolean),
    sourceUrl: sourceUrl || undefined,
    jp: {}, en: {}
  });
}

fs.writeFileSync(outJson, JSON.stringify(data, null, 2), 'utf-8');
console.log('[OK] wrote ' + outJson + ' (' + data.length + ' items)');
