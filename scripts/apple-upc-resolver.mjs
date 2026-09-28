export function normalizeAppleResult(result) {
  const url = (value, allowHosts) => {
    if (typeof value !== "string") return null;
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "https:" || !allowHosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))) return null;
      return parsed.toString();
    } catch { return null; }
  };
  const storeUrl = url(result.collectionViewUrl, ["music.apple.com", "itunes.apple.com"]);
  const artworkUrl = url(result.artworkUrl100, ["mzstatic.com"]);
  const tracks = Array.isArray(result.tracks) ? result.tracks.filter((track) => track && track.wrapperType === "track").map((track) => ({
    title: typeof track.trackName === "string" ? track.trackName : null,
    isrc: typeof track.isrc === "string" ? track.isrc : null,
    previewUrl: url(track.previewUrl, ["audio-ssl.itunes.apple.com", "aod.itunes.apple.com"]),
  })) : [];
  return {
    collectionId: result.collectionId == null ? null : String(result.collectionId),
    title: typeof result.collectionName === "string" ? result.collectionName : null,
    artist: typeof result.artistName === "string" ? result.artistName : null,
    releaseDate: typeof result.releaseDate === "string" ? result.releaseDate.slice(0, 10) : null,
    primaryGenreName: typeof result.primaryGenreName === "string" ? result.primaryGenreName : null,
    collectionViewUrl: storeUrl,
    artworkUrl,
    trackCount: Number.isInteger(result.trackCount) ? result.trackCount : null,
    tracks,
  };
}

const norm = (value) => String(value ?? "").trim().normalize("NFKC").toLocaleLowerCase("en");

export function resolveAppleUpcResult(input, rawResults) {
  const collections = rawResults.filter((result) => result?.wrapperType === "collection");
  const artistMatches = collections.filter((result) => norm(result.artistName) === norm(input.expectedArtist));
  if (collections.length > 1) return { status: "AMBIGUOUS", collection: null };
  if (!artistMatches.length) return { status: collections.length ? "ARTIST_MISMATCH" : "NO_RESULT", collection: null };
  const collection = normalizeAppleResult(artistMatches[0]);
  if (!collection.collectionId) return { status: "INVALID_COLLECTION_ID", collection: null };
  if (input.expectedReleaseDate && collection.releaseDate && input.expectedReleaseDate !== collection.releaseDate) {
    return { status: "RELEASE_DATE_MISMATCH", collection };
  }
  const appleIsrcs = collection.tracks.map((track) => track.isrc).filter(Boolean);
  if (input.expectedIsrc && appleIsrcs.length && !appleIsrcs.some((value) => norm(value) === norm(input.expectedIsrc))) {
    return { status: "ISRC_MISMATCH", collection };
  }
  return { status: "RESOLVED", collection };
}

export function appleLookupUrl(upc, country = "jp") {
  const url = new URL("https://itunes.apple.com/lookup");
  url.searchParams.set("upc", String(upc));
  url.searchParams.set("entity", "album");
  url.searchParams.set("country", country);
  return url;
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=")];
  }));
  const { upc, artist, isrc, releaseDate, asOf, country = "jp" } = args;
  if (!/^\d{8,14}$/.test(upc ?? "") || !artist || (releaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate))) {
    throw new Error("usage: node scripts/apple-upc-resolver.mjs --upc=digits --artist=name [--isrc=code] [--releaseDate=YYYY-MM-DD] [--asOf=YYYY-MM-DD]");
  }
  const today = asOf ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (releaseDate && releaseDate > today) {
    process.stdout.write(`${JSON.stringify({ status: "UPCOMING", lookup: "SKIPPED_BEFORE_RELEASE_DATE", stableWorkId: null })}\n`);
    return;
  }
  let response;
  try { response = await fetch(appleLookupUrl(upc, country), { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) }); }
  catch (error) {
    process.stdout.write(`${JSON.stringify({ status: "RELEASED_UNRESOLVED", lookup: "LOOKUP_UNAVAILABLE", causeCategory: error?.cause?.code ?? error?.name ?? "unknown", stableWorkId: null })}\n`);
    return;
  }
  if (!response.ok) {
    process.stdout.write(`${JSON.stringify({ status: "RELEASED_UNRESOLVED", lookup: "HTTP_ERROR", httpStatus: response.status, stableWorkId: null })}\n`);
    return;
  }
  let payload;
  try { payload = await response.json(); }
  catch { process.stdout.write(`${JSON.stringify({ status: "RELEASED_UNRESOLVED", lookup: "INVALID_JSON", stableWorkId: null })}\n`); return; }
  const resolution = resolveAppleUpcResult({ expectedArtist: artist, expectedIsrc: isrc, expectedReleaseDate: releaseDate }, Array.isArray(payload.results) ? payload.results : []);
  if (resolution.status !== "RESOLVED") {
    process.stdout.write(`${JSON.stringify({ status: "RELEASED_UNRESOLVED", lookup: resolution.status, stableWorkId: null, collection: resolution.collection })}\n`);
    return;
  }
  const collection = resolution.collection;
  process.stdout.write(`${JSON.stringify({ status: "RELEASED_RESOLVED", lookup: resolution.status, stableWorkId: `apple-album-${collection.collectionId}`, collection })}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : "Apple UPC lookup failed"}\n`); process.exitCode = 1; });
