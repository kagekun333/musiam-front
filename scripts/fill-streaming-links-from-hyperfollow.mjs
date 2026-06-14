import fs from "node:fs/promises";

const WORKS_SSD_PATH = new URL("../public/works/works-ssd.json", import.meta.url);
const MIN_RELEASE_DATE = process.env.MIN_RELEASE_DATE || "2026-03-28";

const STORE_KEY_MAP = {
  spotify: "spotify",
  applemusic: "appleMusic",
  amazonmusic: "amazonMusic",
  amazon: "amazonMusic",
};

function decodeHtml(value) {
  return String(value || "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeStoreUrl(rawHref) {
  const decoded = decodeHtml(rawHref).trim();
  if (!decoded) return "";

  const destinationIndex = decoded.indexOf("destination:");
  const value = destinationIndex >= 0 ? decoded.slice(destinationIndex + "destination:".length) : decoded;

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractStoreLinks(html) {
  const out = {};
  const anchorRegex = /<a\b[^>]*>/gi;

  for (const match of html.matchAll(anchorRegex)) {
    const tag = match[0];
    const storeMatch = tag.match(/\bdata-hyperfollow-store="([^"]+)"/i);
    const hrefMatch = tag.match(/\bhref="([^"]+)"/i);
    if (!storeMatch || !hrefMatch) continue;

    const rawStore = String(storeMatch[1] || "").toLowerCase();
    const key = STORE_KEY_MAP[rawStore];
    if (!key) continue;
    if (key in out) continue;

    const url = normalizeStoreUrl(hrefMatch[1]);
    if (!url || /app=itunes/i.test(url)) continue;
    out[key] = url;
  }

  return out;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; musiam-front link sync)",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return await res.text();
}

function shouldFill(item) {
  const releasedAt = String(item?.releasedAt || "");
  const links = item?.links || {};
  return (
    releasedAt >= MIN_RELEASE_DATE &&
    /distrokid\.com\/hyperfollow/i.test(String(item?.href || item?.ssd?.hyperfollow_url || "")) &&
    !links.spotify &&
    !links.appleMusic &&
    !links.amazonMusic
  );
}

async function main() {
  const raw = JSON.parse(await fs.readFile(WORKS_SSD_PATH, "utf8"));
  const items = Array.isArray(raw?.items) ? raw.items : [];

  const targets = items.filter(shouldFill);
  let updated = 0;
  const failures = [];

  for (const item of targets) {
    const url = String(item?.href || item?.ssd?.hyperfollow_url || "").trim();
    try {
      const html = await fetchHtml(url);
      const links = extractStoreLinks(html);
      if (!Object.keys(links).length) {
        failures.push({ title: item.title, url, reason: "no-store-links-found" });
        continue;
      }

      item.links = {
        ...(item.links || {}),
        ...links,
      };
      updated += 1;
    } catch (error) {
      failures.push({
        title: item.title,
        url,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  raw.streamingLinksFilledAt = new Date().toISOString();
  raw.stats = {
    ...(raw.stats || {}),
    streamingLinksFilled: updated,
    streamingLinksFillFailures: failures.length,
  };

  await fs.writeFile(WORKS_SSD_PATH, `${JSON.stringify(raw, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        minReleaseDate: MIN_RELEASE_DATE,
        targets: targets.length,
        updated,
        failures,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
