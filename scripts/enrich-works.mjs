#!/usr/bin/env node
/* ============================================================
   scripts/enrich-works.mjs — 新作取り込み（非破壊エンリッチ）  F0
   ------------------------------------------------------------
   目的: 増え続ける作品を「数分で」展示・放送・地図へ反映する半自動パイプライン。
   works-ssd.json の該当アイテムに以下を非破壊で補完する:
     - links.spotify / links.appleMusic / links.amazonMusic   (HyperFollow ページから)
     - releasedAt と正規 Apple リンク                          (iTunes Lookup API から)
     - 解決できたら tags から "ssd-only" を除去（= 地図/放送に出現する）

   データソース（ログイン不要・web_fetch 相当のみ）:
     1) HyperFollow:  https://distrokid.com/hyperfollow/abi35/<slug>
        → data-hyperfollow-store="spotify|applemusic|amazonmusic" の href を抽出。
     2) iTunes Lookup: https://itunes.apple.com/lookup?id=<appleAlbumId>  または  ?upc=<UPC>
        → releaseDate（権威ある配信日）と collectionViewUrl（正規 Apple リンク）。

   対象の指定（いずれか。無指定なら --all-incomplete と同義）:
     --id=ssd-xxxx            works-ssd の id で1件
     --uuid=<albumUUID>       ssd.albumuuid（大文字小文字無視）で1件
     --slug=<hyperfollow>     href の hyperfollow スラッグで1件
     --upc=<UPC>              直接 iTunes Lookup（idと併用可。対象1件に紐付けたい時は --id 等と併用）
     --all-incomplete         ssd-only もしくは spotify/apple 欠落の全件（既定）

   フラグ:
     --force   既存値があっても上書き
     --dry     書き込まずプレビューのみ
     --quiet   進捗ログを抑制

   例:
     node scripts/enrich-works.mjs --slug=happy-chomp
     node scripts/enrich-works.mjs --uuid=2CAFE80F-5D28-4D00-B4BB1CD750BB251E
     node scripts/enrich-works.mjs                 # 欠落している全件を試行
     node scripts/enrich-works.mjs --all-incomplete --dry

   AGENTS.md 厳守: works.json マスタは触らない。works-ssd.json への ID-preserving partial merge のみ。
   ============================================================ */

import fs from "node:fs/promises";

const WORKS_SSD_PATH = new URL("../public/works/works-ssd.json", import.meta.url);

const ARGS = parseArgs(process.argv.slice(2));
const FORCE = !!ARGS.force;
const DRY = !!ARGS.dry;
const QUIET = !!ARGS.quiet;

const STORE_KEY_MAP = {
  spotify: "spotify",
  applemusic: "appleMusic",
  amazonmusic: "amazonMusic",
  amazon: "amazonMusic",
};

function log(...a) {
  if (!QUIET) console.log(...a);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (const a of argv) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) out[m[1]] = m[2] === undefined ? true : m[2];
    else out._.push(a);
  }
  return out;
}

/* ---------- HTML / リンク抽出（fill-streaming-links と同系統） ---------- */
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
  const i = decoded.indexOf("destination:");
  const value = i >= 0 ? decoded.slice(i + "destination:".length) : decoded;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function extractStoreLinks(html) {
  const out = {};
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = match[0];
    const storeMatch = tag.match(/\bdata-hyperfollow-store="([^"]+)"/i);
    const hrefMatch = tag.match(/\bhref="([^"]+)"/i);
    if (!storeMatch || !hrefMatch) continue;
    const key = STORE_KEY_MAP[String(storeMatch[1] || "").toLowerCase()];
    if (!key || key in out) continue;
    const url = normalizeStoreUrl(hrefMatch[1]);
    if (!url || /app=itunes/i.test(url)) continue;
    out[key] = url;
  }
  return out;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; musiam-front enrich-works)",
      accept: "text/html,application/xhtml+xml,application/json",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

/* ---------- iTunes Lookup（日付 + 正規 Apple リンク） ---------- */
function appleAlbumIdFromUrl(appleUrl) {
  if (!appleUrl) return null;
  // .../album/<slug>/<id>?... の <id>。?i= はトラックなので album id を優先。
  const m = String(appleUrl).match(/\/album\/[^/]+\/(\d+)/);
  return m ? m[1] : null;
}

async function itunesLookup({ id, upc }) {
  const qs = id ? `id=${encodeURIComponent(id)}&entity=album` : `upc=${encodeURIComponent(upc)}`;
  const url = `https://itunes.apple.com/lookup?${qs}`;
  let json;
  try {
    json = JSON.parse(await fetchText(url));
  } catch (e) {
    return { ok: false, reason: `itunes-fetch: ${e.message}` };
  }
  const r = (json.results || []).find((x) => x.wrapperType === "collection") || (json.results || [])[0];
  if (!r) return { ok: false, reason: "itunes-no-result" };
  const releasedAt = r.releaseDate ? String(r.releaseDate).slice(0, 10) : null;
  const appleUrl = r.collectionViewUrl ? String(r.collectionViewUrl).split("?")[0] : null;
  return { ok: true, releasedAt, appleUrl, artistId: r.artistId, collectionName: r.collectionName };
}

/* ---------- ターゲット解決 ---------- */
function hyperfollowSlug(item) {
  const href = String(item?.href || item?.links?.hyperfollow || item?.ssd?.hyperfollow_url || "");
  const m = href.match(/hyperfollow\/[^/]+\/([^/?#]+)/i);
  return m ? m[1] : null;
}

function isIncomplete(item) {
  const tags = item.tags || [];
  const l = item.links || {};
  return tags.includes("ssd-only") || !l.spotify || !l.appleMusic;
}

function selectTargets(items) {
  if (ARGS.id) return items.filter((i) => String(i.id) === String(ARGS.id));
  if (ARGS.uuid) {
    const want = String(ARGS.uuid).toUpperCase().replace(/-/g, "");
    return items.filter((i) => String(i?.ssd?.albumuuid || "").toUpperCase().replace(/-/g, "") === want);
  }
  if (ARGS.slug) return items.filter((i) => hyperfollowSlug(i) === String(ARGS.slug));
  if (ARGS.upc && !ARGS["all-incomplete"]) {
    // upc 単独 → どの item か分からないので、未解決 hyperfollow 群から1件…ではなく全件に対し upc は使わない。
    // upc は基本 --id/--slug と併用。単独指定は incomplete 全件にフォールバック。
    return items.filter(isIncomplete);
  }
  return items.filter(isIncomplete); // 既定: --all-incomplete
}

/* ---------- 1件のエンリッチ ---------- */
async function enrichItem(item) {
  const before = JSON.stringify(item.links || {}) + "|" + (item.releasedAt || "");
  const result = { id: item.id, title: item.title, changes: [], failures: [] };
  item.links = item.links || {};

  // 1) HyperFollow → store links
  const slug = hyperfollowSlug(item);
  const hfUrl = slug ? `https://distrokid.com/hyperfollow/abi35/${slug}` : null;
  const needStore = FORCE || !item.links.spotify || !item.links.appleMusic;
  if (hfUrl && needStore) {
    try {
      const links = extractStoreLinks(await fetchText(hfUrl));
      for (const [k, v] of Object.entries(links)) {
        if (FORCE || !item.links[k]) {
          if (item.links[k] !== v) result.changes.push(`links.${k}`);
          item.links[k] = v;
        }
      }
    } catch (e) {
      result.failures.push(`hyperfollow: ${e.message}`);
    }
  }

  // 2) iTunes Lookup → releasedAt + 正規 Apple リンク
  const appleId = appleAlbumIdFromUrl(item.links.appleMusic);
  const upc = ARGS.upc && (ARGS.id || ARGS.slug || ARGS.uuid) ? ARGS.upc : null;
  if (appleId || upc) {
    const lk = await itunesLookup({ id: appleId, upc });
    if (lk.ok) {
      if (lk.releasedAt && (FORCE || !item.releasedAt)) {
        if (item.releasedAt !== lk.releasedAt) result.changes.push(`releasedAt→${lk.releasedAt}`);
        item.releasedAt = lk.releasedAt;
      }
      if (lk.appleUrl && (FORCE || !item.links.appleMusic)) {
        if (item.links.appleMusic !== lk.appleUrl) result.changes.push("links.appleMusic(canonical)");
        item.links.appleMusic = lk.appleUrl;
      }
    } else {
      result.failures.push(lk.reason);
    }
  }

  // 3) 解決済みなら ssd-only を外す（地図/放送へ昇格）
  if (item.links.spotify && item.links.appleMusic && Array.isArray(item.tags) && item.tags.includes("ssd-only")) {
    item.tags = item.tags.filter((t) => t !== "ssd-only");
    result.changes.push("-ssd-only");
  }

  // primary/sales が hyperfollow のままで spotify があれば据え置き（既存契約を壊さない）。
  const after = JSON.stringify(item.links || {}) + "|" + (item.releasedAt || "");
  result.touched = before !== after;
  return result;
}

/* ---------- main ---------- */
async function main() {
  const raw = JSON.parse(await fs.readFile(WORKS_SSD_PATH, "utf8"));
  const items = Array.isArray(raw.items) ? raw.items : [];
  const targets = selectTargets(items);

  log(`enrich-works: targets=${targets.length}${DRY ? " (dry-run)" : ""}${FORCE ? " (force)" : ""}`);
  if (!targets.length) {
    log("該当アイテムなし。--id / --uuid / --slug を確認、または既に補完済みです。");
    return;
  }

  const results = [];
  let touched = 0;
  for (const item of targets) {
    const r = await enrichItem(item);
    results.push(r);
    if (r.touched) touched++;
    if (r.touched || r.failures.length) {
      log(`  ${r.touched ? "✓" : "·"} ${r.title}  ${r.changes.join(", ") || "(no change)"}${r.failures.length ? "  ⚠ " + r.failures.join("; ") : ""}`);
    }
  }

  if (!DRY && touched) {
    raw.enrichedAt = new Date().toISOString();
    raw.stats = { ...(raw.stats || {}), lastEnrichTouched: touched };
    await fs.writeFile(WORKS_SSD_PATH, `${JSON.stringify(raw, null, 2)}\n`);
    log(`\n書き込み完了: ${touched}件更新 → public/works/works-ssd.json`);
  } else if (DRY) {
    log(`\n[dry-run] ${touched}件が更新対象（書き込みなし）。`);
  } else {
    log(`\n更新対象なし（既に補完済み、または取得失敗）。`);
  }

  const failed = results.filter((r) => r.failures.length);
  if (failed.length) {
    log(`\n⚠ 取得失敗 ${failed.length}件:`);
    for (const r of failed) log(`  - ${r.title}: ${r.failures.join("; ")}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
