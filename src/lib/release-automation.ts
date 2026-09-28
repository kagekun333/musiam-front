import type { CatalogWork } from "@/lib/mergeWorksCatalog";
import type { CanonicalRelease } from "@/lib/distrokid-release-ingestion";
import { tokyoYmd, type ReleaseTiming, releaseTiming } from "@/lib/release-status";

export type ReleaseResolutionState = "UPCOMING" | "RELEASED_UNRESOLVED" | "RELEASED_RESOLVED" | "CATALOG_ACTIVE" | "UNRESOLVED";

export function resolveReleaseState(input: {
  release: CanonicalRelease;
  asOf?: Date;
  appleCollectionId?: string | null;
  catalogWork?: CatalogWork | null;
}): { timing: ReleaseTiming; state: ReleaseResolutionState; stableWorkId: string | null } {
  const timing = releaseTiming(input.release.releaseDate, input.asOf);
  if (!input.release.title || timing === "UNKNOWN") return { timing, state: "UNRESOLVED", stableWorkId: null };
  if (timing === "UPCOMING") return { timing, state: "UPCOMING", stableWorkId: null };
  const appleId = input.appleCollectionId ? `apple-album-${input.appleCollectionId}` : null;
  const stableWorkId = input.catalogWork?.id != null ? String(input.catalogWork.id) : appleId;
  if (input.catalogWork && stableWorkId) return { timing, state: "CATALOG_ACTIVE", stableWorkId };
  if (appleId) return { timing, state: "RELEASED_RESOLVED", stableWorkId: appleId };
  return { timing, state: "RELEASED_UNRESOLVED", stableWorkId: null };
}

export function upcomingReleaseCandidates(releases: CanonicalRelease[], asOf = new Date()): CanonicalRelease[] {
  const today = tokyoYmd(asOf);
  return releases.filter((release) => release.title && release.releaseDate && release.releaseDate > today)
    .sort((a, b) => String(a.releaseDate).localeCompare(String(b.releaseDate)) || String(a.sourceReleaseId ?? "").localeCompare(String(b.sourceReleaseId ?? "")));
}

export function nextUpcomingRelease(releases: CanonicalRelease[], asOf = new Date()): CanonicalRelease | null {
  return upcomingReleaseCandidates(releases, asOf)[0] ?? null;
}

export function classifyAppleArtistLookup(input: { resultCount: number; requestedLimit: number }) {
  const sourceTruncated = input.resultCount >= input.requestedLimit;
  return {
    completeness: "NOT_PROVEN" as const,
    sourceTruncated,
    warning: sourceTruncated ? `APPLE_ARTIST_LOOKUP_LIMIT_REACHED_${input.requestedLimit}` : null,
  };
}
