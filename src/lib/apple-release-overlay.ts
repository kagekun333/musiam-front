import type { CatalogWork } from "@/lib/mergeWorksCatalog";
import { APPLE_ARTIST_ID, projectAppleCollectionToCatalogWork, safeArtworkUrl, safeStoreUrl } from "@/lib/apple-public-catalog.mjs";
import { APPLE_ARTIST_LOOKUP_LIMIT, classifyAppleArtistResults } from "../../scripts/apple-catalog-diff.mjs";
import { appleReleaseOverlayKey, resolveRuntimeDataScope, type RuntimeDataScope } from "@/lib/runtime-data-scope";

export { APPLE_ARTIST_LOOKUP_LIMIT };

export const APPLE_RELEASE_OVERLAY_KEY = "musiam:release-overlay:v1";
export const APPLE_RELEASE_OVERLAY_MAX_WORKS = 5_000;
export const APPLE_RELEASE_OVERLAY_MAX_BYTES = 4 * 1024 * 1024;
export const APPLE_RELEASE_OVERLAY_STALE_AFTER_MS = 48 * 60 * 60 * 1_000;
export const APPLE_ARTIST_LOOKUP_URL = `https://itunes.apple.com/lookup?id=${APPLE_ARTIST_ID}&entity=album&limit=${APPLE_ARTIST_LOOKUP_LIMIT}&country=US&sort=recent`;

export type AppleReleaseOverlaySnapshot = {
  schemaVersion: 1;
  artistId: string;
  lastSuccessfulSyncAt: string;
  sourceResultCount: number;
  sourceCollectionCount?: number;
  sourceTruncated: boolean;
  bootstrapCutoffDate?: string | null;
  oldestObservedReleaseDate: string | null;
  newestObservedReleaseDate: string | null;
  works: Record<string, CatalogWork>;
};

export type AppleReleaseOverlayStore = {
  get(key: string): Promise<unknown>;
  set(key: string, snapshot: AppleReleaseOverlaySnapshot): Promise<void>;
};

export type OverlayReadStatus = "AVAILABLE" | "STALE" | "EMPTY" | "UNAVAILABLE" | "MALFORMED";

export type AppleReleaseSyncReport = {
  artistId: string;
  appleResultsCount: number;
  sourceCollectionCount: number;
  sourceTruncated: boolean;
  appleArtistLookupCompleteness: "NOT_PROVEN";
  historicalCatalogCompleteness: "NOT_PROVEN";
  oldestObservedReleaseDate: string | null;
  newestObservedReleaseDate: string | null;
  currentStaticMusicCutoff: string | null;
  bootstrapCutoffDate: string | null;
  recentReleaseWindowCoverage: "REACHED" | "NOT_REACHED" | "UNKNOWN";
  backfillWindowStatus: "BACKFILL_WINDOW_REACHED" | "BACKFILL_WINDOW_NOT_REACHED" | "BACKFILL_COMPLETENESS_NOT_PROVEN";
  existingStableIdCount: number;
  postCutoffNewCount: number;
  historicalPreCutoffUnresolvedCount: number;
  admittedOverlayWorkCount: number;
  existingCount: number;
  newCount: number;
  changedCount: number;
  unresolvedCount: number;
  overlayWorkCount: number;
  statuses: Array<{ id: string | null; status: "NEW" | "CHANGED" | "EXISTING" | "UNRESOLVED"; reason?: string }>;
};

export type AppleLookupFailureCategory =
  | "DNS_FAILURE"
  | "CONNECTION_FAILURE"
  | "TLS_FAILURE"
  | "TIMEOUT"
  | "HTTP_STATUS_FAILURE"
  | "RESPONSE_PARSE_FAILURE"
  | "INVALID_RESPONSE"
  | "EXECUTION_ENVIRONMENT_NETWORK_BLOCK";

export type AppleLookupFailureDiagnostic = {
  category: AppleLookupFailureCategory;
  host: string;
  phase: "REQUEST" | "HTTP_RESPONSE" | "RESPONSE_BODY";
  httpStatus: number | null;
};

const validYmd = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

function plainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

function encodedSize(value: unknown) {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function onlyKeys(value: Record<string, unknown>, allowed: string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function validOverlayWork(key: string, raw: unknown): raw is CatalogWork {
  if (!plainObject(raw) || !onlyKeys(raw, ["id", "title", "type", "cover", "tags", "releasedAt", "href", "primaryHref", "links", "distribution", "identifiers"])) return false;
  const work = raw as unknown as CatalogWork;
  const match = /^apple-album-(\d+)$/.exec(key);
  if (!match || work.id !== key || work.type !== "music" || typeof work.title !== "string" || !work.title.trim() ||
      typeof work.releasedAt !== "string" || !validYmd(work.releasedAt) || typeof work.cover !== "string" ||
      safeArtworkUrl(work.cover) !== work.cover || typeof work.href !== "string" || safeStoreUrl(work.href) !== work.href ||
      typeof work.primaryHref !== "string" || safeStoreUrl(work.primaryHref) !== work.primaryHref || !Array.isArray(work.tags)) return false;
  const tags = work.tags.map(String);
  if (!tags.includes("apple-music") || !(tags.includes("single") || tags.includes("album")) || tags.some((tag) => !["apple-music", "single", "album"].includes(tag))) return false;
  if (!plainObject(work.links) || !onlyKeys(work.links, ["appleMusic", "listen"]) || work.links.appleMusic !== work.href || work.links.listen !== work.href) return false;

  const distribution = work.distribution as unknown;
  if (!plainObject(distribution) || !onlyKeys(distribution, ["source", "artist", "releaseDate", "releaseDateAuthority", "primaryGenre", "appleGenre", "identifiers"]) ||
      distribution.source !== "apple-music" || typeof distribution.artist !== "string" || !distribution.artist.trim() ||
      distribution.releaseDate !== work.releasedAt || distribution.releaseDateAuthority !== "APPLE_PUBLIC_DISTRIBUTION") return false;
  if ((distribution.primaryGenre == null) !== (distribution.appleGenre == null) ||
      (distribution.primaryGenre != null && (typeof distribution.primaryGenre !== "string" || distribution.primaryGenre !== distribution.appleGenre))) return false;
  if (!plainObject(distribution.identifiers) || !onlyKeys(distribution.identifiers, ["appleCollectionId"]) || distribution.identifiers.appleCollectionId !== match[1]) return false;

  const identifiers = work.identifiers as unknown;
  if (!plainObject(identifiers) || !onlyKeys(identifiers, ["release"]) || !plainObject(identifiers.release) ||
      !onlyKeys(identifiers.release, ["appleCollectionId"]) || identifiers.release.appleCollectionId !== match[1]) return false;
  return true;
}

export function validateAppleReleaseOverlaySnapshot(raw: unknown): AppleReleaseOverlaySnapshot | null {
  let value: unknown = raw;
  try {
    if (typeof raw === "string") {
      if (new TextEncoder().encode(raw).length > APPLE_RELEASE_OVERLAY_MAX_BYTES) return null;
      value = JSON.parse(raw);
    }
    if (!plainObject(value) || encodedSize(value) > APPLE_RELEASE_OVERLAY_MAX_BYTES ||
        !onlyKeys(value, ["schemaVersion", "artistId", "lastSuccessfulSyncAt", "sourceResultCount", "sourceCollectionCount", "sourceTruncated", "bootstrapCutoffDate", "oldestObservedReleaseDate", "newestObservedReleaseDate", "works"])) return null;
  } catch { return null; }
  const snapshot = value as unknown as AppleReleaseOverlaySnapshot;
  if (snapshot.schemaVersion !== 1 || snapshot.artistId !== APPLE_ARTIST_ID || !isIsoTimestamp(snapshot.lastSuccessfulSyncAt) ||
      !Number.isInteger(snapshot.sourceResultCount) || snapshot.sourceResultCount < 0 || snapshot.sourceResultCount > APPLE_ARTIST_LOOKUP_LIMIT + 1 ||
      (snapshot.sourceCollectionCount !== undefined && (!Number.isInteger(snapshot.sourceCollectionCount) || snapshot.sourceCollectionCount < 0 || snapshot.sourceCollectionCount > APPLE_ARTIST_LOOKUP_LIMIT || snapshot.sourceCollectionCount > snapshot.sourceResultCount)) ||
      typeof snapshot.sourceTruncated !== "boolean" ||
      (snapshot.bootstrapCutoffDate !== undefined && !(snapshot.bootstrapCutoffDate === null || validYmd(snapshot.bootstrapCutoffDate))) ||
      !(snapshot.oldestObservedReleaseDate === null || validYmd(snapshot.oldestObservedReleaseDate)) ||
      !(snapshot.newestObservedReleaseDate === null || validYmd(snapshot.newestObservedReleaseDate)) ||
      !plainObject(snapshot.works) || Object.keys(snapshot.works).length > APPLE_RELEASE_OVERLAY_MAX_WORKS) return null;
  for (const [id, work] of Object.entries(snapshot.works)) if (!validOverlayWork(id, work)) return null;
  return snapshot;
}

export function classifyAppleBackfillWindow(oldestObservedReleaseDate: string | null, currentStaticMusicCutoff: string | null, _sourceTruncated: boolean): AppleReleaseSyncReport["backfillWindowStatus"] {
  if (!oldestObservedReleaseDate || !currentStaticMusicCutoff || !validYmd(oldestObservedReleaseDate) || !validYmd(currentStaticMusicCutoff)) return "BACKFILL_COMPLETENESS_NOT_PROVEN";
  if (oldestObservedReleaseDate > currentStaticMusicCutoff) return "BACKFILL_WINDOW_NOT_REACHED";
  return "BACKFILL_WINDOW_REACHED";
}

function staticMusicCutoff(works: CatalogWork[]) {
  const dates = works.filter((work) => String(work.type ?? "").toLowerCase() === "music")
    .map((work) => String(work.distribution?.releaseDate ?? work.releasedAt ?? "").slice(0, 10))
    .filter(validYmd)
    .sort();
  return dates.at(-1) ?? null;
}

function staticCatalogStableIds(works: CatalogWork[]) {
  const ids = new Set<string>();
  for (const work of works) {
    const id = String(work.id ?? "");
    if (id) ids.add(id);
    for (const alias of work.catalogAliases ?? []) if (String(alias).trim()) ids.add(String(alias));
    const appleCollectionId = work.identifiers?.release?.appleCollectionId ?? work.distribution?.identifiers?.appleCollectionId;
    if (appleCollectionId && /^\d+$/.test(String(appleCollectionId))) ids.add(`apple-album-${appleCollectionId}`);
  }
  return ids;
}

function dateRange(results: Array<Record<string, unknown>>) {
  const dates = results.filter((item) => item?.wrapperType === "collection" && item.artistId === Number(APPLE_ARTIST_ID))
    .map((item) => typeof item?.releaseDate === "string" ? item.releaseDate.slice(0, 10) : "")
    .filter(validYmd)
    .sort();
  return { oldest: dates[0] ?? null, newest: dates.at(-1) ?? null };
}

function sortedJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(sortedJson).join(",")}]`;
  if (plainObject(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${sortedJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function mergeAppleWork(previous: CatalogWork | undefined, current: CatalogWork): CatalogWork {
  if (!previous) return current;
  return {
    ...previous,
    ...current,
    links: { ...(previous.links as Record<string, string>), ...(current.links as Record<string, string>) },
    distribution: {
      ...previous.distribution,
      ...current.distribution,
      identifiers: { ...previous.distribution?.identifiers, ...current.distribution?.identifiers },
    },
    identifiers: {
      ...previous.identifiers,
      ...current.identifiers,
      release: { ...previous.identifiers?.release, ...current.identifiers?.release },
    },
  };
}

export class AppleReleaseSyncError extends Error {
  constructor(
    readonly code: "APPLE_LOOKUP_FAILED" | "APPLE_LOOKUP_MALFORMED" | "OVERLAY_STORE_READ_FAILED" | "OVERLAY_STORE_WRITE_FAILED" | "OVERLAY_SNAPSHOT_MALFORMED" | "OVERLAY_SNAPSHOT_LIMIT",
    readonly lookupDiagnostic?: AppleLookupFailureDiagnostic,
  ) {
    super(code);
    this.name = "AppleReleaseSyncError";
  }
}

function failureFacts(error: unknown) {
  const pending: unknown[] = [error];
  const seen = new Set<unknown>();
  const codes: string[] = [];
  const names: string[] = [];
  while (pending.length && seen.size < 8) {
    const current = pending.shift();
    if (!current || (typeof current !== "object" && typeof current !== "function") || seen.has(current)) continue;
    seen.add(current);
    try {
      const value = current as { code?: unknown; name?: unknown; cause?: unknown; errors?: unknown };
      if (typeof value.code === "string") codes.push(value.code.toUpperCase());
      if (typeof value.name === "string") names.push(value.name.toLowerCase());
      if (value.cause) pending.push(value.cause);
      if (Array.isArray(value.errors)) pending.push(...value.errors);
    } catch {
      // Error metadata is diagnostic input only; never expose an untrusted message.
    }
  }
  return { codes, names };
}

function classifyAppleRequestFailure(error: unknown): AppleLookupFailureCategory {
  const { codes, names } = failureFacts(error);
  if (names.some((name) => name === "timeouterror" || name === "aborterror") ||
      codes.some((code) => ["ETIMEDOUT", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "ABORT_ERR"].includes(code))) return "TIMEOUT";
  if (codes.some((code) => ["ENOTFOUND", "EAI_AGAIN", "EAI_FAIL", "EAI_NODATA"].includes(code))) return "DNS_FAILURE";
  if (codes.some((code) => code.startsWith("CERT_") || code.startsWith("ERR_TLS_") || code.startsWith("ERR_SSL_") ||
      ["DEPTH_ZERO_SELF_SIGNED_CERT", "SELF_SIGNED_CERT_IN_CHAIN", "UNABLE_TO_VERIFY_LEAF_SIGNATURE"].includes(code))) return "TLS_FAILURE";
  if (codes.some((code) => ["EACCES", "EPERM", "ENETUNREACH", "ERR_NETWORK_ACCESS_DENIED", "ERR_BLOCKED_BY_CLIENT"].includes(code))) {
    return "EXECUTION_ENVIRONMENT_NETWORK_BLOCK";
  }
  return "CONNECTION_FAILURE";
}

function appleLookupDiagnostic(category: AppleLookupFailureCategory, phase: AppleLookupFailureDiagnostic["phase"], httpStatus: number | null = null): AppleLookupFailureDiagnostic {
  return { category, host: new URL(APPLE_ARTIST_LOOKUP_URL).hostname, phase, httpStatus };
}

export async function runAppleReleaseSync(input: {
  baseWorks: CatalogWork[];
  store: AppleReleaseOverlayStore;
  fetcher?: typeof fetch;
  now?: Date;
  scope?: RuntimeDataScope;
}): Promise<AppleReleaseSyncReport> {
  const fetcher = input.fetcher ?? fetch;
  const overlayKey = appleReleaseOverlayKey(input.scope ?? resolveRuntimeDataScope(process.env.VERCEL_ENV));
  let payload: unknown;
  let response: Response;
  try {
    response = await fetcher(APPLE_ARTIST_LOOKUP_URL, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12_000) });
  } catch (error) {
    throw new AppleReleaseSyncError("APPLE_LOOKUP_FAILED", appleLookupDiagnostic(classifyAppleRequestFailure(error), "REQUEST"));
  }
  if (!response.ok) {
    const status = Number.isInteger(response.status) && response.status >= 100 && response.status <= 599 ? response.status : null;
    throw new AppleReleaseSyncError("APPLE_LOOKUP_FAILED", appleLookupDiagnostic("HTTP_STATUS_FAILURE", "HTTP_RESPONSE", status));
  }
  try { payload = await response.json(); }
  catch {
    throw new AppleReleaseSyncError("APPLE_LOOKUP_FAILED", appleLookupDiagnostic("RESPONSE_PARSE_FAILURE", "RESPONSE_BODY"));
  }
  if (!plainObject(payload) || !Array.isArray(payload.results)) {
    throw new AppleReleaseSyncError("APPLE_LOOKUP_MALFORMED", appleLookupDiagnostic("INVALID_RESPONSE", "RESPONSE_BODY"));
  }
  const results = payload.results as Array<Record<string, unknown>>;

  let stored: unknown;
  try { stored = await input.store.get(overlayKey); }
  catch { throw new AppleReleaseSyncError("OVERLAY_STORE_READ_FAILED"); }
  let previous: AppleReleaseOverlaySnapshot | null = null;
  if (stored !== null && stored !== undefined) {
    previous = validateAppleReleaseOverlaySnapshot(stored);
    if (!previous) throw new AppleReleaseSyncError("OVERLAY_SNAPSHOT_MALFORMED");
  }

  const currentStaticMusicCutoff = staticMusicCutoff(input.baseWorks);
  const bootstrapCutoffDate = previous?.bootstrapCutoffDate ?? currentStaticMusicCutoff;
  const staticIds = staticCatalogStableIds(input.baseWorks);
  const previousWorks = previous?.works ?? {};
  const plan = classifyAppleArtistResults(results, staticIds, APPLE_ARTIST_ID, APPLE_ARTIST_LOOKUP_LIMIT);
  const sourceCollectionCount = results.filter((item) => item?.wrapperType === "collection" && item.artistId === Number(APPLE_ARTIST_ID)).length;
  const sourceTruncated = sourceCollectionCount >= APPLE_ARTIST_LOOKUP_LIMIT;
  const dateRangeObserved = dateRange(results);
  const works = { ...previousWorks };
  const statuses: AppleReleaseSyncReport["statuses"] = plan.existingIds.map((id: string) => ({ id, status: "EXISTING" }));
  const unresolved: AppleReleaseSyncReport["statuses"] = plan.unresolved.map((item: { reason: string; collectionName?: string | null }) => ({ id: null, status: "UNRESOLVED", reason: item.reason }));
  let existingOverlayCount = 0;
  let existingStableIdCount = plan.existingIds.length;
  let postCutoffNewCount = 0;
  let historicalPreCutoffUnresolvedCount = 0;
  let newCount = 0;
  let changedCount = 0;

  for (const candidate of plan.newItems as Array<{ workId: string; source: Record<string, unknown> }>) {
    const priorWork = previousWorks[candidate.workId];
    if (priorWork) {
      existingStableIdCount += 1;
    } else {
      const releaseDate = typeof candidate.source.releaseDate === "string" ? candidate.source.releaseDate.slice(0, 10) : "";
      if (!bootstrapCutoffDate) {
        unresolved.push({ id: candidate.workId, status: "UNRESOLVED", reason: "BOOTSTRAP_FLOOR_UNAVAILABLE" });
        continue;
      }
      if (!validYmd(releaseDate)) {
        unresolved.push({ id: candidate.workId, status: "UNRESOLVED", reason: "REQUIRED_PUBLIC_METADATA_MISSING" });
        continue;
      }
      if (releaseDate <= bootstrapCutoffDate) {
        historicalPreCutoffUnresolvedCount += 1;
        unresolved.push({ id: candidate.workId, status: "UNRESOLVED", reason: "HISTORICAL_BEFORE_BOOTSTRAP_FLOOR" });
        continue;
      }
      postCutoffNewCount += 1;
    }
    const projected = projectAppleCollectionToCatalogWork(candidate.source, APPLE_ARTIST_ID) as CatalogWork | null;
    if (!projected) {
      unresolved.push({ id: candidate.workId, status: "UNRESOLVED", reason: "REQUIRED_PUBLIC_METADATA_MISSING" });
      continue;
    }
    const merged = mergeAppleWork(priorWork, projected);
    if (!priorWork) {
      works[candidate.workId] = merged;
      newCount += 1;
      statuses.push({ id: candidate.workId, status: "NEW" });
    } else if (sortedJson(priorWork) === sortedJson(merged)) {
      existingOverlayCount += 1;
      statuses.push({ id: candidate.workId, status: "EXISTING" });
    } else {
      works[candidate.workId] = merged;
      changedCount += 1;
      statuses.push({ id: candidate.workId, status: "CHANGED" });
    }
  }
  statuses.push(...unresolved);
  statuses.sort((a, b) => String(a.id ?? "").localeCompare(String(b.id ?? "")) || a.status.localeCompare(b.status));

  const now = input.now ?? new Date();
  const snapshot: AppleReleaseOverlaySnapshot = {
    schemaVersion: 1,
    artistId: APPLE_ARTIST_ID,
    lastSuccessfulSyncAt: now.toISOString(),
    sourceResultCount: results.length,
    sourceCollectionCount,
    sourceTruncated,
    bootstrapCutoffDate,
    oldestObservedReleaseDate: dateRangeObserved.oldest,
    newestObservedReleaseDate: dateRangeObserved.newest,
    works,
  };
  if (Object.keys(snapshot.works).length > APPLE_RELEASE_OVERLAY_MAX_WORKS || encodedSize(snapshot) > APPLE_RELEASE_OVERLAY_MAX_BYTES) {
    throw new AppleReleaseSyncError("OVERLAY_SNAPSHOT_LIMIT");
  }
  try { await input.store.set(overlayKey, snapshot); }
  catch { throw new AppleReleaseSyncError("OVERLAY_STORE_WRITE_FAILED"); }

  const backfillWindowStatus = classifyAppleBackfillWindow(dateRangeObserved.oldest, currentStaticMusicCutoff, sourceTruncated);
  return {
    artistId: APPLE_ARTIST_ID,
    appleResultsCount: results.length,
    sourceCollectionCount,
    sourceTruncated,
    appleArtistLookupCompleteness: "NOT_PROVEN",
    historicalCatalogCompleteness: "NOT_PROVEN",
    oldestObservedReleaseDate: dateRangeObserved.oldest,
    newestObservedReleaseDate: dateRangeObserved.newest,
    currentStaticMusicCutoff,
    bootstrapCutoffDate,
    recentReleaseWindowCoverage: backfillWindowStatus === "BACKFILL_WINDOW_REACHED" ? "REACHED" : backfillWindowStatus === "BACKFILL_WINDOW_NOT_REACHED" ? "NOT_REACHED" : "UNKNOWN",
    backfillWindowStatus,
    existingStableIdCount,
    postCutoffNewCount,
    historicalPreCutoffUnresolvedCount,
    admittedOverlayWorkCount: newCount,
    existingCount: plan.existingIds.length + existingOverlayCount,
    newCount,
    changedCount,
    unresolvedCount: unresolved.length,
    overlayWorkCount: Object.keys(snapshot.works).length,
    statuses,
  };
}

export async function readAppleReleaseOverlay(store: AppleReleaseOverlayStore | null, now = new Date(), scope: RuntimeDataScope = resolveRuntimeDataScope(process.env.VERCEL_ENV)): Promise<{ status: OverlayReadStatus; snapshot: AppleReleaseOverlaySnapshot | null }> {
  if (!store) return { status: "UNAVAILABLE", snapshot: null };
  let raw: unknown;
  try { raw = await store.get(appleReleaseOverlayKey(scope)); }
  catch { return { status: "UNAVAILABLE", snapshot: null }; }
  if (raw === null || raw === undefined) return { status: "EMPTY", snapshot: null };
  const snapshot = validateAppleReleaseOverlaySnapshot(raw);
  if (!snapshot) return { status: "MALFORMED", snapshot: null };
  const age = now.getTime() - Date.parse(snapshot.lastSuccessfulSyncAt);
  return age > APPLE_RELEASE_OVERLAY_STALE_AFTER_MS ? { status: "STALE", snapshot } : { status: "AVAILABLE", snapshot };
}

export function mergeLiveCatalogWorks(baseWorks: CatalogWork[], snapshot: AppleReleaseOverlaySnapshot | null): CatalogWork[] {
  if (!snapshot) return baseWorks.slice();
  const baseIds = staticCatalogStableIds(baseWorks);
  const overlayWorks = Object.entries(snapshot.works)
    .filter(([id]) => !baseIds.has(id))
    .map(([, work]) => work);
  return [...baseWorks, ...overlayWorks];
}
