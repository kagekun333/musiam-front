import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { appleLookupUrl, resolveAppleUpcResult } from "./apple-upc-resolver.mjs";
import { projectResolvedDistroKidRelease } from "../src/lib/distrokid-catalog-projection.ts";
import { parseCanonicalReleaseDocument } from "../src/lib/distrokid-release-ingestion.ts";
import { releaseTiming } from "../src/lib/release-status.ts";

const ROOT = process.cwd();
const DEFAULT_INPUT = path.join(ROOT, "public/works/distrokid-release-metadata.json");
const RESOLUTION_PATH = path.join(ROOT, "public/works/distrokid-release-resolutions.json");
const CATALOG_PATHS = [
  path.join(ROOT, "public/works/works.json"),
  path.join(ROOT, "public/works/catalog-imports.json"),
  path.join(ROOT, "public/works/works-ssd.json"),
];
const MAX_LOOKUPS = 20;

function argument(name) {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}
function ymdTokyo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function safeFailureCategory(error) {
  const code = String(error?.cause?.code ?? "");
  const allowed = new Set(["ENOTFOUND", "EAI_AGAIN", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "UND_ERR_SOCKET"]);
  return allowed.has(code) ? code : error?.name === "AbortError" || error?.name === "TimeoutError" ? "ETIMEDOUT" : "NETWORK_CAUSE_UNKNOWN";
}
async function readItems(file) {
  const value = JSON.parse(await fs.readFile(file, "utf8"));
  return Array.isArray(value) ? value : value?.items ?? [];
}
async function pause(ms) { await new Promise((resolve) => setTimeout(resolve, ms)); }
async function main() {
  const inputPath = path.resolve(argument("input") ?? DEFAULT_INPUT);
  const asOf = argument("asOf") ?? ymdTokyo();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) throw new Error("--asOf must be YYYY-MM-DD");
  const apply = process.argv.includes("--apply");
  const releases = parseCanonicalReleaseDocument(JSON.parse(await fs.readFile(inputPath, "utf8")));
  const resolutionDocument = JSON.parse(await fs.readFile(RESOLUTION_PATH, "utf8"));
  if (resolutionDocument.schemaVersion !== 1 || !Array.isArray(resolutionDocument.releases)) throw new Error("stored Apple resolution state schema is invalid");
  const catalogDocs = await Promise.all(CATALOG_PATHS.map(readItems));
  const currentIds = new Set(catalogDocs.flat().map((item) => String(item?.id ?? "")).filter(Boolean));
  for (const record of resolutionDocument.releases) currentIds.add(`apple-album-${record.apple?.collectionId ?? ""}`);
  const outcomes = [];
  const plannedResolutions = [];
  let lookupCalls = 0;
  for (const release of releases) {
    const timing = releaseTiming(release.releaseDate, new Date(`${asOf}T12:00:00+09:00`));
    const publicDateFallback = release.releaseDate == null;
    if (!release.title) {
      outcomes.push({ sourceReleaseId: release.sourceReleaseId, status: "UNRESOLVED", reason: "REQUIRED_RELEASE_METADATA_MISSING", stableWorkId: null });
      continue;
    }
    if (timing === "UPCOMING") {
      outcomes.push({ sourceReleaseId: release.sourceReleaseId, status: "UPCOMING", lookup: "SKIPPED_UNTIL_RELEASE_DATE", stableWorkId: null });
      continue;
    }
    if (!release.upc || !release.artist) {
      outcomes.push({ sourceReleaseId: release.sourceReleaseId, status: publicDateFallback ? "PUBLIC_RELEASE_DATE_PENDING" : "UNRESOLVED", reason: "UPC_OR_ARTIST_MISSING", stableWorkId: null });
      continue;
    }
    if (lookupCalls >= MAX_LOOKUPS) {
      outcomes.push({ sourceReleaseId: release.sourceReleaseId, status: publicDateFallback ? "PUBLIC_RELEASE_DATE_PENDING" : "RELEASED_UNRESOLVED", lookup: "BATCH_LIMIT_DEFERRED", stableWorkId: null });
      continue;
    }
    if (lookupCalls) await pause(250);
    lookupCalls++;
    let response;
    try { response = await fetch(appleLookupUrl(release.upc), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) }); }
    catch (error) {
      outcomes.push({ sourceReleaseId: release.sourceReleaseId, status: publicDateFallback ? "PUBLIC_RELEASE_DATE_PENDING" : "RELEASED_UNRESOLVED", lookup: "LOOKUP_UNAVAILABLE", causeCategory: safeFailureCategory(error), stableWorkId: null });
      continue;
    }
    if (!response.ok) {
      outcomes.push({ sourceReleaseId: release.sourceReleaseId, status: publicDateFallback ? "PUBLIC_RELEASE_DATE_PENDING" : "RELEASED_UNRESOLVED", lookup: "HTTP_ERROR", httpStatus: response.status, stableWorkId: null });
      continue;
    }
    let payload;
    try { payload = await response.json(); }
    catch {
      outcomes.push({ sourceReleaseId: release.sourceReleaseId, status: publicDateFallback ? "PUBLIC_RELEASE_DATE_PENDING" : "RELEASED_UNRESOLVED", lookup: "INVALID_JSON", stableWorkId: null });
      continue;
    }
    const lookup = resolveAppleUpcResult({ expectedArtist: release.artist, expectedIsrc: release.isrc, expectedReleaseDate: release.releaseDate }, Array.isArray(payload.results) ? payload.results : []);
    if (lookup.status !== "RESOLVED" || !lookup.collection) {
      const state = ["NO_RESULT", "AMBIGUOUS"].includes(lookup.status) ? "RELEASED_UNRESOLVED" : "UNRESOLVED";
      outcomes.push({ sourceReleaseId: release.sourceReleaseId, status: publicDateFallback ? "PUBLIC_RELEASE_DATE_PENDING" : state, lookup: lookup.status, stableWorkId: null });
      continue;
    }
    if (publicDateFallback && !lookup.collection.releaseDate) {
      outcomes.push({ sourceReleaseId: release.sourceReleaseId, status: "PUBLIC_RELEASE_DATE_PENDING", lookup: "APPLE_RELEASE_DATE_UNAVAILABLE", stableWorkId: null });
      continue;
    }
    const candidate = { release, apple: lookup.collection };
    const projected = projectResolvedDistroKidRelease(candidate, new Date(`${asOf}T12:00:00+09:00`));
    if (!projected) {
      outcomes.push({ sourceReleaseId: release.sourceReleaseId, status: publicDateFallback ? "PUBLIC_RELEASE_DATE_PENDING" : "UNRESOLVED", lookup: "CATALOG_PROJECTION_REJECTED", stableWorkId: null });
      continue;
    }
    const stableWorkId = String(projected.id);
    if (currentIds.has(stableWorkId)) {
      outcomes.push({ sourceReleaseId: release.sourceReleaseId, status: "CATALOG_ACTIVE", stableWorkId, apple: lookup.collection });
      continue;
    }
    currentIds.add(stableWorkId);
    plannedResolutions.push(candidate);
    outcomes.push({ sourceReleaseId: release.sourceReleaseId, status: "RELEASED_RESOLVED", stableWorkId, apple: lookup.collection });
  }
  const counts = Object.fromEntries(["UPCOMING", "PUBLIC_RELEASE_DATE_PENDING", "RELEASED_UNRESOLVED", "RELEASED_RESOLVED", "CATALOG_ACTIVE", "UNRESOLVED"].map((status) => [status, outcomes.filter((item) => item.status === status).length]));
  const newIds = outcomes.filter((item) => item.status === "RELEASED_RESOLVED").map((item) => item.stableWorkId).sort();
  const confirmation = (argument("confirm-new") ?? "").split(",").filter(Boolean).sort();
  if (apply) {
    if (JSON.stringify(confirmation) !== JSON.stringify(newIds)) throw new Error(`--apply requires --confirm-new=${newIds.join(",") || "NONE"} exactly`);
    const prior = new Map(resolutionDocument.releases.map((record) => [`apple-album-${record.apple?.collectionId}`, record]));
    for (const candidate of plannedResolutions) prior.set(`apple-album-${candidate.apple.collectionId}`, candidate);
    const temp = `${RESOLUTION_PATH}.tmp`;
    await fs.writeFile(temp, `${JSON.stringify({ schemaVersion: 1, releases: [...prior.values()] }, null, 2)}\n`, { flag: "w" });
    await fs.rename(temp, RESOLUTION_PATH);
  }
  process.stdout.write(`${JSON.stringify({ mode: apply ? "APPLIED_RESOLUTION_STATE" : "DRY_RUN", asOf, lookupCalls, maxLookups: MAX_LOOKUPS, counts, proposedNewStableIds: newIds, outcomes }, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Release resolution failed"}\n`);
  process.exitCode = 1;
});
