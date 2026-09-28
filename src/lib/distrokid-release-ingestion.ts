import type { CatalogWork } from "@/lib/mergeWorksCatalog";

/** Canonical, source-neutral representation of one distributor release. */
export type CanonicalRelease = {
  releaseSource: string;
  sourceReleaseId: string | null;
  title: string | null;
  artist: string | null;
  releaseDate: string | null;
  primaryGenre: string | null;
  secondaryGenre: string | null;
  isrc: string | null;
  upc: string | null;
  artworkRef: string | null;
  publicUrls: string[];
  sourceObservedAt: string | null;
  /** Optional source facts, kept separate from raw source rows. */
  releaseType?: "single" | "album" | "ep" | null;
  label?: string | null;
  albumuuid?: string | null;
  uploadDate?: string | null;
  visibleStatus?: string | null;
  tracks?: { title: string | null; isrc: string | null }[];
  releaseIdentifiers?: Record<string, string>;
  workId?: string | null;
  canonicalWorkId?: string | null;
  alias?: string | null;
};

export type IngestionStatus = "NEW" | "CHANGED" | "UNCHANGED" | "UNRESOLVED";
export type CatalogIntakeStatus = "READY_FOR_EXISTING_WORK" | "PENDING_CATALOG_COMPLETION" | "UNRESOLVED";
export type StoredReleaseState = { schemaVersion: 1; releases: CanonicalRelease[] };

const optionalStringFields = [
  "sourceReleaseId", "title", "artist", "releaseDate", "primaryGenre", "secondaryGenre",
  "isrc", "upc", "artworkRef", "sourceObservedAt", "workId", "canonicalWorkId", "alias",
] as const;
const allowedFields = new Set<string>([
  "releaseSource", ...optionalStringFields, "publicUrls", "releaseType", "releaseIdentifiers",
  "label", "albumuuid", "uploadDate", "visibleStatus", "tracks",
]);

const clean = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const identityToken = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "");
const releaseKey = (release: CanonicalRelease) => {
  const source = identityToken(release.releaseSource);
  const sourceId = clean(release.sourceReleaseId);
  if (sourceId) return `source:${source}:${identityToken(sourceId)}`;
  const isrc = clean(release.isrc);
  if (isrc) return `isrc:${identityToken(isrc)}`;
  const upc = clean(release.upc);
  if (upc) return `upc:${identityToken(upc)}`;
  const explicit = Object.entries(release.releaseIdentifiers ?? {}).sort(([a], [b]) => a.localeCompare(b))[0];
  return explicit ? `release:${identityToken(explicit[0])}:${identityToken(explicit[1])}` : null;
};

function validDate(value: string | null): boolean {
  return value === null || (/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value);
}

export function parseCanonicalRelease(value: unknown): CanonicalRelease {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("release row must be an object");
  const row = value as Record<string, unknown>;
  const unknown = Object.keys(row).filter((field) => !allowedFields.has(field));
  if (unknown.length) throw new Error(`unsupported release field: ${unknown[0]}`);
  if (typeof row.releaseSource !== "string" || !row.releaseSource.trim()) throw new Error("releaseSource is required");
  for (const field of optionalStringFields) {
    if (row[field] !== undefined && row[field] !== null && typeof row[field] !== "string") throw new Error(`${field} must be a string or null`);
  }
  if (row.publicUrls !== undefined && (!Array.isArray(row.publicUrls) || row.publicUrls.some((url) => typeof url !== "string"))) {
    throw new Error("publicUrls must be an array of strings");
  }
  if (row.releaseType !== undefined && row.releaseType !== null && !["single", "album", "ep"].includes(String(row.releaseType))) {
    throw new Error("releaseType must be single, album, ep, or null");
  }
  if (row.releaseIdentifiers !== undefined && (!row.releaseIdentifiers || typeof row.releaseIdentifiers !== "object" || Array.isArray(row.releaseIdentifiers))) {
    throw new Error("releaseIdentifiers must be an object of string identifiers");
  }
  if (row.tracks !== undefined && (!Array.isArray(row.tracks) || row.tracks.some((track) => !track || typeof track !== "object" || Array.isArray(track) ||
    ((track as Record<string, unknown>).title !== null && typeof (track as Record<string, unknown>).title !== "string") ||
    ((track as Record<string, unknown>).isrc !== null && typeof (track as Record<string, unknown>).isrc !== "string")))) {
    throw new Error("tracks must be an array of { title, isrc } records");
  }
  for (const field of ["label", "albumuuid", "uploadDate", "visibleStatus"] as const) {
    if (row[field] !== undefined && row[field] !== null && typeof row[field] !== "string") throw new Error(`${field} must be a string or null`);
  }
  const releaseIdentifiers: Record<string, string> = {};
  for (const [key, identifier] of Object.entries((row.releaseIdentifiers ?? {}) as Record<string, unknown>)) {
    if (!key.trim() || typeof identifier !== "string" || !identifier.trim()) throw new Error("releaseIdentifiers values must be non-empty strings");
    releaseIdentifiers[key.trim()] = identifier.trim();
  }
  const parsed: CanonicalRelease = {
    releaseSource: row.releaseSource.trim(),
    sourceReleaseId: clean(row.sourceReleaseId),
    title: clean(row.title),
    artist: clean(row.artist),
    releaseDate: clean(row.releaseDate),
    primaryGenre: clean(row.primaryGenre),
    secondaryGenre: clean(row.secondaryGenre),
    isrc: clean(row.isrc),
    upc: clean(row.upc),
    artworkRef: clean(row.artworkRef),
    publicUrls: ((row.publicUrls ?? []) as string[]).map((url) => url.trim()).filter(Boolean),
    sourceObservedAt: clean(row.sourceObservedAt),
    ...(row.label !== undefined ? { label: clean(row.label) } : {}),
    ...(row.albumuuid !== undefined ? { albumuuid: clean(row.albumuuid) } : {}),
    ...(row.uploadDate !== undefined ? { uploadDate: clean(row.uploadDate) } : {}),
    ...(row.visibleStatus !== undefined ? { visibleStatus: clean(row.visibleStatus) } : {}),
    ...(Array.isArray(row.tracks) ? { tracks: (row.tracks as Array<{ title: string | null; isrc: string | null }>).map((track) => ({ title: clean(track.title), isrc: clean(track.isrc) })) } : {}),
    ...(row.releaseType !== undefined ? { releaseType: row.releaseType as CanonicalRelease["releaseType"] } : {}),
    ...(Object.keys(releaseIdentifiers).length ? { releaseIdentifiers } : {}),
    ...(clean(row.workId) ? { workId: clean(row.workId) } : {}),
    ...(clean(row.canonicalWorkId) ? { canonicalWorkId: clean(row.canonicalWorkId) } : {}),
    ...(clean(row.alias) ? { alias: clean(row.alias) } : {}),
  };
  if (!validDate(parsed.releaseDate)) throw new Error("releaseDate must be YYYY-MM-DD or null");
  if (parsed.sourceObservedAt && (!/^\d{4}-\d{2}-\d{2}T/.test(parsed.sourceObservedAt) || !Number.isFinite(Date.parse(parsed.sourceObservedAt)))) {
    throw new Error("sourceObservedAt must be an ISO timestamp or null");
  }
  for (const url of parsed.publicUrls) {
    try { if (!/^https?:$/.test(new URL(url).protocol)) throw new Error(); } catch { throw new Error("publicUrls must contain valid http(s) URLs"); }
  }
  return parsed;
}

export function parseCanonicalReleaseDocument(value: unknown): CanonicalRelease[] {
  let rows: unknown;
  if (Array.isArray(value)) rows = value;
  else if (value && typeof value === "object" && Array.isArray((value as { releases?: unknown }).releases)) rows = (value as { releases: unknown[] }).releases;
  else throw new Error("input must be a release array or { releases: [...] }");
  const parsed = (rows as unknown[]).map(parseCanonicalRelease);
  const keys = parsed.map(releaseKey);
  const seen = new Set<string>();
  for (const key of keys) {
    if (key && seen.has(key)) throw new Error("duplicate release identity in source file");
    if (key) seen.add(key);
  }
  return parsed;
}

export function releaseFingerprint(release: CanonicalRelease): string {
  return JSON.stringify({
    releaseSource: identityToken(release.releaseSource), sourceReleaseId: clean(release.sourceReleaseId), title: clean(release.title),
    artist: clean(release.artist), releaseDate: clean(release.releaseDate), primaryGenre: clean(release.primaryGenre),
    secondaryGenre: clean(release.secondaryGenre), isrc: clean(release.isrc) ? identityToken(release.isrc!) : null,
    upc: clean(release.upc) ? identityToken(release.upc!) : null, artworkRef: clean(release.artworkRef),
    publicUrls: [...release.publicUrls].sort(), releaseType: release.releaseType ?? null,
    releaseIdentifiers: Object.fromEntries(Object.entries(release.releaseIdentifiers ?? {}).sort(([a], [b]) => a.localeCompare(b))),
    label: clean(release.label), albumuuid: clean(release.albumuuid), uploadDate: clean(release.uploadDate), visibleStatus: clean(release.visibleStatus), tracks: release.tracks ?? [],
  });
}

function workIsrcs(work: CatalogWork): string[] {
  return [...(work.identifiers?.recordings ?? []).map((entry) => entry.isrc), work.distribution?.isrc].filter((x): x is string => !!x);
}

export function resolveReleaseWork(release: CanonicalRelease, works: CatalogWork[]): { workId: string | null; method: string | null; ambiguous: boolean } {
  const choose = (matches: CatalogWork[], method: string) => matches.length === 1
    ? { workId: String(matches[0].id ?? "") || null, method, ambiguous: false }
    : matches.length > 1 ? { workId: null, method: null, ambiguous: true } : null;
  if (release.workId) {
    const result = choose(works.filter((work) => String(work.id ?? "") === release.workId), "EXACT_WORK_ID");
    if (result) return result;
  }
  if (release.canonicalWorkId) {
    const result = choose(works.filter((work) => String(work.id ?? "") === release.canonicalWorkId || work.canonicalMasterId === release.canonicalWorkId), "CANONICAL_MAPPING");
    if (result) return result;
  }
  if (release.isrc) {
    const result = choose(works.filter((work) => workIsrcs(work).some((value) => identityToken(value) === identityToken(release.isrc!))), "EXACT_ISRC");
    if (result) return result;
  }
  const storedIdentifiers = (work: CatalogWork) => [work.identifiers?.release?.albumuuid, work.ssd?.albumuuid,
    ...Object.entries(work.distribution?.identifiers ?? {}).filter(([name]) => name !== "appleCollectionId").map(([, value]) => value)]
    .filter((value): value is string => !!value).map(identityToken);
  const explicitReleaseIds = [release.sourceReleaseId, release.albumuuid,
    ...Object.entries(release.releaseIdentifiers ?? {}).filter(([name]) => !["appleCollectionId", "upc"].includes(name)).map(([, value]) => value)]
    .filter((x): x is string => !!x);
  if (explicitReleaseIds.length || release.upc) {
    const releaseIdentityValues = [...explicitReleaseIds, release.upc].filter((value): value is string => !!value).map(identityToken);
    const result = choose(works.filter((work) => releaseIdentityValues.some((value) =>
      storedIdentifiers(work).includes(value) || [work.distribution?.upc, work.identifiers?.release?.upc].some((candidate) => candidate && identityToken(candidate) === value))), "UNIQUE_RELEASE_ID");
    if (result) return result;
  }
  const appleCollectionId = release.releaseIdentifiers?.appleCollectionId;
  if (appleCollectionId) {
    const result = choose(works.filter((work) => [work.identifiers?.release?.appleCollectionId,
      work.distribution?.identifiers?.appleCollectionId].some((value) => value && identityToken(value) === identityToken(appleCollectionId))), "UNIQUE_RELEASE_ID");
    if (result) return result;
  }
  if (release.alias) {
    const result = choose(works.filter((work) => (work.catalogAliases ?? []).includes(release.alias!)), "EXPLICIT_ALIAS");
    if (result) return result;
  }
  return { workId: null, method: null, ambiguous: false };
}

export function classifyReleaseIngestion(input: {
  incoming: CanonicalRelease[];
  stored: CanonicalRelease[];
  works: CatalogWork[];
}): Array<{ release: CanonicalRelease; status: IngestionStatus; workId: string | null; identityMethod: string | null; catalogIntake: CatalogIntakeStatus; key: string | null }> {
  const previous = new Map<string, CanonicalRelease>();
  for (const row of input.stored) {
    const key = releaseKey(row);
    if (key) previous.set(key, row);
  }
  return input.incoming.map((release) => {
    const resolution = resolveReleaseWork(release, input.works);
    const key = releaseKey(release);
    if (resolution.ambiguous || (!key && !resolution.workId)) return { release, status: "UNRESOLVED", workId: null, identityMethod: null, catalogIntake: "UNRESOLVED", key };
    const prior = key ? previous.get(key) : undefined;
    const status: IngestionStatus = prior === undefined ? "NEW" : releaseFingerprint(prior) === releaseFingerprint(release) ? "UNCHANGED" : "CHANGED";
    return {
      release, status, workId: resolution.workId, identityMethod: resolution.method, key,
      catalogIntake: resolution.workId ? "READY_FOR_EXISTING_WORK" : "PENDING_CATALOG_COMPLETION",
    };
  });
}

export function projectReleaseMetadata(release: CanonicalRelease, work: CatalogWork): CatalogWork {
  const identifiers = { ...(work.distribution?.identifiers ?? {}) };
  for (const [key, value] of Object.entries(release.releaseIdentifiers ?? {})) identifiers[key] = value;
  if (release.sourceReleaseId) identifiers.sourceReleaseId = release.sourceReleaseId;
  if (release.upc) identifiers.upc = release.upc;
  if (release.albumuuid) identifiers.albumuuid = release.albumuuid;
  return {
    ...work,
    distribution: {
      ...work.distribution,
      source: release.releaseSource,
      label: release.label ?? work.distribution?.label ?? null,
      artist: release.artist ?? work.distribution?.artist ?? null,
      releaseDate: release.releaseDate ?? work.distribution?.releaseDate ?? null,
      releaseDateAuthority: release.releaseDate ? "DISTROKID_EXPLICIT" : work.distribution?.releaseDateAuthority ?? null,
      primaryGenre: release.primaryGenre ?? work.distribution?.primaryGenre ?? null,
      secondaryGenre: release.secondaryGenre ?? work.distribution?.secondaryGenre ?? null,
      isrc: release.isrc ?? work.distribution?.isrc ?? null,
      upc: release.upc ?? work.distribution?.upc ?? null,
      identifiers,
    },
    ...(release.releaseDate ? { releasedAt: release.releaseDate } : {}),
  };
}

export function projectStoredReleaseMetadata(works: CatalogWork[], releases: CanonicalRelease[]): CatalogWork[] {
  return works.map((work) => {
    const matching = releases.filter((release) => resolveReleaseWork(release, [work]).workId === String(work.id ?? ""));
    return matching.reduce((projected, release) => projectReleaseMetadata(release, projected), work);
  });
}

export function mergeReleaseState(stored: CanonicalRelease[], results: ReturnType<typeof classifyReleaseIngestion>): CanonicalRelease[] {
  const state = new Map<string, CanonicalRelease>();
  for (const release of stored) {
    const key = releaseKey(release);
    if (key) state.set(key, release);
  }
  for (const result of results) {
    if (!result.key || result.status === "UNRESOLVED" || result.status === "UNCHANGED") continue;
    state.set(result.key, result.release);
  }
  return [...state.values()];
}

export function isCatalogCompletionReady(work: CatalogWork): boolean {
  const candidates = [work.primaryHref, work.href,
    ...(Array.isArray(work.links) ? work.links.map((link) => link.url) : Object.values(work.links ?? {}))]
    .filter((value): value is string => typeof value === "string");
  const hasRecordedAction = candidates.some((value) => {
    try { return /^https?:$/.test(new URL(value).protocol); } catch { return false; }
  });
  return !!clean(work.id) && !!clean(work.title) && /music|album|track|song|audio/i.test(String(work.type ?? "")) && hasRecordedAction;
}

export const canonicalReleaseKey = releaseKey;
