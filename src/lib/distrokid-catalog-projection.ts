import type { CatalogWork } from "@/lib/mergeWorksCatalog";
import type { CanonicalRelease } from "@/lib/distrokid-release-ingestion";
import { releaseTiming } from "@/lib/release-status";

export type AppleReleaseResolution = {
  release: CanonicalRelease;
  apple: {
    collectionId: string;
    title: string;
    artist: string;
    releaseDate: string;
    primaryGenreName: string | null;
    collectionViewUrl: string;
    artworkUrl: string | null;
    trackCount: number | null;
    tracks: { title: string | null; isrc: string | null; previewUrl: string | null }[];
  };
};

function normalized(value: string | null | undefined) {
  return String(value ?? "").trim().normalize("NFKC").toLocaleLowerCase("en");
}

export function projectResolvedDistroKidRelease(record: AppleReleaseResolution, asOf = new Date()): CatalogWork | null {
  const { release, apple } = record;
  if (!/^\d+$/.test(apple.collectionId) || !release.title || !release.artist || !release.releaseDate ||
      releaseTiming(release.releaseDate, asOf) !== "RELEASED" || release.releaseDate !== apple.releaseDate ||
      normalized(release.artist) !== normalized(apple.artist) || !apple.title || !apple.collectionViewUrl) return null;
  const storeUrl = new URL(apple.collectionViewUrl);
  const imageUrl = apple.artworkUrl ? new URL(apple.artworkUrl) : null;
  const appleHost = storeUrl.hostname === "apple.com" || storeUrl.hostname.endsWith(".apple.com");
  const imageHost = imageUrl && (imageUrl.hostname === "mzstatic.com" || imageUrl.hostname.endsWith(".mzstatic.com"));
  if (storeUrl.protocol !== "https:" || !appleHost ||
      (imageUrl && (imageUrl.protocol !== "https:" || !imageHost))) return null;
  const stableId = `apple-album-${apple.collectionId}`;
  const title = apple.title.replace(/\s+-\s+(Single|EP)$/i, "").trim();
  const identifiers: Record<string, string> = { ...(release.releaseIdentifiers ?? {}), appleCollectionId: apple.collectionId };
  if (release.sourceReleaseId) identifiers.sourceReleaseId = release.sourceReleaseId;
  if (release.albumuuid) identifiers.albumuuid = release.albumuuid;
  if (release.upc) identifiers.upc = release.upc;
  const recordingRows = release.tracks?.filter((track) => track.isrc).map((track, index) => ({ isrc: track.isrc!, trackNumber: index + 1 })) ?? [];
  if (!recordingRows.length && release.isrc) recordingRows.push({ isrc: release.isrc, trackNumber: 1 });
  const storeHost = storeUrl.hostname;
  const actionKey = storeHost === "music.apple.com" || storeHost.endsWith(".music.apple.com") ? "appleMusic" : "listen";
  return {
    id: stableId,
    title,
    type: "music",
    ...(imageUrl ? { cover: imageUrl.toString() } : {}),
    tags: ["apple-music", release.releaseType ?? (apple.trackCount === 1 ? "single" : "album")],
    releasedAt: release.releaseDate,
    href: storeUrl.toString(),
    primaryHref: storeUrl.toString(),
    links: { [actionKey]: storeUrl.toString(), listen: storeUrl.toString() },
    ...(apple.tracks.find((track) => track.previewUrl)?.previewUrl ? { previewUrl: apple.tracks.find((track) => track.previewUrl)!.previewUrl! } : {}),
    distribution: {
      source: release.releaseSource,
      label: release.label ?? null,
      artist: release.artist,
      releaseDate: release.releaseDate,
      primaryGenre: release.primaryGenre,
      secondaryGenre: release.secondaryGenre,
      appleGenre: apple.primaryGenreName,
      isrc: release.isrc,
      upc: release.upc,
      identifiers,
    },
    identifiers: {
      release: { appleCollectionId: apple.collectionId, upc: release.upc, albumuuid: release.albumuuid },
      recordings: recordingRows,
    },
    catalogStatus: { identityConflict: false, recommendationReady: true, recommendationEligible: true, source: "DISTROKID_APPLE_UPC_RESOLVED" },
  };
}
