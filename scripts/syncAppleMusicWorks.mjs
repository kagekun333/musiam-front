/* global process, fetch, AbortSignal, Buffer */
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { classifyAppleArtistResults, APPLE_ARTIST_LOOKUP_LIMIT } from "./apple-catalog-diff.mjs";
import { APPLE_ARTIST_ID, projectAppleCollectionForStaticCatalog, safeArtworkUrl } from "../src/lib/apple-public-catalog.mjs";

const ARTIST_ID = APPLE_ARTIST_ID;
const ROOT = process.cwd();
const WORKS_PATH = path.join(ROOT, "public/works/works.json");
const SOURCE_PATHS = [WORKS_PATH, path.join(ROOT, "public/works/catalog-imports.json"), path.join(ROOT, "public/works/works-ssd.json")];
const COVERS_DIR = path.join(ROOT, "public/works/covers");
const API_URL = `https://itunes.apple.com/lookup?id=${ARTIST_ID}&entity=album&limit=${APPLE_ARTIST_LOOKUP_LIMIT}&country=US`;

async function sourceItems(file) {
  const document = JSON.parse(await fs.readFile(file, "utf8"));
  return Array.isArray(document) ? document : Array.isArray(document.items) ? document.items : [];
}
async function downloadCover(collectionId, sourceUrl) {
  const target = path.join(COVERS_DIR, `apple_${collectionId}.jpg`);
  try { await fs.access(target); return `/works/covers/apple_${collectionId}.jpg`; } catch { /* missing: download only in --apply mode */ }
  const url = safeArtworkUrl(sourceUrl);
  if (!url) throw new Error("APPLE_ARTWORK_URL_UNSAFE");
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`APPLE_ARTWORK_HTTP_${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > 15 * 1024 * 1024) throw new Error("APPLE_ARTWORK_SIZE_INVALID");
  await fs.mkdir(COVERS_DIR, { recursive: true });
  await fs.writeFile(target, bytes, { flag: "wx" });
  return `/works/covers/apple_${collectionId}.jpg`;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has("--apply") && args.has("--dry-run")) throw new Error("choose either --dry-run or --apply");
  const confirmationArg = process.argv.slice(2).find((arg) => arg.startsWith("--confirm-new="))?.slice("--confirm-new=".length) ?? "";
  const confirmedIds = confirmationArg.split(",").filter(Boolean).sort();
  const apply = args.has("--apply");
  const [response, ...documents] = await Promise.all([
    fetch(API_URL, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12000) }),
    ...SOURCE_PATHS.map(sourceItems),
  ]);
  if (!response.ok) throw new Error(`APPLE_ARTIST_LOOKUP_HTTP_${response.status}`);
  const payload = await response.json();
  const sourceResults = Array.isArray(payload.results) ? payload.results : [];
  const currentStableIds = new Set(documents.flat().map((item) => String(item?.id ?? "")).filter(Boolean));
  const plan = classifyAppleArtistResults(sourceResults, currentStableIds, ARTIST_ID, APPLE_ARTIST_LOOKUP_LIMIT);
  const readyItems = [];
  const unresolved = [...plan.unresolved];
  for (const candidate of plan.newItems) {
    const item = candidate.source;
    const work = projectAppleCollectionForStaticCatalog(item, ARTIST_ID);
    if (!work) {
      unresolved.push({ workId: candidate.workId, reason: "REQUIRED_PUBLIC_METADATA_MISSING" });
      continue;
    }
    readyItems.push({ candidate, work, item });
  }
  const observedDates = sourceResults
    .filter((item) => item?.wrapperType === "collection" && item.artistId === Number(ARTIST_ID))
    .map((item) => typeof item.releaseDate === "string" ? item.releaseDate.slice(0, 10) : "")
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort();
  const staticMusicDates = documents.flat()
    .filter((item) => String(item?.type ?? "") === "music")
    .map((item) => String(item?.distribution?.releaseDate ?? item?.releasedAt ?? "").slice(0, 10))
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort();
  const output = {
    mode: apply ? "APPLY" : "DRY_RUN",
    appleResultsCount: plan.appleResultsCount,
    currentStableIdCount: plan.currentStableIds.length,
    currentStaticMusicCutoff: staticMusicDates.at(-1) ?? null,
    oldestObservedReleaseDate: observedDates[0] ?? null,
    newestObservedReleaseDate: observedDates.at(-1) ?? null,
    new: readyItems.map(({ candidate }) => candidate.workId),
    existing: plan.existingIds,
    unresolved,
    sourceTruncated: plan.sourceTruncated,
    capWarning: plan.capWarning,
    appleArtistLookupCompleteness: plan.completeness,
    proposedAffectedIds: readyItems.map(({ candidate }) => candidate.workId).sort(),
  };
  if (apply && JSON.stringify(confirmedIds) !== JSON.stringify(output.proposedAffectedIds)) {
    throw new Error(`--apply requires --confirm-new=${output.proposedAffectedIds.join(",") || "NONE"} exactly`);
  }
  if (!apply || !readyItems.length) {
    process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
    return;
  }

  const primary = JSON.parse(await fs.readFile(WORKS_PATH, "utf8"));
  const newWorks = [];
  for (const { candidate, work, item } of readyItems) {
    const cover = await downloadCover(item.collectionId, item.artworkUrl100);
    newWorks.push({ ...work, id: candidate.workId, cover });
  }
  const existingIds = new Set(primary.items.map((item) => String(item?.id ?? "")));
  const uniqueNew = newWorks.filter((work) => !existingIds.has(work.id));
  primary.items = [...uniqueNew, ...primary.items];
  const temp = `${WORKS_PATH}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(primary, null, 2)}\n`, { flag: "w" });
  await fs.rename(temp, WORKS_PATH);
  process.stdout.write(`${JSON.stringify({ ...output, appliedIds: uniqueNew.map((work) => work.id), catalogTotal: primary.items.length }, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Apple sync failed"}\n`);
  process.exitCode = 1;
});
