// scripts/normalize_kannon_txt.mjs
// Kannon100 テキスト正規化: 原文(5字×4) ↔ 意訳(4行) をテンプレに整形し、カテゴリを正規ラベルに揃える
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "src/data/kannon100");
const START = "=== TEXT START ===";
const END   = "=== TEXT END ===";

const JA_LABELS = [
  { std: "願望",    alts: ["願い", "願ひ", "盼望的人", "希望", "願望事"] },
  { std: "疾病",    alts: ["病気", "病", "疾患", "病患"] },
  { std: "待人",    alts: ["待ち人", "待人兒", "盼望的人"] },
  { std: "遺失物",  alts: ["失物", "落し物", "落とし物", "失せ物"] },
  { std: "家・移転", alts: ["家", "住居", "新築", "転居", "引越", "引っ越し", "蓋新居", "搬家", "家・転居"] },
  { std: "婚姻",    alts: ["縁談", "結婚", "婚礼", "交際", "結親緣", "交往"] },
  { std: "旅行",    alts: ["旅", "行旅", "遠行"] },
];

const EN_LABELS = [
  { std: "Wishes",   alts: ["Wish", "Wishes", "Your wishes"] },
  { std: "Illness",  alts: ["Illness", "Sickness", "A sick person", "Health"] },
  { std: "Person",   alts: ["Person", "The person you are waiting for", "Those who are longed for"] },
  { std: "Lost items", alts: ["Lost item", "Lost items", "Lost article"] },
  { std: "House / Move", alts: ["Building a new house", "Moving", "House", "Home"] },
  { std: "Marriage", alts: ["Marriage", "Engagement", "Dating", "Relationship"] },
  { std: "Travel",   alts: ["Travel", "Trip", "Journey"] },
];

// ---------- helpers ----------
const readIf = async (p) => { try { return await fs.readFile(p, "utf8"); } catch { return ""; } };
const lines = (t) => t.replace(/\r/g, "").split("\n").map(s=>s.trim()).filter(Boolean);
const inside = (t) => {
  const s=t.indexOf(START), e=t.lastIndexOf(END);
  if (s>=0 && e>s) return t.slice(s+START.length, e);
  return t;
};
const headerRE = /(第[一二三四五六七八九十百0-9]+|[大小半末]吉|大凶)/;
const punctRE = /[。．.!！？?]$/;
const colonRE = /[:：]/;

// 原文から 5字熟語×4 を抽出
function extractOriginal5(orig) {
  const L = lines(orig).filter(l=>!headerRE.test(l)).join("");
  const m = [...L.matchAll(/([\p{Script=Han}]{5})/ug)].map(x=>x[1]);
  const out = m.slice(0,4);
  while (out.length<4) out.push("");
  return out;
}

// 意訳候補を 4 行に整える（短行優先 → 句点/ピリオド分割）
function extractGloss4(txt) {
  const arr = lines(inside(txt)).filter(l=>!headerRE.test(l));
  // 1) 短い行を優先（句点・コロンで終わらない行）
  const short = arr.filter(l=>!punctRE.test(l) && !colonRE.test(l));
  let out = short.slice(0,4);
  // 2) 足りなければ文で分割
  if (out.length<4) {
    const s = arr.join(" ");
    const seg = s.split(/(?<=[。．.!?？])/).map(x=>x.trim()).filter(Boolean);
    for (const x of seg) if (out.length<4) out.push(x);
  }
  while (out.length<4) out.push("");
  return out.slice(0,4);
}

// カテゴリ行を正規化（ラベル辞書を当てて「ラベル：本文」化）
function normalizeItems(txt, dict, lang) {
  const arr = lines(inside(txt));
  const out = {};
  for (const raw of arr) {
    for (const {std, alts} of dict) {
      for (const alt of alts) {
        const re = new RegExp(`^\\s*${alt}\\s*[:：]\\s*`);
        if (re.test(raw)) {
          out[std] = raw.replace(re, "").trim();
        }
      }
      // すでに std: で始まっていればそのまま
      const reStd = new RegExp(`^\\s*${std}\\s*[:：]\\s*`);
      if (reStd.test(raw)) out[std] = raw.replace(reStd, "").trim();
    }
  }
  // 出力順を固定
  const order = (lang==="ja" ? JA_LABELS : EN_LABELS).map(x=>x.std);
  return order.map(std => `${std}：${out[std] ?? ""}`); // 空は後で unspecified に置換
}

function formatTemplate({id, header, poemFour, glossFour, itemsLines}) {
  return [
    START,
    header ? header : `第${id}　`, // ざっくり見出し
    ...poemFour.map(l=>l || ""),          // 4行 原文 or gloss どちらにも流用可
    ...glossFour.map(()=>""),             // ダミー（埋めない）※視覚上の区切りはカード側でやるため
    ...itemsLines,
    END,
    "" // 末尾改行
  ].join("\n");
}

// ---------- main ----------
async function run({dry=false}={}) {
  const dirs = (await fs.readdir(ROOT, { withFileTypes: true }))
    .filter(d=>d.isDirectory() && /^\d{3}$/.test(d.name))
    .map(d=>d.name).sort((a,b)=>Number(a)-Number(b));

  for (const d of dirs) {
    const dir = path.join(ROOT, d);
    const id  = Number(d);

    const orig = await readIf(path.join(dir, `原文${d}.txt`));
    const ja   = await readIf(path.join(dir, "ja.txt"));
    const en   = await readIf(path.join(dir, "en.txt"));

    if (!orig) { console.warn(`[SKIP] ${d}: 原文${d}.txt がありません`); continue; }

    const orig4 = extractOriginal5(orig);
    const ja4   = extractGloss4(ja);
    const en4   = extractGloss4(en);

    const itemsJa = normalizeItems(ja, JA_LABELS, "ja");
    const itemsEn = normalizeItems(en, EN_LABELS, "en");

    // バックアップ
    if (!dry) {
      if (ja) await fs.writeFile(path.join(dir, "ja.txt.bak"), ja, "utf8");
      if (en) await fs.writeFile(path.join(dir, "en.txt.bak"), en, "utf8");
    }

    // テンプレで上書き（四句は“原文5字×4”を主とし、意訳4行はカード側で連動表示するためここでは保管しない）
    const header = lines(orig).find(l=>headerRE.test(l)) ?? "";
    const jaOut = formatTemplate({id, header, poemFour: ja4, glossFour: [], itemsLines: itemsJa});
    const enOut = formatTemplate({id, header, poemFour: en4, glossFour: [], itemsLines: itemsEn});

    if (!dry) {
      await fs.writeFile(path.join(dir, "ja.txt"), jaOut, "utf8");
      await fs.writeFile(path.join(dir, "en.txt"), enOut, "utf8");
    }

    console.log(`[OK] ${d}  原文(5x4)=${JSON.stringify(orig4)}  JA4=${JSON.stringify(ja4)}  EN4=${JSON.stringify(en4)}`);
  }
}

const DRY = process.argv.includes("--dry-run");
run({dry:DRY}).catch(e=>{ console.error(e); process.exit(1); });
