// scripts/export_cards_jpg.mjs
// /oracle/{lang}?render=front|back にアクセスし、id=1..100 を front.jpg/back.jpg で保存
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

// 例: http://localhost:3000/oracle/ja
const BASE   = process.env.EXPORT_BASE || "http://localhost:3000/oracle/ja";
const LANG   = BASE.endsWith("/en") ? "en" : "ja";
const OUTDIR = path.resolve(process.env.EXPORT_OUT || (LANG==="ja" ? "public/images/kannon100" : "public/images/kannon100_en"));
const FROM   = Number(process.env.FROM || 1);
const TO     = Number(process.env.TO   || 100);
const WIDTH  = Number(process.env.CARD_WIDTH || 768);
const DPR    = Number(process.env.DPR || 2);

async function ensureDir(p){ await fs.promises.mkdir(p,{recursive:true}); }

async function shotVariant(page, id, variant){
  await page.goto(`${BASE}?render=${variant}`, { waitUntil: "networkidle2", timeout: 60_000 });
  await page.waitForSelector("#jump", { timeout: 10_000 });
  await page.click("#jump", { clickCount: 3 });
  await page.keyboard.press("Backspace");
  await page.type("#jump", String(id), { delay: 10 });
  await page.keyboard.press("Enter");
  await page.waitForSelector("[data-omikuji-card]", { timeout: 15_000 });
  await page.waitForFunction((n)=>{
    const b=document.querySelector("[data-omikuji-card] b");
    return b && b.textContent?.trim()===String(n);
  }, { timeout: 15_000 }, id);

  // 幅を固定
  await page.$eval("[data-omikuji-card] > div", (el, w)=>{
    el.style.maxWidth = "unset";
    el.style.width = w + "px";
  }, WIDTH);

  const el = await page.$("[data-omikuji-card] > div");
  const dir = path.join(OUTDIR, String(id).padStart(3,"0"));
  await ensureDir(dir);
  const file = path.join(dir, variant + ".jpg");
  await el.screenshot({ path: file, type: "jpeg", quality: 95 });
  process.stdout.write(`\rSaved: ${path.relative(process.cwd(), file)}   `);
}

async function run(){
  await ensureDir(OUTDIR);
  const browser = await puppeteer.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage();
  await page.setViewport({ width: Math.ceil(WIDTH*1.3), height: Math.ceil(WIDTH*1.3*5/3), deviceScaleFactor: DPR });

  for(let id=FROM; id<=TO; id++){
    await shotVariant(page, id, "front");
    await shotVariant(page, id, "back");
  }
  await browser.close();
  console.log("\nDone.");
}

run().catch(e=>{ console.error(e); process.exit(1); });
