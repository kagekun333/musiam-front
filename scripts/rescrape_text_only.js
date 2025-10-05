// scripts/rescrape_text_only.js  (no-deps concurrency + safe headers)
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const iconv = require("iconv-lite");

const DATA_DIR  = path.join(__dirname, "..", "src", "data", "kannon100");
const JSON_PATH = path.join(DATA_DIR, "kannon100.json");

// Referer は ASCII に固定（多言語URLはヘッダNG）
const SAFE_REFERER = "http://www.chance.org.tw/";

const HEADING_RE = /第[一二三四五六七八九十百零〇\d]+\s*(?:大吉|中吉|小吉|吉|末吉|末小吉|半吉|凶|大凶)/;
const TITLE_RE   = /^[一-龥\u3040-\u30FF\uFF01-\uFF60]{2,12}$/;
const SENT_END   = /[。．.!！?？]/;
const LABEL_KEYS = ["願望","疾病","盼望的人","遺失物","失物","蓋新居","搬家","嫁娶","旅行","交往","商売","求財","學業","訴訟","萬事"];

const MAX_BLANKS = 3;
const WANT_PAIRS = 4;
const CONCURRENCY = 4;

function ensureDir(d){ if (!fs.existsSync(d)) fs.mkdirSync(d, {recursive:true}); }
async function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function getHtml(url) {
  const r = await axios.get(url, {
    responseType: "arraybuffer",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Referer": SAFE_REFERER,
      "Accept-Encoding": "identity"
    },
    timeout: 30000,
    validateStatus: s => s>=200 && s<400
  });
  let html;
  try { html = iconv.decode(r.data, "big5"); } catch { html = r.data.toString("utf8"); }
  // <br> を改行へ（PowerShell経由でも崩れない表記）
  html = html.replace(/<\s*br\s*\/?>/gi, "\n");
  return html;
}

function toLines($){
  const sels = "p,div,span,li,center,b,strong,td,font";
  const lines = $(sels).map((i,el)=>$(el).text()).get()
    .map(s => (s||"").replace(/\r/g,"").replace(/\u00a0/g," ")
      .replace(/[ \t]+/g," ").replace(/[　]+/g," ").trim())
    .filter(Boolean);
  return lines;
}

function isNoise(s){
  if (/https?:\/\//i.test(s)) return true;
  if (/LIVE直播|PDF|研究室|JAXA|Youtube|youtube/i.test(s)) return true;
  if (/^\d{4}\.[01]?\d\.[0-3]?\d/.test(s)) return true;
  if (/^\./.test(s)) return true;
  return false;
}

function extractHeading(lines){
  for (const s of lines){ const m = s.match(HEADING_RE); if (m) return m[0].replace(/\s+/g,""); }
  return "";
}

function extractPairs(lines){
  const pairs = [];
  for (let i=0;i<lines.length;i++){
    const t = lines[i];

    // 同一行パターン: 「七寶浮圖塔 説明。」
    let m = t.match(/^([一-龥]{2,12})[ 　]+(.+)$/);
    if (m && SENT_END.test(m[2])){ pairs.push([m[1], m[2]]); if (pairs.length>=WANT_PAIRS) break; continue; }

    if (!TITLE_RE.test(t)) continue;
    if (HEADING_RE.test(t)) continue; // 見出し除外

    let j=i+1, blanks=0, expl="";
    while (j<lines.length && blanks<=MAX_BLANKS){
      const s = lines[j];
      if (!s){ blanks++; j++; continue; }
      if (TITLE_RE.test(s) || HEADING_RE.test(s)) break;
      if (SENT_END.test(s)){ expl=s; break; }
      const comb = s+" "+(lines[j+1]||"");
      if (SENT_END.test(comb)){ expl=comb; break; }
      j++;
    }
    if (expl){ pairs.push([t, expl]); if (pairs.length>=WANT_PAIRS) break; }
  }
  return pairs;
}

function extractLabels(lines){
  const out=[];
  for (let i=0;i<lines.length;i++){
    const s = lines[i];
    for (const k of LABEL_KEYS){
      if (s.startsWith(k+"：") || s.startsWith(k+":")) { out.push(s); break; }
      if (s===k+"：" || s===k+":") {
        const next = (lines[i+1]||"").trim();
        if (next) out.push(`${k}：${next}`);
      }
    }
  }
  return out;
}

function extractCaution(lines){
  for (const s of lines){
    if (/萬事|謹慎|小心|當心|粗心大意/.test(s)){
      const m = s.match(/.*?[。．.!！?？]/); return m?m[0]:s;
    }
  }
  return "";
}

function buildDoc(heading,pairs,labels,caution){
  const b=[];
  if (heading) b.push(heading,"");
  for (const [t,e] of pairs){ b.push(t, e, ""); }
  for (const L of labels) b.push(L);
  if (labels.length) b.push("");
  if (caution) b.push(caution);
  return (b.join("\n").trim()+"\n");
}

// 依存なし並列実行
async function mapLimit(items, limit, worker){
  const res = new Array(items.length);
  let i=0, active=0, done=0;
  return await new Promise(resolve=>{
    function kick(){
      while(active<limit && i<items.length){
        const idx=i++; active++;
        Promise.resolve(worker(items[idx], idx)).then(r=>{
          res[idx]=r; active--; done++; if (done===items.length) resolve(res); else kick();
        }).catch(e=>{
          console.warn(`[warn] job ${idx+1}: ${e.message}`); res[idx]=null; active--; done++; if (done===items.length) resolve(res); else kick();
        });
      }
    }
    kick();
  });
}

async function main(){
  const arr = JSON.parse(fs.readFileSync(JSON_PATH,"utf8"));
  let ok=0, weak=0;
  await mapLimit(arr, CONCURRENCY, async rec=>{
    const n  = rec.number;
    const id = String(n).padStart(3,"0");
    const url = rec.url;
    const dir = path.join(DATA_DIR, id);
    ensureDir(dir);
    try{
      const html = await getHtml(url);
      const $ = cheerio.load(html, { decodeEntities:false });
      const lines = toLines($).filter(s=>!isNoise(s));
      const heading = extractHeading(lines);
      const pairs   = extractPairs(lines);
      const labels  = extractLabels(lines);
      const caution = extractCaution(lines);
      const outTxt  = buildDoc(heading, pairs, labels, caution);
      const file = path.join(dir, `原文${id}.txt`);
      fs.writeFileSync(file, outTxt, "utf8");
      if (heading && pairs.length>=2) ok++; else weak++;
      process.stdout.write(`\r[+] ${id}  pairs:${pairs.length} labels:${labels.length}         `);
      await sleep(30);
    }catch(e){
      weak++;
      console.warn(`\n[warn] ${id}: ${e.message}`);
    }
  });
  console.log(`\n--- text re-scrape report ---\nOK:${ok}  weak:${weak}`);
}

main();
