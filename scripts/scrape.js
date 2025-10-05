const fs = require("fs");
const path = require("path");
const axios = require("axios").default;
const cheerio = require("cheerio");
const iconv = require("iconv-lite");
const Encoding = require("encoding-japanese");
const { format } = require("@fast-csv/format");

const BASE = "http://www.chance.org.tw";
const INDEX_URL = BASE + "/籤詩集/淺草觀音寺一百籤/籤詩網‧淺草觀音寺一百籤.htm";
const OUT_DIR = path.join(__dirname, "..", "src", "data", "kannon100");

const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decodeBody(buf) {
  try { const s = buf.toString("utf8"); if ((s.match(/�/g)||[]).length < 5) return s; } catch {}
  try { return iconv.decode(buf, "big5"); } catch {}
  return Encoding.convert(buf, { to: "UNICODE", from: "AUTO", type: "string" });
}

/* ==== Big5 URL encode (IIS6対応・%保護) ==== */
function pctEncBig5Char(ch, keepSet) {
  if (keepSet.test(ch)) return ch;
  const buf = iconv.encode(ch, "big5");
  let out = ""; for (const b of buf) out += "%" + b.toString(16).toUpperCase().padStart(2,"0");
  return out;
}
function encodeBig5Component(str, keepSet) { return Array.from(str).map(ch => pctEncBig5Char(ch, keepSet)).join(""); }
function encodeBig5URL(u) {
  const url = new URL(u);
  const keepPath  = /[A-Za-z0-9\-._~\/%]/;
  const keepQuery = /[A-Za-z0-9\-._~=&+%]/;
  const encPath  = encodeBig5Component(url.pathname, keepPath);
  const encQuery = url.search ? ("?" + encodeBig5Component(url.search.slice(1), keepQuery)) : "";
  return url.origin + encPath + encQuery;
}

async function getHtml(url) {
  const u = encodeBig5URL(url);
  const res = await axios.get(u, {
    responseType: "arraybuffer",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Referer": "http://www.chance.org.tw/",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Encoding": "identity"
    },
    timeout: 30000,
    validateStatus: s => s>=200 && s<400
  });
  return decodeBody(Buffer.from(res.data));
}

// 相対→絶対（../ も含め正確解決）
function toAbsUrl(src, indexUrl) {
  if (!src) return null;
  const base = indexUrl || INDEX_URL;
  const u = new URL(src, base);
  let pathU = u.pathname, qU = u.search;
  try { pathU = decodeURIComponent(u.pathname); } catch {}
  try { qU    = u.search ? ("?" + decodeURIComponent(u.search.slice(1))) : ""; } catch {}
  return u.origin + pathU + qU;
}

/* ===== テキスト抽出ロジック（“本文だけ”を狙い撃ち） ===== */
function getDomLines($$) {
  return $$("p,div,span,li,td,th,center,b,strong")
    .map((i,el)=> $$(el).text().trim())
    .get()
    .map(s => s.replace(/\s+/g, " "))
    .filter(Boolean);
}
function getZhLines($$) {
  const junk = /(LIVE|PDF|研究室|提醒您|重譯|更新|JAXA|H2A|大氣|全球|富岳|YOUTUBE|HTTP|HTTPS)/i;
  return getDomLines($$).filter(line => {
    if (junk.test(line)) return false;
    if (/[ぁ-ゟ゠ァ-ヿ]/.test(line)) return false;     // かなカナ排除
    const han = (line.match(/[\u4E00-\u9FFF]/g)||[]).length;
    const latin = (line.match(/[A-Za-z]/g)||[]).length;
    return han >= Math.max(4, Math.ceil(line.length*0.3)) && latin <= 3;
  });
}
const reHeading = /^第[\u4E00-\u9FFF\d\s]{1,6}(吉|凶)/;
const isPoemTitle = s => /^[\u4E00-\u9FFF]{2,12}$/.test(s) && !/[：。！，、．,.]/.test(s);
const isSentence   = s => /。/.test(s);
const isLabelLine  = s => /^[\u4E00-\u9FFF]{1,12}：/.test(s) && s.length < 30;

function pickCoreZh(zh) {
  if (!zh.length) return "";
  let idx = zh.findIndex(s => reHeading.test(s));
  if (idx < 0) idx = 0;

  const out = [];
  // 見出し
  const heading = zh[idx].replace(/\s+/g, " ").trim();
  out.push(heading, "");

  // 四句＋解説（最大5ペアまで保険）
  let pairs = 0;
  for (let i=idx+1; i<zh.length && pairs<5; i++) {
    const t = zh[i];
    if (isLabelLine(t)) break;                      // ラベル節に入ったら終了
    if (isPoemTitle(t)) {
      out.push(t);
      const next = zh[i+1] || "";
      if (next && isSentence(next)) { out.push(next); i++; }
      pairs++;
    }
  }

  // ラベル群（願望/疾病/盼望的人/遺失物/蓋新居…）
  const firstLab = zh.findIndex(isLabelLine);
  if (firstLab >= 0) {
    for (let i=firstLab; i<zh.length; i++) {
      let t = zh[i];
      if (!isLabelLine(t) && !/^萬事/.test(t)) break;
      // 値が次行に分かれている場合は結合
      const key = t.match(/^([\u4E00-\u9FFF]{1,12})：/);
      if (key) {
        const nxt = zh[i+1] || "";
        if (nxt && !isLabelLine(nxt) && !isPoemTitle(nxt)) { t = `${key[1]}：${nxt}`; i++; }
      }
      out.push(t);
    }
  }

  // 注意書き（萬事…）が見つからなければ探して最後に追加
  if (!out.some(s => /^萬事/.test(s))) {
    const caution = zh.find(s => /^萬事/.test(s) || /謹慎|小心/.test(s));
    if (caution) out.push(caution);
  }

  // 余白整理
  const cleaned = [];
  for (const line of out) {
    if (!line) { if (cleaned[cleaned.length-1] !== "") cleaned.push(""); continue; }
    cleaned.push(line);
  }
  return cleaned.join("\n").trim() + "\n";
}

async function download(url, filepath) {
  if (!url) return false;
  const u = encodeBig5URL(url);
  const deU = decodeURIComponent(u);
  if (/\/_borders\//i.test(deU)) return false;         // サイト共通ロゴ等は捨てる
  if (/\[[^\/]*\.gif$/i.test(deU)) return false;

  for (let t=0;t<3;t++){
    try {
      const r = await axios.get(u, {
        responseType: "arraybuffer",
        headers: { "User-Agent": "Mozilla/5.0", "Referer": "http://www.chance.org.tw/", "Accept-Encoding": "identity" },
        timeout: 30000
      });
      fs.writeFileSync(filepath, r.data);
      return true;
    } catch(e) {
      if (t===2){ console.warn("[warn] download fail:", u, e.message); return false; }
      await sleep(800*(t+1));
    }
  }
}

(async () => {
  ensureDir(OUT_DIR);

  console.log("[*] INDEX:", INDEX_URL);
  const html = await getHtml(INDEX_URL);
  const $ = cheerio.load(html, { decodeEntities:false });

  // 1..100 の青リンクを集める
  const linksRaw = $("a[href]").map((i,el)=>({
    text: ($(el).text()||"").trim(),
    href: $(el).attr("href")||""
  })).get();

  const normalizeDigits = s => (s||"").replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0)-0xFEE0)).replace(/[^\d]/g, "");
  const parseNumLoose   = s => { const t = normalizeDigits(s); if (!t) return null; const n = parseInt(t,10); return (n>=1 && n<=100) ? n : null; };

  const digits = linksRaw.map(x => ({ num: parseNumLoose(x.text), abs: toAbsUrl(x.href, INDEX_URL) }))
                         .filter(x => x.num !== null);

  if (!digits.length) { console.error("数字リンクが見つかりません。"); process.exit(1); }

  const byNum = {}; for (const d of digits) if (!byNum[d.num]) byNum[d.num] = d.abs;
  console.log(`[+] numeric links found: ${Object.keys(byNum).length}`);

  const results = [];
  for (let n=1; n<=100; n++){
    const url = byNum[n] || null;
    try {
      const h  = await getHtml(url);
      const $$ = cheerio.load(h, { decodeEntities:false });

      const zhLines = getZhLines($$);
      const coreZh  = pickCoreZh(zhLines);

      // 画像
      const imgs = $$("img").map((i,el)=> $$(el).attr("src")).get()
        .map(src=>toAbsUrl(src, url))
        .filter(Boolean);
      const uniq = Array.from(new Set(imgs))
        .filter(u => !/\/_borders\//i.test(u))
        .filter(u => !/\[[^\/]*\.gif$/i.test(decodeURIComponent(u)));
      const front = uniq[0] || null;
      const back  = uniq[1] || null;

      const title = (zhLines.find(s => reHeading.test(s)) || `第${String(n).padStart(3,"0")}籤`).trim();

      results.push({ number:n, title, raw: coreZh, images:{front, back}, url });
      process.stdout.write(`\r[+] ${n}/100 fetched`);
      await sleep(60);
    } catch(e) {
      console.warn(`\n[warn] fetch fail (No.${n}):`, e.message);
      results.push({ number:n, title:`第${String(n).padStart(3,"0")}籤`, raw:"", images:{front:null, back:null}, url:null });
    }
  }

  const csvPath = path.join(OUT_DIR, "kannon100.csv");
  const jsonPath = path.join(OUT_DIR, "kannon100.json");
  const csvStream = format({ headers:true });
  csvStream.pipe(fs.createWriteStream(csvPath));

  for (const rec of results) {
    const pad = String(rec.number).padStart(3,"0");
    const dir = path.join(OUT_DIR, pad);
    ensureDir(dir);

    if (rec.images.front) await download(rec.images.front, path.join(dir, "front.jpg"));
    if (rec.images.back)  await download(rec.images.back,  path.join(dir, "back.jpg"));

    // ★ ここが“本文だけ版” ★
    const textFile = path.join(dir, `原文${pad}.txt`);
    fs.writeFileSync(textFile, [`# ${rec.title}`, "", rec.raw || ""].join("\n"), "utf8");

    csvStream.write({
      number: rec.number,
      title: rec.title,
      front: rec.images.front || "",
      back:  rec.images.back  || "",
      text_path: textFile,
      preview: (rec.raw || "").split("\n").slice(0,6).join(" / "),
      source: rec.url || INDEX_URL
    });
  }
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), "utf8");
  csvStream.end();

  const miss = results.filter(x => !(x.images.front && x.images.back)).map(x=>x.number);
  console.log("\n--- Report ---");
  console.log("Total:", results.length);
  console.log("Missing front/back:", miss.length ? miss.join(", ") : "none");
  console.log("Example text:", path.join(OUT_DIR, "001", "原文001.txt"));
})();
