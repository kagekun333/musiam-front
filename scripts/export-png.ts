// scripts/export-png.ts
import fs from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";

type OmikujiLine = { orig: string; ja: string; en: string };
type OmikujiEntry = {
  id: number;
  rank_ja: string;
  rank_en: string;
  header_ja: string;
  header_en: string;
  lines: OmikujiLine[];
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function main() {
  const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
  const abiPath = path.resolve("public/omikuji/abi.json");
  const raw = await fs.readFile(abiPath, "utf8");
  const data: OmikujiEntry[] = JSON.parse(raw);

  // 100件だけに限定（足りなければ存在分だけ）
  const entries = data.slice(0, 100);

  const outDir = path.resolve("exports");
  await ensureDir(outDir);

  const browser = await puppeteer.launch({
    headless: true, // ← "new" は型NG。booleanでOK
    channel: "chrome", 
    args: ["--no-sandbox", "--font-render-hinting=medium"],
    defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();

  // 共通のCSS上書え（固定サイズ＆溢れ防止）
  const injectCss = `
    [data-omikuji-card]{
      width: 1200px !important;
      height: 630px !important;
      min-height: 630px !important;
      overflow: hidden !important;
    }
    .asanoha-edge, .paper-noise { will-change: auto; }
  `;

  let count = 0;
  for (const e of entries) {
    for (const lang of ["ja", "en"] as const) {
      const url = `${baseUrl}/oracle/omikuji?lang=${lang}&id=${e.id}`;
      await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });

      // CSSを注入して固定サイズ化
      await page.addStyleTag({ content: injectCss });

      // カードの出現を待つ
      await page.waitForSelector("[data-omikuji-card]", { timeout: 20_000 });

      // フォント読み込み完了を待つ（ページコンテキスト内で fonts.ready を待機）
      await page.evaluate(async () => {
        // @ts-ignore
        if (document.fonts && document.fonts.ready) {
          // @ts-ignore
          await document.fonts.ready;
        }
        return true;
      });

      // 微ディレイで描画安定
      await sleep(150);

      const card = await page.$("[data-omikuji-card]");
      if (!card) throw new Error("Omikuji card not found on page: " + url);

      const id3 = String(e.id).padStart(3, "0");
      const file = path.join(outDir, `omikuji_${id3}_${lang}.png`);

      await card.screenshot({
        path: file as `${string}.png`, // ← 型注釈でエラー回避
        type: "png",
        omitBackground: false,
      });

      count++;
      console.log("✓ Saved:", file);
    }
  }

  await browser.close();
  console.log(`\nDone. Saved ${count} PNG files to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
