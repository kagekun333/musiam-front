// scripts/scrape_kannon_gap_text.mjs
// Node 18+/22+。依存: cheerio, iconv-lite
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const TARGET_URL =
  "http://www.chance.org.tw/%E7%B1%A4%E8%A9%A9%E9%9B%86/%E6%B7%BA%E8%8D%89%E8%A7%80%E9%9F%B3%E5%AF%BA%E4%B8%80%E7%99%BE%E7%B1%A4/%E7%B1%A4%E8%A9%A9%E7%B6%B2%E2%80%A7%E6%B7%BA%E8%8D%89%E8%A7%80%E9%9F%B3%E5%AF%BA%E4%B8%80%E7%99%BE%E7%B1%A4.htm";

const DEST_BASE = path.join(PROJECT_ROOT, "src", "data", "kannon100");
const TMP_DIR = path.join(PROJECT_ROOT, "tempdata");
fs.mkdirSync(TMP_DIR, { recursive: true });

// 除外（注意書きなど）
const EXCLUDE_LINE = /^(請注意|注意|※)/;

// 文字コード自動判定
async function fetchHtmlWithEncoding(url) {
  const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = (res.headers.get("content-type") || "").toLowerCase();

  let htmlUtf8 = buf.toString("utf8");
  const looksBig5 =
    /big5/.test(ct) ||
    /charset\s*=\s*big5/i.test(htmlUtf8) ||
    /charset\s*=\s*big5-hkscs/i.test(htmlUtf8);

  if (looksBig5) {
    const iconv = await import("iconv-lite");
    return iconv.default.decode(buf, "big5");
  }
  return htmlUtf8;
}

// HTML→テキスト整形
function htmlToCleanText(fragmentHtml) {
  const cleaned = fragmentHtml
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|td|table|section|article|blockquote|center)>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");
  const $ = load(cleaned, { decodeEntities: true });
  return $.root()
    .text()
    .replace(/\u00A0/g, " ")
    .replace(/\r/g, "")
    .split("\n")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 0 && !EXCLUDE_LINE.test(s))
    .join("\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

// hrefフラグメントに一致するターゲット要素を探す（name優先→id厳密一致）
function findTargetByFragment($, frag) {
  // name属性の厳密一致
  let target = $(`a[name="${frag}"]`);
  if (target.length) return target.first();

  // id属性の厳密一致（CSSセレクタだと特殊文字問題があるので総当たり）
  const ids = $("[id]").toArray();
  for (const el of ids) {
    const id = $(el).attr("id");
    if (id === frag) return $(el);
  }
  return $(); // 見つからない
}

// 数字リンク一覧を取得：<a href="#...">X</a> の “表示テキストX(1..100)” を正とする
function collectNumberLinks($) {
  const links = [];
  $(`a[href^="#"]`).each((_, el) => {
    const txt = ($(el).text() || "").trim();
    const m = txt.match(/^\d{1,3}$/);
    if (!m) return;
    const n = parseInt(txt, 10);
    if (n < 1 || n > 100) return;
    const href = $(el).attr("href") || "";
    const frag = href.replace(/^#/, "");
    links.push({ n, frag, el });
  });
  // 1..100 の昇順で整列＆重複除去（同じ数字が複数あれば先勝ち）
  links.sort((a, b) => a.n - b.n);
  const uniq = [];
  const seen = new Set();
  for (const it of links) {
    if (!seen.has(it.n)) {
      uniq.push(it);
      seen.add(it.n);
    }
  }
  return uniq;
}

// 範囲ノードから「最初の<img>〜次の<img>の間」だけのHTMLを返す
function innerBetweenTwoImgs($range) {
  const nodes = $range.toArray();
  let first = -1,
    second = -1;
  for (let i = 0; i < nodes.length; i++) {
    const name = nodes[i].name ? nodes[i].name.toLowerCase() : "";
    if (name === "img") {
      if (first === -1) first = i;
      else {
        second = i;
        break;
      }
    }
  }
  if (first === -1 || second === -1) return "";
  const fragNodes = nodes.slice(first + 1, second);
  const html = fragNodes.map((n) => load(n).html() || load(n).text() || "").join("");
  return htmlToCleanText(html);
}

async function main() {
  console.log(`[scrape] GET: ${TARGET_URL}`);
  const html = await fetchHtmlWithEncoding(TARGET_URL);
  const $ = load(html, { decodeEntities: false });

  // 1) トップの数字リンクを取得（表示テキストで1..100を決定）
  const links = collectNumberLinks($);
  if (links.length === 0) {
    console.error("トップの数字リンク（<a href=\"#…\">1..100</a>）が見つかりません。ページ構造が変わっている可能性。");
    process.exit(1);
  }

  // 2) 各リンクのhrefフラグメントに対応するターゲット要素（name/id）を特定
  const anchorTargets = links.map((lnk) => {
    const $t = findTargetByFragment($, lnk.frag);
    return { ...lnk, $t };
  });

  // 無効ターゲットを除外
  const valid = anchorTargets.filter((x) => x.$t && x.$t.length > 0);
  if (valid.length === 0) {
    console.error("hrefフラグメントに対応する name/id のターゲットが見つかりません。");
    process.exit(1);
  }

  // 3) #n 〜 #n+1 直前までのDOM範囲を取り、その中で「画像と画像の間」を抽出
  const results = [];
  for (let i = 0; i < valid.length; i++) {
    const cur = valid[i];
    const next = valid[i + 1];

    // cur.$t の次兄弟から next.$t 直前までを集める
    const collected = [];
    let node = cur.$t.next();
    while (node.length && (!next || node[0] !== next.$t[0])) {
      collected.push(node[0]);
      node = node.next();
    }

    const text = innerBetweenTwoImgs($(collected));
    if (text) results.push({ n: cur.n, text });
  }

  // 4) 書き出し
  results.sort((a, b) => a.n - b.n);
  fs.mkdirSync(DEST_BASE, { recursive: true });

  const missing = [];
  let written = 0;
  for (let n = 1; n <= 100; n++) {
    const hit = results.find((r) => r.n === n);
    if (!hit) {
      missing.push(n);
      continue;
    }
    const n3 = String(n).padStart(3, "0");
    const dir = path.join(DEST_BASE, n3);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "原文.txt"), hit.text + "\n", "utf8");
    fs.writeFileSync(path.join(dir, `原文${n3}.txt`), hit.text + "\n", "utf8");
    written++;
  }

  // 5) プレビュー
  const prev = results.map((r) => `${String(r.n).padStart(3, "0")} | ${r.text.replace(/\n/g, " ").slice(0, 100)}...`);
  fs.writeFileSync(path.join(TMP_DIR, "kannon_anchor_preview.txt"), prev.join("\n") + "\n", "utf8");

  console.log(`\n---- Summary ----`);
  console.log(`Number links      : ${links.length}`);
  console.log(`Targets resolved  : ${valid.length}`);
  console.log(`Sections detected : ${results.length}`);
  console.log(`Written (1..100)  : ${written}`);
  console.log(`Preview           : ${path.relative(PROJECT_ROOT, path.join(TMP_DIR, "kannon_anchor_preview.txt"))}`);
  if (missing.length) {
    console.warn(`\x1b[33m[warn]\x1b[0m Missing: ${JSON.stringify(missing)}`);
  } else {
    console.log("All good: 1..100 完了。");
  }
}

main().catch((e) => {
  console.error("[error]", e);
  process.exit(1);
});
