export const APPLE_ARTIST_LOOKUP_LIMIT = 200;

export function stableAppleWorkId(collectionId) {
  return collectionId == null || !/^\d+$/.test(String(collectionId)) ? null : `apple-album-${collectionId}`;
}

export function classifyAppleArtistResults(results, currentStableIds, artistId, requestedLimit = APPLE_ARTIST_LOOKUP_LIMIT) {
  const existingIds = currentStableIds instanceof Set ? currentStableIds : new Set(currentStableIds);
  const collections = results.filter((item) => item?.wrapperType === "collection");
  const seen = new Set();
  const newItems = [];
  const existing = [];
  const unresolved = [];
  for (const item of collections) {
    if (item.artistId !== Number(artistId)) continue;
    const workId = stableAppleWorkId(item.collectionId);
    if (!workId) { unresolved.push({ collectionName: typeof item.collectionName === "string" ? item.collectionName : null, reason: "MISSING_COLLECTION_ID" }); continue; }
    if (seen.has(workId)) continue;
    seen.add(workId);
    if (existingIds.has(workId)) existing.push(workId);
    else newItems.push({ workId, source: item });
  }
  const sourceTruncated = results.length >= requestedLimit;
  return {
    appleResultsCount: results.length,
    currentStableIds: [...existingIds].sort(),
    newItems,
    existingIds: existing.sort(),
    unresolved,
    sourceTruncated,
    completeness: "NOT_PROVEN",
    capWarning: sourceTruncated ? `APPLE_ARTIST_LOOKUP_LIMIT_REACHED_${requestedLimit}` : null,
    proposedAffectedIds: newItems.map((item) => item.workId).sort(),
  };
}
