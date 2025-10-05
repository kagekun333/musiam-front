// scripts/sync_from_core_bak.mjs
// poem_kanji(5字×4)は src/data/omikuji/core.json を権威に、
// 見出し(番号+ランク)と説明・カテゴリは各 NNN/ja.txt.bak / en.txt.bak から採用して
// NNN/ja.txt / NNN/en.txt を再生成する。

import fs from "node:fs/promises";
import path from "node:path";

// データ配置
const ROOT = path.resolve("src/data/kannon100");          // 001..100 のディレクトリ
const CORE = path.resolve("src/data/omikuji/core.json");  // 権威の四句（漢字5字×4）

const START = "=== TEXT START ===";
const END   = "=== TEXT END ===";

// 出力側の標準ラベル（左側が最終表示のキー）
const JA_LABELS = [
  ["願望",    ["願望", "願い", "願望事"]],
  ["疾病",    ["疾病", "病気", "病"]],
  ["遺失物",  ["遺失物", "失物", "落し物", "落とし物"]],
  ["待人",    ["待人", "待ち人", "盼望的人"]],
  ["家・移転",["家・移転", "家", "住居", "新築", "転居", "引越", "引っ越し", "蓋新居、搬家", "蓋新居", "搬家"]],
  ["婚姻",    ["婚姻", "縁談", "結婚", "交際", "結親緣", "交往"]],
  ["旅行",    ["旅行", "旅", "行旅"]],
];
const EN_LABELS = [
  ["Wishes",      ["Wishes", "Wish", "Your wishes"]],
  ["Illness",     ["Illness", "Sickness", "A sick person", "Health"]],
  ["Lost items",  ["Lost items", "Lost item", "Lost article"]],
  ["Person",      ["Person", "The person you are waiting for", "Those Who Are Longed For"]],
  ["House / Move",["House / Move", "Building a New Home, Moving, Marriage, Travel, Socializing, etc.", "Building a New Home, Moving", "House", "Move"]],
  ["Marriage",    ["Marriage", "Engagement", "Dating", "Relationship"]],
  ["Travel",      ["Travel", "Trip", "Journey"]],
];

const readIf = async p => { try { return await fs.readFile(p, "utf8"); } catch { return ""; } };

// テキストを行配列に（BOM・CR 除去）
const toLines = t =>
  t.replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n").map(s => s.trim());

// 制御マーカーや空行を除外
const stripMarkers = arr =>
  arr.filter(l => l && l !== START && l !== END);

// 5字熟語判定
const isFiveHan = s => /^[\p{Script=Han}]{5}$/u.test((s || "").trim());

// .bak からヘッダー（見出し行）を抽出：最初の「非空・非マーカー」行
function extractHeaderFromBak(bakText, fallback) {
  const arr = stripMarkers(toLines(bakText));
  return arr[0] || fallback || "";
}

// .bak から 各句の説明4本 と カテゴリを抽出
function extractExplAndItems(bakText, lang = "ja") {
  const raw = stripMarkers(toLines(bakText));

  // 句→説明： 「5字行」の直後の非空行を採用（必要なら文の先頭1文に切る）
  const expl = [];
  for (let i = 0; i < raw.length && expl.length < 4; i++) {
    const line = raw[i];
    if (!isFiveHan(line)) continue;
    let j = i + 1;
    while (j < raw.length && !raw[j]) j++;
    if (j >= raw.length) { expl.push(""); continue; }
    let g = raw[j];
    if (lang === "en") {
      g = (g.split(/(?<=[.!?])\s+/).filter(Boolean)[0] || g).trim();
    } else {
      g = (g.split(/(?<=[。．！？?])/).filter(Boolean)[0] || g).trim();
    }
    expl.push(g);
  }
  while (expl.length < 4) expl.push("");

  // カテゴリ正規化：「ラベル：本文」を抽出（表記ゆれ吸収）
  const dict = (lang === "ja") ? JA_LABELS : EN_LABELS;
  const itemsMap = {};
  for (const [std, alts] of dict) {
    let hit = raw.find(l => new RegExp(`^\\s*${std}\\s*[:：]`).test(l));
    if (!hit) {
      for (const alt of alts) {
        hit = raw.find(l => new RegExp(`^\\s*${alt}\\s*[:：]`).test(l));
        if (hit) break;
      }
    }
    if (hit) itemsMap[std] = hit.replace(/^.*[:：]\s*/, "").trim();
  }
  return { expl, itemsMap };
}

function formatOut(headerLine, poem4, expl4, itemsMap, lang = "ja") {
  const order = (lang === "ja" ? JA_LABELS : EN_LABELS).map(x => x[0]);
  const lines = [
    START,
    headerLine,                        // .bak の見出しそのまま（マーカーは除去済み）
    poem4[0] || "", expl4[0] || "",
    poem4[1] || "", expl4[1] || "",
    poem4[2] || "", expl4[2] || "",
    poem4[3] || "", expl4[3] || "",
    ...order.map(std => `${std}：${itemsMap[std] ?? ""}`),
    END,
    ""
  ];
  return lines.join("\n");
}

async function run() {
  // core.json を読み、id→poem_kanji[4] を準備
  const coreRaw = await fs.readFile(CORE, "utf8");
  const coreArr = JSON.parse(coreRaw); // [{id, poem_kanji:[4], ...}]
  const poemById = new Map(
    coreArr.map(x => [Number(x.id), (x.poem_kanji || []).slice(0, 4)])
  );

  // ディレクトリ一覧（001..100）
  const dirs = (await fs.readdir(ROOT, { withFileTypes: true }))
    .filter(d => d.isDirectory() && /^\d{3}$/.test(d.name))
    .map(d => d.name)
    .sort((a, b) => Number(a) - Number(b));

  for (const d of dirs) {
    const id = Number(d);
    const poem4 = (poemById.get(id) || []).slice(0, 4);
    while (poem4.length < 4) poem4.push("");

    const dir = path.join(ROOT, d);

    // .bak 優先で読み込み（無ければ現行をfallback）
    const jaBak = await readIf(path.join(dir, "ja.txt.bak")) || await readIf(path.join(dir, "ja.txt"));
    const enBak = await readIf(path.join(dir, "en.txt.bak")) || await readIf(path.join(dir, "en.txt"));

    // 見出し（ランク行）は .bak から採用（マーカー無視）
    const jaHeader = extractHeaderFromBak(jaBak, `第${id}`);
    const enHeader = extractHeaderFromBak(enBak, `No.${id}`);

    // 説明とカテゴリ
    const { expl: jaExpl, itemsMap: jaItems } = extractExplAndItems(jaBak, "ja");
    const { expl: enExpl, itemsMap: enItems } = extractExplAndItems(enBak, "en");

    const jaOut = formatOut(jaHeader, poem4, jaExpl, jaItems, "ja");
    const enOut = formatOut(enHeader, poem4, enExpl, enItems, "en");

    // バックアップ（上書き前の現行を .prev に保存）
    const jaCur = await readIf(path.join(dir, "ja.txt"));
    const enCur = await readIf(path.join(dir, "en.txt"));
    if (jaCur) await fs.writeFile(path.join(dir, "ja.txt.prev"), jaCur, "utf8");
    if (enCur) await fs.writeFile(path.join(dir, "en.txt.prev"), enCur, "utf8");

    await fs.writeFile(path.join(dir, "ja.txt"), jaOut, "utf8");
    await fs.writeFile(path.join(dir, "en.txt"), enOut, "utf8");

    console.log(`[OK] ${d}  headerJA="${jaHeader}"  headerEN="${enHeader}"  poem=${JSON.stringify(poem4)}`);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
