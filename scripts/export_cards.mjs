// scripts/export_cards.mjs
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const BASE = process.env.EXPORT_BASE || "http://localhost:3000/oracle/ja";
const OUTDIR = path.resolve(process.env.EXPORT_OUT || "exports/omikuji_cards/ja");

async function ensureDir(p) { await fs.promises.mkdir(p, { recursive: true }); }

async function run() {
  await ensureDir(OUTDIR);

  // 手元のChromeを使う（Edge派は "msedge"）
  const browser = await puppeteer.launch({ headless: true, channel: "chrome" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1800, deviceScaleFactor: 1 });

  await page.goto(BASE, { waitUntil: "networkidle2", timeout: 60_000 });

  // ジャンプ入力を確実に待つ
  await page.waitForSelector("#jump", { timeout: 15_000 });

  for (let id = 1; id <= 100; id++) {
    // 入力をクリアして数値をタイプ → Enter
    await page.click("#jump", { clickCount: 3 });
    await page.keyboard.press("Backspace");
    await page.type("#jump", String(id), { delay: 20 });
    await page.keyboard.press("Enter");

    // “そのIDのカードが描画された”ことを確認
    await page.waitForSelector("[data-omikuji-card]", { timeout: 15_000 });
    await page.waitForFunction(
      (n) => {
        const b = document.querySelector("[data-omikuji-card] b");
        return b && b.textContent?.trim() === String(n);
      },
      { timeout: 15_000 },
      id
    );

    // 要素だけスクショ
    const el = await page.$("[data-omikuji-card]");
    const file = path.join(OUTDIR, String(id).padStart(3, "0") + ".png");
    await el.screenshot({ path: file });
    process.stdout.write(`\rSaved: ${path.relative(process.cwd(), file)}   `);
  }

  await browser.close();
  console.log("\nDone.");
}

run().catch(async (e) => {
  console.error("\n[export_cards] error:", e);
  try {
    // 失敗時の全画面キャプチャ（デバッグ用）
    const dump = path.resolve(OUTDIR, "__error.png");
    if (globalThis.page) await globalThis.page.screenshot({ path: dump, fullPage: true });
  } catch {}
  process.exit(1);
});
