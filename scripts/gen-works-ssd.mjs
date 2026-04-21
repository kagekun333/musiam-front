#!/usr/bin/env node
// scripts/gen-works-ssd.mjs
//
// 目的: PortableSSD の /sessions/determined-loving-wozniak/mnt/伯爵MUSIC/releases/*/meta.json
//       を全走査し、public/works/works-ssd.json を新規生成する（既存 works.json は一切触らない）。
//
// 出力先: public/works/works-ssd.json
// 出力形式: { items: WorkItem[], generatedAt: ISO }
//
// 既存 works.json と突合:
//   - タイトル一致（lower-case, normalize whitespace）で既存 cover URL / links を流用
//   - SSDのみの新作は cover 未指定のまま出す（後で resize パスを別途実行）
//
// 使い方:
//   node scripts/gen-works-ssd.mjs                # マウントが既に効いてる前提
//   SSD_ROOT=/path/to/releases node scripts/...   # 別パス指定も可能
//
// NOTE: 既存 works.json を上書きしないこと。本スクリプトは works.json を read-only で読むのみ。

import fs from "node:fs/promises";
import path from "node:path";

const WORKSPACE = process.cwd(); // scripts/ は musiam-front 直下で走らせる前提
const SSD_ROOT =
  process.env.SSD_ROOT ||
  "/sessions/determined-loving-wozniak/mnt/伯爵MUSIC/releases";
const WORKS_JSON = path.join(WORKSPACE, "public/works/works.json");
const OUT_PATH = path.join(WORKSPACE, "public/works/works-ssd.json");

// ---------- helpers ----------

const norm = (s) =>
  (s ?? "")
    .toString()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[「」『』『』"'“”‘’]/g, "")
    .trim();

function coerceId(prefix, ...parts) {
  const raw = parts.filter(Boolean).join("-");
  return (prefix + "-" + raw)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function parseReleasedAt(s) {
  if (!s || s === "nan") return undefined;
  const d = new Date(s);
  if (isNaN(d.getTime())) return undefined;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function splitMood(mood) {
  if (!mood) return [];
  // "energetic, euphoric" or "発射 / ミッション開始 / アドレナリン"
  return String(mood)
    .split(/[,、\/／]/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function pickMoodTags({ trackMood, albumGenre, albumTitle }) {
  const tags = new Set();
  splitMood(trackMood).forEach((t) => tags.add(t));
  if (albumGenre) tags.add(`genre:${albumGenre}`);
  return Array.from(tags).slice(0, 8);
}

// ---------- main ----------

async function main() {
  // 1) load existing works.json (READ ONLY)
  let existingItems = [];
  try {
    const raw = await fs.readFile(WORKS_JSON, "utf-8");
    const j = JSON.parse(raw);
    existingItems = Array.isArray(j?.items)
      ? j.items
      : Array.isArray(j)
      ? j
      : [];
  } catch (e) {
    console.warn("works.json read failed:", e?.message);
  }

  const existingByTitle = new Map();
  for (const w of existingItems) {
    if ((w.type ?? "").toLowerCase() !== "music") continue;
    const key = norm(w.title);
    if (key && !existingByTitle.has(key)) existingByTitle.set(key, w);
  }
  console.log(
    `works.json music items: ${existingItems.filter((x) => (x.type ?? "").toLowerCase() === "music").length} (indexed: ${existingByTitle.size})`
  );

  // 2) walk SSD releases
  let dirents;
  try {
    dirents = await fs.readdir(SSD_ROOT, { withFileTypes: true });
  } catch (e) {
    console.error(`SSD_ROOT not accessible: ${SSD_ROOT}\n`, e?.message);
    process.exit(1);
  }

  const items = [];
  let matchedCount = 0;
  let ssdOnlyCount = 0;
  let skipCount = 0;

  for (const d of dirents) {
    if (!d.isDirectory()) continue;
    const dirName = d.name;
    const metaPath = path.join(SSD_ROOT, dirName, "meta.json");

    let meta;
    try {
      const raw = await fs.readFile(metaPath, "utf-8");
      meta = JSON.parse(raw);
    } catch {
      skipCount++;
      continue;
    }

    const albumTitle = String(meta.release_title ?? dirName ?? "").trim();
    const albumGenre = String(meta.genre ?? "").trim();
    const albumDate = parseReleasedAt(meta.release_date ?? meta.upload_date);
    const hyperfollow =
      typeof meta.hyperfollow_url === "string" && meta.hyperfollow_url.startsWith("http")
        ? meta.hyperfollow_url
        : "";
    const albumuuid = String(meta.albumuuid ?? "");
    const trackList = Array.isArray(meta.tracks) ? meta.tracks : [];

    // アルバム代表の "作品" を1件（既存 works.json の粒度に合わせる）
    // SSD は 1 release = 1 work として扱う（track 単位ではなく）
    const trackBlob = trackList
      .map((t) => `${t.track_title ?? ""} — ${t.notes ?? ""}`)
      .filter(Boolean)
      .join("\n");
    const topTrack = trackList[0] ?? {};
    const moodTags = pickMoodTags({
      trackMood: topTrack.mood,
      albumGenre,
      albumTitle,
    });

    const notes = (topTrack.notes ?? "")
      .replace(/\bMV映像イメージ:.*$/, "")
      .trim();

    const existing = existingByTitle.get(norm(albumTitle));

    let item;
    if (existing) {
      matchedCount++;
      item = {
        // 既存のIDをそのまま使う（works.json 側と辿り直せるように）
        id: existing.id,
        title: albumTitle,
        type: "music",
        cover: existing.cover ?? "",
        tags: Array.from(
          new Set([...(existing.tags ?? []), "ssd-enriched", ...(albumGenre ? [`genre:${albumGenre}`] : [])])
        ).slice(0, 10),
        moodTags: moodTags.length ? moodTags : existing.moodTags ?? [],
        releasedAt: albumDate ?? existing.releasedAt,
        href: existing.href ?? hyperfollow ?? "",
        links: {
          ...(existing.links ?? {}),
          ...(hyperfollow ? { hyperfollow } : {}),
        },
        salesHref: existing.salesHref ?? existing.primaryHref ?? existing.href ?? hyperfollow ?? "",
        primaryHref: existing.primaryHref ?? existing.href ?? hyperfollow ?? "",
        // SSD 由来の詩的メタ
        matchInfo: {
          summary: notes.slice(0, 200),
          reason: `SSD: ${trackList.length}-track release from ${albumDate ?? "n/a"}`,
        },
        ssd: {
          albumuuid,
          tracks: trackList.map((t) => ({
            n: t.track_number,
            title: t.track_title,
            mood: t.mood,
            notes: t.notes,
          })),
          hyperfollow_url: hyperfollow,
        },
      };
    } else {
      ssdOnlyCount++;
      // SSDのみに存在する作品 — cover は空のまま
      const id = coerceId("ssd", albumuuid || albumTitle);
      item = {
        id,
        title: albumTitle,
        type: "music",
        cover: "", // 後で resize コピー or Spotify マッチ
        tags: [
          "ssd-only",
          ...(albumGenre ? [`genre:${albumGenre}`] : []),
        ],
        moodTags,
        releasedAt: albumDate,
        href: hyperfollow || "",
        links: hyperfollow ? { hyperfollow } : {},
        salesHref: hyperfollow || "",
        primaryHref: hyperfollow || "",
        matchInfo: {
          summary: notes.slice(0, 200),
          reason: `SSD-only ${trackList.length}-track release`,
        },
        ssd: {
          albumuuid,
          tracks: trackList.map((t) => ({
            n: t.track_number,
            title: t.track_title,
            mood: t.mood,
            notes: t.notes,
          })),
          hyperfollow_url: hyperfollow,
          // SSDローカルcoverがあるか記録（将来 resize ジョブのヒント）
          localCover: `releases/${dirName}/cover.jpeg`,
        },
      };
    }

    items.push(item);
  }

  // 3) write output
  const out = {
    generatedAt: new Date().toISOString(),
    source: "SSD: /Volumes/PortableSSD/mv-factory-os-data/伯爵MUSIC",
    stats: {
      ssd_releases: dirents.filter((d) => d.isDirectory()).length,
      matched_to_works_json: matchedCount,
      ssd_only: ssdOnlyCount,
      skipped_no_meta: skipCount,
      total_items: items.length,
    },
    items,
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(out, null, 2), "utf-8");

  console.log("------");
  console.log("done:", OUT_PATH);
  console.log("stats:", out.stats);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
