const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const iconv = require("iconv-lite");

// 設定
const ROOT = path.join(__dirname, "..", "src", "data", "kannon100");
const JSON_PATH = path.join(ROOT, "kannon100.json");
const SAFE_REFERER = "http://www.chance.org.tw/"; // ASCIIのみ（IIS対策）
const CONCURRENCY = 4;

// 役物
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function toAbsUrl(src, base){
  if(!src) return "";
  try {
    // 絶対URLならそのまま
    const u = new URL(src, base);
    return u.href;
  } catch(e){
    return src;
  }
}
function normUrl(u){
  if(!u) return "";
  try {
    // 既存%は保持しつつ比較しやすく
    return decodeURI(u).replace(/^https:/,"http:").toLowerCase();
  } catch {
    return u.replace(/^https:/,"http:").toLowerCase();
  }
}

async function getHtml(url){
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Referer": SAFE_REFERER,
      "Accept-Encoding": "identity",
    },
    timeout: 30000
  });
  // まずbig5で試す。ダメならutf8。
  let html = iconv.decode(res.data, "big5");
  if (!/charset\s*=\s*big-?5/i.test(html.slice(0,2048)) && /charset\s*=\s*utf-?8/i.test(html.slice(0,2048))) {
    html = res.data.toString("utf8");
  }
  // br→改行（PowerShell経由でも壊れない表記）
  html = html.replace(/<\s*br\s*\/?>/gi, "\n");
  return html;
}

// DOMウォークで「front～backの間だけ」集める
function extractBetween($, pageUrl, frontAbs, backAbs){
  const frontN = normUrl(frontAbs);
  const backN  = normUrl(backAbs);
  let capturing = false;
  const out = [];

  function walk(node){
    if (!node) return;
    if (node.type === "tag") {
      if (node.name === "img") {
        const src = toAbsUrl($(node).attr("src") || "", pageUrl);
        const s = normUrl(src);
        if (s === frontN) capturing = true;
        if (s === backN)  capturing = false; // back自体は含めない
      } else {
        // タグ内テキストは子を辿る
      }
      if (node.children) for (const ch of node.children) walk(ch);
    } else if (node.type === "text") {
      if (capturing) {
        const t = node.data.replace(/\u00A0/g," ").trim();
        if (t) out.push(t);
      }
    }
  }

  const body = $("body")[0] || $.root()[0];
  walk(body);

  // 仕上げ整形：連続空白→1、連続改行→2
  let txt = out.join("\n");
  txt = txt.replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
  return txt;
}

async function worker(rec){
  const dir = path.join(ROOT, String(rec.number).padStart(3,"0"));
  const outPath = path.join(dir, `原文${String(rec.number).padStart(3,"0")}.txt`);
  try {
    const html = await getHtml(rec.url);
    const $ = cheerio.load(html, { decodeEntities:false });

    const frontAbs = rec.images?.front || "";
    const backAbs  = rec.images?.back  || "";
    const text = extractBetween($, rec.url, frontAbs, backAbs);

    fs.writeFileSync(outPath, text + "\n", "utf8");
    process.stdout.write(`\r[between] ${String(rec.number).padStart(3,"0")}  `);
    return true;
  } catch (e){
    console.warn(`\n[warn] ${rec.number}: ${e.message}`);
    return false;
  }
}

async function main(){
  const list = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  // 念のため番号順
  list.sort((a,b)=> (a.number||0)-(b.number||0));

  let running = 0, i = 0, ok = 0, ng = 0;
  await new Promise(resolve=>{
    function kick(){
      while (running < CONCURRENCY && i < list.length){
        const rec = list[i++];
        running++;
        worker(rec).then(r=>{ r?ok++:ng++; running--; if(i===list.length && running===0) resolve(); else kick(); });
      }
    }
    kick();
  });
  console.log(`\nDone. OK=${ok} NG=${ng}`);
}

main();
