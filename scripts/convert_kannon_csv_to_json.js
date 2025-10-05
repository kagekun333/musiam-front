const fs = require('fs');

function main() {
  const inCsv = process.argv[2];
  const outJson = process.argv[3];
  if (!inCsv || !outJson) {
    console.error('usage: node scripts/convert_kannon_csv_to_json.js <in.csv> <out.json>');
    process.exit(1);
  }
  // BOM除去 + 改行統一
  const raw0 = fs.readFileSync(inCsv, 'utf-8');
  const raw = raw0.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');

  const lines = raw.split('\n').filter(Boolean);
  if (lines.length === 0) {
    console.error('empty csv');
    process.exit(2);
  }
  const headerLine = lines.shift();
  const cols = headerLine.split(',');

  const idx = {
    number: cols.indexOf('number'),
    header: cols.indexOf('header'),
    poem: cols.indexOf('poem'),
    source_url: cols.indexOf('source_url'),
  };

  function cell(arr, i) { return (i >= 0 && i < arr.length) ? arr[i] : ''; }

  const data = [];
  for (const line of lines) {
    const cells = line.split(',');
    const num = Number(cell(cells, idx.number));
    if (!num) continue;
    const header = cell(cells, idx.header);
    const poemCell = cell(cells, idx.poem);
    const sourceUrl = cell(cells, idx.source_url);
    data.push({
      number: num,
      header: header || undefined,
      poem: (poemCell || '').split(' / ').map(s => s.trim()).filter(Boolean),
      sourceUrl: sourceUrl || undefined,
      jp: {}, en: {}
    });
  }
  fs.writeFileSync(outJson, JSON.stringify(data, null, 2), 'utf-8');
  console.log('[OK] wrote ' + outJson + ' (' + data.length + ' items)');
}
main();
