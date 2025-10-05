import fs from "node:fs";
import * as cheerio from "cheerio";

const FINAL = "src/data/kannon_100_final.json";
const RAW   = "tempdata/kannon_100_raw.json";

const idsArg = (process.argv.find(a => a === "--ids") && process.argv[process.argv.indexOf("--ids") + 1]) || "";
const ids = idsArg ? idsArg.split(",").map(x => +x.trim()).filter(Boolean) : [];

async function fetchText(url) {
  try {
    const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchFromWayback(url) {
  const api = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(url)}&output=json&fl=timestamp,original,statuscode&filter=statuscode:200&collapse=digest&limit=1&from=2016`;
  const metaTxt = await fetchText(api);
  if (!metaTxt) return null;
  const meta = JSON.parse(metaTxt);
  if (!Array.isArray(meta) || meta.length < 2) return null;
  const ts = meta[1][0];
  const wb = `https://web.archive.org/web/${ts}/${url}`;
  return await fetchText(wb);
}

function extractLines(html) {
  if (!html) return [];
  const $ = cheerio.load(html);
  const root = $("article, main, #content, .entry, .post, body").first();
  const text = root.text().replace(/\u00A0/g, " ").trim();

  // 「◯◯：△△」形式を優先
  const lines = (text.match(/[^。\n\r：:]{1,20}[：:][^\n\r。]+/g) || [])
    .map(s => s.replace(/\s+/g, " ").trim())
    .filter(s => s.length >= 3);

  if (lines.length < 3) {
    const backup = text.split(/[。\n\r]+/).map(s => s.trim()).filter(Boolean);
    return [...lines, ...backup].slice(0, 12);
  }
  return lines.slice(0, 12);
}

function updateFinal(finalData, number, newLines) {
  const idx = finalData.findIndex(x => x.number === number);
  if (idx < 0) return false;
  finalData[idx].poem = newLines;
  return true;
}

(async () => {
  const finalData = JSON.parse(fs.readFileSync(FINAL, "utf8"));
  const rawData   = JSON.parse(fs.readFileSync(RAW, "utf8"));

  const targetIds = ids.length
    ? ids
    : (() => {
        try {
          const rep = JSON.parse(fs.readFileSync("tempdata/qa_report.json", "utf8"));
          return rep.lists.incompleteIds || [];
        } catch {
          return [];
        }
      })();

  if (!targetIds.length) { console.log("[omikuji_repair] ids empty"); process.exit(0); }

  const backup = `src/data/kannon_100_final.backup.${Date.now()}.json`;
  fs.copyFileSync(FINAL, backup);
  console.log(`[omikuji_repair] backup -> ${backup}`);

  for (const n of targetIds) {
    const raw = rawData.find(x => x.number === n);
    const url = raw?.sourceUrl;
    if (!url) { console.log(`[${n}] no sourceUrl`); continue; }

    let html = await fetchText(url);
    if (!html) html = await fetchFromWayback(url);

    const lines = extractLines(html || "");
    if (lines.length) {
      const ok = updateFinal(finalData, n, lines);
      console.log(`[${n}] ${ok ? "UPDATED" : "SKIPPED"} lines=${lines.length} url=${url}`);
      await new Promise(r => setTimeout(r, 500)); // polite
    } else {
      console.log(`[${n}] FAILED to extract lines url=${url}`);
    }
  }

  fs.writeFileSync(FINAL, JSON.stringify(finalData, null, 2), "utf8");
  console.log(`[omikuji_repair] wrote ${FINAL}`);
})();
