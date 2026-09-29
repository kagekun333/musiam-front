export const APPLE_ARTIST_ID = "1811526635";

const isPublicDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export function titleOf(value = "") {
  return String(value).replace(/\s+-\s+(Single|EP)$/i, "").trim();
}

export function safeArtworkUrl(value) {
  try {
    const url = new globalThis.URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !/^is[1-5]-ssl\.mzstatic\.com$/.test(url.hostname)) return null;
    return url.toString().replace(/\/\d+x\d+bb\.jpg(?:\?.*)?$/, "/1600x1600bb.jpg");
  } catch { return null; }
}

export function safeStoreUrl(value) {
  try {
    const url = new globalThis.URL(value);
    const appleHost = url.hostname === "music.apple.com" || url.hostname.endsWith(".music.apple.com") ||
      url.hostname === "itunes.apple.com" || url.hostname.endsWith(".itunes.apple.com");
    if (url.protocol !== "https:" || url.username || url.password || !appleHost) return null;
    url.searchParams.delete("uo");
    return url.toString();
  } catch { return null; }
}

/** Projects only fields returned by Apple's public collection lookup. */
export function projectAppleCollectionToCatalogWork(item, artistId = APPLE_ARTIST_ID) {
  if (!item || typeof item !== "object" || item.wrapperType !== "collection" || String(item.artistId ?? "") !== String(artistId)) return null;
  const collectionId = String(item.collectionId ?? "");
  const title = titleOf(item.collectionName ?? "");
  const releaseDate = typeof item.releaseDate === "string" ? item.releaseDate.slice(0, 10) : "";
  const artist = typeof item.artistName === "string" ? item.artistName.trim() : "";
  const href = safeStoreUrl(item.collectionViewUrl);
  const cover = safeArtworkUrl(item.artworkUrl100);
  if (!/^\d+$/.test(collectionId) || !title || !isPublicDate(releaseDate) || !artist || !href || !cover) return null;

  const genre = typeof item.primaryGenreName === "string" && item.primaryGenreName.trim() ? item.primaryGenreName.trim() : null;
  const trackCount = Number(item.trackCount);
  const distribution = {
    source: "apple-music",
    artist,
    releaseDate,
    releaseDateAuthority: "APPLE_PUBLIC_DISTRIBUTION",
    ...(genre ? { primaryGenre: genre, appleGenre: genre } : {}),
    identifiers: { appleCollectionId: collectionId },
  };
  return {
    id: `apple-album-${collectionId}`,
    title,
    type: "music",
    cover,
    tags: ["apple-music", trackCount === 1 ? "single" : "album"],
    releasedAt: releaseDate,
    href,
    primaryHref: href,
    links: { appleMusic: href, listen: href },
    distribution,
    identifiers: { release: { appleCollectionId: collectionId } },
  };
}

/** Keeps the historical static sync shape while sharing the same safe Apple projection. */
export function projectAppleCollectionForStaticCatalog(item, artistId = APPLE_ARTIST_ID) {
  const work = projectAppleCollectionToCatalogWork(item, artistId);
  if (!work) return null;
  const distribution = { ...work.distribution };
  delete distribution.releaseDateAuthority;
  delete distribution.appleGenre;
  return { ...work, distribution };
}
