// scripts/extract_kannon_items.mjs
// 用途: src/data/kannon100/**/原文*.txt から「運勢カテゴリ」部を抽出し、
//       src/data/omikuji/locale/ja.json の items に自動投入する。
// 使い方例:
//   node scripts/extract_kannon_items.mjs \
//     --src src/data/kannon100 \
//     --ja src/data/omikuji/locale/ja.json \
//     --audit src/data/omikuji/audit.json

import fs from "node:fs";
import path from "node:path";

const argv = new Map(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) {
      const key = cur.slice(2);
      const val = arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : "true";
      acc.push([key, val]);
    }
    return acc;
  }, [])
);

const SRC_DIR = argv.get("src") || "src/data/kannon100";
const JA_JSON = argv.get("ja") || "src/data/omikuji/locale/ja.json";
const AUDIT_JSON = argv.get("audit") || "src/data/omikuji/audit.json";

// === 抽出対象キーとパターン（同義語も吸収） ===
// 保存先キー -> [正規表現（日本語/漢字/中国語の揺れを吸収）, 正規化関数(optional)]
const FIELD_PATTERNS = [
  ["wish",      /^(?:願望|愿望|願い|所願)\s*[:：]\s*(.*)$/],
  ["health",    /^(?:疾病|病気|健康)\s*[:：]\s*(.*)$/],
  ["lost",      /^(?:遺失物|失物|亡失物)\s*[:：]\s*(.*)$/],
  ["person",    /^(?:待人|盼望(?:之|の)?人|盼望的人|音信|来訪者)\s*[:：]\s*(.*)$/],
  ["houseMove", /^(?:引越|転居|移転|家移り|移徙|蓋房子(?:搬家)?)\s*[:：]\s*(.*)$/],
  ["marriage",  /^(?:婚姻|縁談|嫁娶|結婚)\s*[:：]\s*(.*)$/],
];

// 4句の詩が終わるライン境界検出（既存のmigrateと整合する最低限のルール）
// 先に4行の漢詩（全角漢字主体）を通過後、その後半にカテゴリ群が来る前提。
function isKanjiLine(line) {
  // 句読点や全角スペース含みつつ、かな・英字ほぼ無しを許容
  const stripped = line.replace(/[、。．，\s　…・・]/g, "");
  // 簡易にCJK割合で判定
  const cjkCount = (stripped.match(/[\p{Script=Han}々〆ヶ]/gu) || []).length;
  return stripped.length > 0 && cjkCount / stripped.length > 0.8;
}

function readAllOriginalTxts(srcDir) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true })
    .filter(d => d.isDirectory() && /^\d{3}$/.test(d.name))
    .map(d => d.name)
    .sort((a, b) => Number(a) - Number(b));

  const files = [];
  for (const dir of entries) {
    const full = path.join(srcDir, dir);
    const txts = fs.readdirSync(full).filter(f => /^原文.*\.txt$/.test(f));
    if (txts.length === 0) continue;
    // 原則1ファイル想定、最初の1つを採用
    files.push({ id: Number(dir), file: path.join(full, txts[0]) });
  }
  return files;
}

function splitHeadPoemAndTail(lines) {
  // 見出し行（例：「第九十六　大吉」）は読み飛ばし
  const body = lines.filter(l => !/^第[一二三四五六七八九十百〇零一二三四五六七八九十]+\s*[　 ]/.test(l.trim()));
  // 4句連続の漢詩行を収集
  const poem = [];
  const rest = [];
  for (const l of body) {
    if (poem.length < 4 && isKanjiLine(l.trim())) {
      poem.push(l.trim());
    } else {
      rest.push(l);
    }
  }
  return { poem, tail: rest };
}

function extractFieldsFromTail(tailLines) {
  // 後半から各カテゴリを抽出（1行形式を想定。複数行の場合は1行目を採用）
  const result = {
    wish: "",
    health: "",
    lost: "",
    person: "",
    houseMove: "",
    marriage: "",
  };

  // 正規化：全角コロン/空白の揺れを吸収
  const norm = (s) =>
    s
      .replace(/\s+/g, " ")
      .replace(/[：:]\s*/g, "：")
      .trim();

  const lines = tailLines
    .map((l) => norm(l))
    .filter((l) => l && !/^（.*）$/.test(l)); // 全角カッコだけの注釈行は除外

  // マルチヒット防止で未充填キーのみ探索
  for (const line of lines) {
    for (const [key, rx] of FIELD_PATTERNS) {
      if (!result[key]) {
        const m = line.match(rx);
        if (m) {
          result[key] = (m[1] || "").trim();
        }
      }
    }
  }
  return result;
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function saveJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
}

(function main() {
  const ja = loadJson(JA_JSON); // 既存の骨組み { summary: {}, items: { [id]: {..} } } を想定
  const audit = loadJson(AUDIT_JSON); // 参照だけ（ファイルパス合致チェックに利用可・必須ではない）

  if (!ja.items) ja.items = {};
  const originals = readAllOriginalTxts(SRC_DIR);

  const report = [];
  let filled = 0;

  for (const { id, file } of originals) {
    const raw = fs.readFileSync(file, "utf8").split(/\r?\n/);
    const { poem, tail } = splitHeadPoemAndTail(raw);

    if (poem.length !== 4) {
      report.push({ id, file, error: `poem_lines=${poem.length} (expected 4)` });
      continue;
    }

    const fields = extractFieldsFromTail(tail);

    // 既存データを壊さないように、空欄のみ上書き／または強制上書きフラグ化しても良い
    if (!ja.items[id]) ja.items[id] = { wish: "", health: "", lost: "", person: "", houseMove: "", marriage: "" };

    for (const k of Object.keys(fields)) {
      if (fields[k]) ja.items[id][k] = fields[k];
    }

    const nonEmpty = Object.values(fields).filter(Boolean).length;
    filled += nonEmpty > 0 ? 1 : 0;

    report.push({ id, file, extracted: fields, nonEmpty });
  }

  saveJson(JA_JSON, ja);

  const outReport = {
    updatedAt: new Date().toISOString(),
    srcDir: SRC_DIR,
    target: JA_JSON,
    total: originals.length,
    withAnyField: filled,
    details: report,
  };
  const outPath = "tempdata/extract_kannon_items_report.json";
  fs.mkdirSync("tempdata", { recursive: true });
  saveJson(outPath, outReport);

  console.log(`[extract_kannon_items] OK: ${filled}/${originals.length} entries had at least one field. Report: ${outPath}`);
})();
