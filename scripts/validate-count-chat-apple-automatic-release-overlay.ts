import assert from "node:assert/strict";
import {
  APPLE_ARTIST_LOOKUP_LIMIT,
  APPLE_ARTIST_LOOKUP_URL,
  APPLE_RELEASE_OVERLAY_KEY,
  APPLE_RELEASE_OVERLAY_STALE_AFTER_MS,
  classifyAppleBackfillWindow,
  AppleReleaseSyncError,
  readAppleReleaseOverlay,
  runAppleReleaseSync,
  validateAppleReleaseOverlaySnapshot,
  type AppleReleaseOverlaySnapshot,
  type AppleReleaseOverlayStore,
} from "../src/lib/apple-release-overlay";
import { APPLE_ARTIST_ID, projectAppleCollectionForStaticCatalog, projectAppleCollectionToCatalogWork, safeArtworkUrl } from "../src/lib/apple-public-catalog.mjs";
import { classifyAppleArtistResults } from "./apple-catalog-diff.mjs";
import { projectExhibitionWorks } from "../src/lib/exhibition-projection";
import { loadLiveMergedWorksServerWithStatus } from "../src/lib/loadLiveMergedWorksServer";
import { buildLunaEvidencePack, buildWorkKnowledgeEnvelope, latestReleasedWorks } from "../src/lib/chat-release-knowledge";
import { handleAppleReleaseCron } from "../src/lib/apple-release-cron-handler";
import type { CatalogWork } from "../src/lib/mergeWorksCatalog";

const FIXED_NOW = new Date("2026-09-29T12:00:00.000Z");

function appleRow(collectionId: number, collectionName: string, releaseDate = "2026-09-27", extra: Record<string, unknown> = {}) {
  return {
    wrapperType: "collection",
    collectionId,
    artistId: Number(APPLE_ARTIST_ID),
    artistName: "ABI伯爵",
    collectionName,
    releaseDate: `${releaseDate}T00:00:00Z`,
    collectionViewUrl: `https://music.apple.com/jp/album/work/${collectionId}`,
    artworkUrl100: `https://is1-ssl.mzstatic.com/image/thumb/Music/${collectionId}/100x100bb.jpg`,
    trackCount: 1,
    primaryGenreName: "Electronic",
    ...extra,
  };
}

class FakeOverlayStore implements AppleReleaseOverlayStore {
  value: unknown = null;
  reads = 0;
  writes = 0;
  failRead = false;
  async get(key: string) {
    assert.equal(key, APPLE_RELEASE_OVERLAY_KEY);
    this.reads += 1;
    if (this.failRead) throw new Error("fixture read failure");
    return this.value;
  }
  async set(key: string, snapshot: AppleReleaseOverlaySnapshot) {
    assert.equal(key, APPLE_RELEASE_OVERLAY_KEY);
    this.writes += 1;
    this.value = structuredClone(snapshot);
  }
}

const fakeFetch = (results: unknown[]) => async (_url: string | URL | Request, _init?: RequestInit) =>
  new Response(JSON.stringify({ resultCount: results.length, results }), { status: 200, headers: { "content-type": "application/json" } });

const captureSyncError = async (fetcher: typeof fetch) => {
  try {
    await runAppleReleaseSync({ baseWorks, store: new FakeOverlayStore(), fetcher });
  } catch (error) {
    if (error instanceof AppleReleaseSyncError) return error;
    throw error;
  }
  assert.fail("Expected Apple release sync to fail");
};

const baseWorks: CatalogWork[] = [
  { id: "static-latest", title: "Static work", type: "music", releasedAt: "2026-08-14", cover: "/static.jpg" },
  { id: "apple-album-100", title: "Already catalogued", type: "music", releasedAt: "2026-08-01", cover: "/already.jpg" },
];

async function main() {
let observedLookupUrl = "";
const bootstrapFixtureStore = new FakeOverlayStore();
const bootstrapFixtureReport = await runAppleReleaseSync({
  baseWorks,
  store: bootstrapFixtureStore,
  fetcher: (async (url: string | URL | Request) => {
    observedLookupUrl = String(url);
    return new Response(JSON.stringify({ resultCount: 0, results: [] }), { status: 200 });
  }) as typeof fetch,
  now: FIXED_NOW,
});
const lookupUrl = new URL(observedLookupUrl);
assert.equal(observedLookupUrl, APPLE_ARTIST_LOOKUP_URL, "The watcher sends its declared Apple lookup URL");
assert.equal(lookupUrl.searchParams.get("id"), APPLE_ARTIST_ID);
assert.equal(lookupUrl.searchParams.get("entity"), "album");
assert.equal(lookupUrl.searchParams.get("limit"), String(APPLE_ARTIST_LOOKUP_LIMIT));
assert.equal(lookupUrl.searchParams.get("country"), "US");
assert.equal(lookupUrl.searchParams.get("sort"), "recent", "The daily watcher requests Apple's recent result window");
assert.equal(bootstrapFixtureReport.currentStaticMusicCutoff, "2026-08-14");
assert.equal(bootstrapFixtureReport.bootstrapCutoffDate, "2026-08-14", "The first successful sync persists the fresh base Catalog floor");
assert.equal((bootstrapFixtureStore.value as AppleReleaseOverlaySnapshot).bootstrapCutoffDate, "2026-08-14");

const projected = projectAppleCollectionToCatalogWork(appleRow(201, "Evening - Single")) as CatalogWork;
assert.ok(projected, "A safe Apple collection projects into a CatalogWork");
assert.equal(projected.id, "apple-album-201");
assert.equal(projected.title, "Evening");
assert.equal(projected.cover, "https://is1-ssl.mzstatic.com/image/thumb/Music/201/1600x1600bb.jpg");
assert.equal(projected.distribution?.releaseDateAuthority, "APPLE_PUBLIC_DISTRIBUTION");
assert.equal(projected.distribution?.primaryGenre, "Electronic");
assert.equal(projected.distribution?.appleGenre, "Electronic");
const staticProjection = projectAppleCollectionForStaticCatalog(appleRow(209, "Archive - EP")) as CatalogWork;
assert.equal(staticProjection.title, "Archive");
assert.equal(staticProjection.distribution?.appleGenre, undefined, "The existing static sync shape stays compatible");
assert.equal(staticProjection.distribution?.releaseDateAuthority, undefined);
assert.equal(safeArtworkUrl("https://is5-ssl.mzstatic.com/image/thumb/A/100x100bb.jpg"), "https://is5-ssl.mzstatic.com/image/thumb/A/1600x1600bb.jpg");
assert.equal(projectAppleCollectionToCatalogWork({ ...appleRow(202, "Wrong Artist"), artistId: 12 }), null);

const dedupe = classifyAppleArtistResults([appleRow(203, "Duplicate"), appleRow(203, "Duplicate")], new Set(), APPLE_ARTIST_ID, APPLE_ARTIST_LOOKUP_LIMIT);
assert.equal(dedupe.newItems.length, 1, "Stable Apple collection ID deduplicates duplicate source rows");
const sameTitleStore = new FakeOverlayStore();
const sameTitleReport = await runAppleReleaseSync({
  baseWorks,
  store: sameTitleStore,
  fetcher: fakeFetch([appleRow(204, "Same title"), appleRow(205, "Same title")]) as typeof fetch,
  now: FIXED_NOW,
});
assert.equal(sameTitleReport.newCount, 2, "Same title with different Apple collection IDs remains distinct");
assert.ok((sameTitleStore.value as AppleReleaseOverlaySnapshot).works["apple-album-204"]);
assert.ok((sameTitleStore.value as AppleReleaseOverlaySnapshot).works["apple-album-205"]);

const staticMatchStore = new FakeOverlayStore();
const staticMatchReport = await runAppleReleaseSync({
  baseWorks,
  store: staticMatchStore,
  fetcher: fakeFetch([appleRow(100, "Already catalogued")]) as typeof fetch,
  now: FIXED_NOW,
});
assert.equal(staticMatchReport.existingCount, 1);
assert.equal(staticMatchReport.newCount, 0, "Existing static Apple ID is excluded from NEW");
assert.equal(Object.keys((staticMatchStore.value as AppleReleaseOverlaySnapshot).works).length, 0);
const aliasMatchStore = new FakeOverlayStore();
const aliasMatchReport = await runAppleReleaseSync({
  baseWorks: [...baseWorks, { id: "catalog-canonical", title: "Stable alias", type: "music", catalogAliases: ["apple-album-211"] }],
  store: aliasMatchStore,
  fetcher: fakeFetch([appleRow(211, "Stable alias")]) as typeof fetch,
  now: FIXED_NOW,
});
assert.equal(aliasMatchReport.newCount, 0, "An explicit static stable alias also excludes NEW without title matching");
assert.equal(aliasMatchReport.existingCount, 1);

const historicalGolden = appleRow(1815084292, "Golden Hour Brew", "2025-05-17");
const sameTitleHistoricalBase = [...baseWorks, {
  id: "spotify-album-4p4mU4kRIiz4Fx9t1UDQZj",
  title: "Golden Hour Brew",
  type: "music",
  releasedAt: "2025-05-17",
} as CatalogWork];
for (const historicalBase of [sameTitleHistoricalBase, baseWorks]) {
  const historicalStore = new FakeOverlayStore();
  const historicalReport = await runAppleReleaseSync({
    baseWorks: historicalBase,
    store: historicalStore,
    fetcher: fakeFetch([historicalGolden]) as typeof fetch,
    now: FIXED_NOW,
  });
  assert.equal(historicalReport.newCount, 0, "A pre-floor Apple ID mismatch never enters the automatic overlay");
  assert.equal(historicalReport.admittedOverlayWorkCount, 0);
  assert.equal(historicalReport.historicalPreCutoffUnresolvedCount, 1);
  assert.equal(historicalReport.unresolvedCount, 1);
  assert.equal(historicalReport.existingStableIdCount, 0, "A matching title is not stable-ID evidence");
  assert.equal((historicalStore.value as AppleReleaseOverlaySnapshot).works["apple-album-1815084292"], undefined);
  assert.ok(historicalReport.statuses.some((status) => status.id === "apple-album-1815084292" && status.status === "UNRESOLVED" && status.reason === "HISTORICAL_BEFORE_BOOTSTRAP_FLOOR"));
}

const postCutoffStore = new FakeOverlayStore();
const postCutoffReport = await runAppleReleaseSync({
  baseWorks,
  store: postCutoffStore,
  fetcher: fakeFetch([appleRow(6808000001, "Bootstrap floor plus one day", "2026-08-15")]) as typeof fetch,
  now: FIXED_NOW,
});
assert.equal(postCutoffReport.postCutoffNewCount, 1);
assert.equal(postCutoffReport.newCount, 1);
assert.equal(postCutoffReport.admittedOverlayWorkCount, 1);
assert.ok((postCutoffStore.value as AppleReleaseOverlaySnapshot).works["apple-album-6808000001"]);

const movedBaseCutoff: CatalogWork[] = [...baseWorks, { id: "newer-static", title: "Newer base", type: "music", releasedAt: "2026-09-30", cover: "/newer.jpg" }];
const persistedFloorReport = await runAppleReleaseSync({
  baseWorks: movedBaseCutoff,
  store: bootstrapFixtureStore,
  fetcher: fakeFetch([historicalGolden, appleRow(6808806776, "Sun Without a Map", "2026-09-29")]) as typeof fetch,
  now: FIXED_NOW,
});
assert.equal(persistedFloorReport.currentStaticMusicCutoff, "2026-09-30");
assert.equal(persistedFloorReport.bootstrapCutoffDate, "2026-08-14", "Later base cutoff movement does not move the persisted auto-admission floor");
assert.equal(persistedFloorReport.historicalPreCutoffUnresolvedCount, 1, "A historic item surfacing in a later result rotation remains unresolved");
assert.equal(persistedFloorReport.newCount, 1);
assert.equal((bootstrapFixtureStore.value as AppleReleaseOverlaySnapshot).works["apple-album-1815084292"], undefined);
assert.equal((bootstrapFixtureStore.value as AppleReleaseOverlaySnapshot).works["apple-album-6808806776"].title, "Sun Without a Map");

const newStore = new FakeOverlayStore();
const newReport = await runAppleReleaseSync({
  baseWorks,
  store: newStore,
  fetcher: fakeFetch([appleRow(206, "New release")]) as typeof fetch,
  now: FIXED_NOW,
});
assert.equal(newReport.newCount, 1, "A new stable Apple ID enters the persistent overlay");
const initialSnapshot = newStore.value as AppleReleaseOverlaySnapshot;
assert.ok(validateAppleReleaseOverlaySnapshot(initialSnapshot));
assert.equal(initialSnapshot.works["apple-album-206"].distribution?.source, "apple-music");

const changedStore = new FakeOverlayStore();
changedStore.value = structuredClone(initialSnapshot);
const changedReport = await runAppleReleaseSync({
  baseWorks,
  store: changedStore,
  fetcher: fakeFetch([appleRow(206, "Updated release - Single")]) as typeof fetch,
  now: new Date("2026-09-29T13:00:00.000Z"),
});
assert.equal(changedReport.changedCount, 1);
assert.equal(changedReport.newCount, 0);
assert.equal(changedReport.bootstrapCutoffDate, "2026-08-14", "Existing overlay updates preserve the stable bootstrap floor");
assert.equal((changedStore.value as AppleReleaseOverlaySnapshot).works["apple-album-206"].title, "Updated release");

const omittedStore = new FakeOverlayStore();
omittedStore.value = structuredClone(initialSnapshot);
const omissionReport = await runAppleReleaseSync({ baseWorks, store: omittedStore, fetcher: fakeFetch([]) as typeof fetch, now: FIXED_NOW });
assert.equal(omissionReport.overlayWorkCount, 1, "A source omission does not remove an earlier overlay work");
assert.ok((omittedStore.value as AppleReleaseOverlaySnapshot).works["apple-album-206"]);

const failureStore = new FakeOverlayStore();
failureStore.value = structuredClone(initialSnapshot);
const beforeFailure = structuredClone(failureStore.value);
await assert.rejects(runAppleReleaseSync({ baseWorks, store: failureStore, fetcher: (async () => { throw new Error("fixture network failure"); }) as typeof fetch }), /APPLE_LOOKUP_FAILED/);
assert.deepEqual(failureStore.value, beforeFailure, "Apple failure preserves the prior snapshot");
assert.equal(failureStore.writes, 0, "Apple failure performs no overlay write");

const lookupFailureFixtures: Array<{ category: string; fetcher: typeof fetch }> = [
  { category: "DNS_FAILURE", fetcher: (async () => { throw Object.assign(new Error("hidden"), { cause: Object.assign(new Error("hidden"), { code: "ENOTFOUND" }) }); }) as typeof fetch },
  { category: "CONNECTION_FAILURE", fetcher: (async () => { throw Object.assign(new Error("hidden"), { cause: Object.assign(new Error("hidden"), { code: "ECONNRESET" }) }); }) as typeof fetch },
  { category: "TLS_FAILURE", fetcher: (async () => { throw Object.assign(new Error("hidden"), { cause: Object.assign(new Error("hidden"), { code: "CERT_HAS_EXPIRED" }) }); }) as typeof fetch },
  { category: "TIMEOUT", fetcher: (async () => { throw Object.assign(new Error("hidden"), { cause: Object.assign(new Error("hidden"), { code: "ETIMEDOUT" }) }); }) as typeof fetch },
  { category: "EXECUTION_ENVIRONMENT_NETWORK_BLOCK", fetcher: (async () => { throw Object.assign(new Error("hidden"), { cause: Object.assign(new Error("hidden"), { code: "EPERM" }) }); }) as typeof fetch },
  { category: "HTTP_STATUS_FAILURE", fetcher: (async () => new Response("hidden body", { status: 429 })) as typeof fetch },
  { category: "RESPONSE_PARSE_FAILURE", fetcher: (async () => new Response("<html>hidden body</html>", { status: 200 })) as typeof fetch },
  { category: "INVALID_RESPONSE", fetcher: (async () => new Response(JSON.stringify({ resultCount: 0 }), { status: 200 })) as typeof fetch },
];
for (const fixture of lookupFailureFixtures) {
  const error = await captureSyncError(fixture.fetcher);
  assert.equal(error.lookupDiagnostic?.category, fixture.category);
  assert.equal(error.lookupDiagnostic?.host, "itunes.apple.com");
  assert.equal(error.lookupDiagnostic?.httpStatus, fixture.category === "HTTP_STATUS_FAILURE" ? 429 : null);
  assert.equal(error.message, error.code, "Raw transport details and response content stay out of error messages");
}

const malformedStore = new FakeOverlayStore();
malformedStore.value = { schemaVersion: 999, works: {} };
const malformedRead = await readAppleReleaseOverlay(malformedStore);
assert.equal(malformedRead.status, "MALFORMED");
const malformedLoader = await loadLiveMergedWorksServerWithStatus({ baseLoader: async () => baseWorks, store: malformedStore });
assert.equal(malformedLoader.overlayStatus, "MALFORMED");
assert.deepEqual(malformedLoader.works, baseWorks, "Malformed overlay fails open to the unchanged base catalog");

const liveStore = new FakeOverlayStore();
liveStore.value = structuredClone(initialSnapshot);
const liveLoader = await loadLiveMergedWorksServerWithStatus({ baseLoader: async () => baseWorks, store: liveStore });
assert.equal(liveLoader.overlayStatus, "AVAILABLE");
assert.ok(liveLoader.works.some((work) => work.id === "apple-album-206"), "Chat live loader receives the dynamic release");
const staleRead = await readAppleReleaseOverlay(liveStore, new Date(FIXED_NOW.getTime() + APPLE_RELEASE_OVERLAY_STALE_AFTER_MS + 1));
assert.equal(staleRead.status, "STALE", "Health status exposes an old successful sync timestamp");
assert.ok(staleRead.snapshot?.works["apple-album-206"], "Stale status still keeps prior dynamic works available");
assert.equal(latestReleasedWorks(liveLoader.works, { medium: "music", now: FIXED_NOW, limit: 1 })[0]?.id, "apple-album-206", "Latest release is selected from the live merged catalog");
const releasedExhibition = projectExhibitionWorks([projected], [], "2026-09-29");
assert.equal(releasedExhibition.works[0]?.id, "apple-album-201", "Released dynamic work appears in Exhibition");
const futureWork = projectAppleCollectionToCatalogWork(appleRow(207, "Future", "2026-10-01")) as CatalogWork;
assert.equal(projectExhibitionWorks([futureWork], [], "2026-09-29").works.length, 0, "Future dynamic work remains excluded from Exhibition");

const knowledge = buildWorkKnowledgeEnvelope(projected);
assert.equal(knowledge?.distribution.appleGenre, "Electronic");
assert.equal(knowledge?.distribution.primaryGenreSource, "APPLE_PUBLIC_CATALOG");
assert.ok(knowledge?.evidence.some((entry) => entry.field === "appleGenre" && entry.sourceType === "APPLE_PUBLIC_CATALOG"), "Apple genre remains a source-aware fact");
assert.match(buildLunaEvidencePack(projected) ?? "", /"appleGenre":"Electronic"/);
assert.equal(knowledge?.interpretations.status, "UNPOPULATED");
assert.equal(knowledge?.audioAnalysis, null);
for (const invented of ["lyrics", "instruments", "bpm", "sonicTexture", "productionIntent"]) {
  assert.equal(Object.hasOwn(projected, invented), false, `Apple projection does not invent ${invented}`);
}

const unauthorizedStore = new FakeOverlayStore();
let unauthorizedBaseReads = 0;
const unauthorized = await handleAppleReleaseCron(new Request("https://example.test/api/cron/apple-release-sync"), {
  secret: "fixture-secret",
  getStore: () => unauthorizedStore,
  loadBaseWorks: async () => { unauthorizedBaseReads += 1; return baseWorks; },
  fetcher: fakeFetch([appleRow(208, "Must not sync")]) as typeof fetch,
});
assert.equal(unauthorized.status, 401, "Cron authentication is fail-closed for an unauthorized request");
assert.equal(unauthorizedStore.reads, 0);
assert.equal(unauthorizedBaseReads, 0);
const unavailableCron = await handleAppleReleaseCron(new Request("https://example.test/api/cron/apple-release-sync", {
  headers: { authorization: "Bearer fixture-secret" },
}), {
  secret: "fixture-secret",
  getStore: () => { throw new Error("fixture malformed Redis configuration"); },
  loadBaseWorks: async () => { throw new Error("base loader must not run without the store"); },
});
assert.equal(unavailableCron.status, 503, "Redis client construction failure fails closed without invoking sync");

const authorizedStore = new FakeOverlayStore();
const authorized = await handleAppleReleaseCron(new Request("https://example.test/api/cron/apple-release-sync", {
  headers: { authorization: "Bearer fixture-secret" },
}), {
  secret: "fixture-secret",
  getStore: () => authorizedStore,
  loadBaseWorks: async () => baseWorks,
  fetcher: fakeFetch([appleRow(208, "Authorized release")]) as typeof fetch,
  now: FIXED_NOW,
});
assert.equal(authorized.status, 200, "Authorized fixture cron request runs an injected sync");
assert.equal(authorizedStore.writes, 1);
assert.equal((authorizedStore.value as AppleReleaseOverlaySnapshot).works["apple-album-208"].title, "Authorized release");

const cappedRows = [
  { wrapperType: "artist", artistId: Number(APPLE_ARTIST_ID), artistName: "ABI伯爵" },
  ...Array.from({ length: APPLE_ARTIST_LOOKUP_LIMIT }, (_, index) => appleRow(10_000 + index, `Capped ${index}`)),
];
const cappedStore = new FakeOverlayStore();
const cappedReport = await runAppleReleaseSync({ baseWorks, store: cappedStore, fetcher: fakeFetch(cappedRows) as typeof fetch, now: FIXED_NOW });
assert.equal(cappedReport.appleResultsCount, APPLE_ARTIST_LOOKUP_LIMIT + 1, "The raw Apple response includes an artist row plus 200 collections");
assert.equal(cappedReport.sourceCollectionCount, APPLE_ARTIST_LOOKUP_LIMIT);
assert.equal(cappedReport.sourceTruncated, true, "A 200-result response marks the Apple source window as truncated");
assert.equal(cappedReport.appleArtistLookupCompleteness, "NOT_PROVEN", "A 200-result response never proves full-history coverage");
assert.equal(cappedReport.backfillWindowStatus, "BACKFILL_WINDOW_NOT_REACHED");
assert.equal(cappedReport.historicalCatalogCompleteness, "NOT_PROVEN");
assert.equal(classifyAppleBackfillWindow("2025-11-17", "2026-08-14", true), "BACKFILL_WINDOW_REACHED", "Recent-window coverage is independent of the 200-item cap");
assert.equal(classifyAppleBackfillWindow("2026-08-01", "2026-08-14", false), "BACKFILL_WINDOW_REACHED");

const recentWindowRows = Array.from({ length: APPLE_ARTIST_LOOKUP_LIMIT }, (_, index) => {
  if (index < 132) return appleRow(9_100_000_000 + index, `Historical ${index}`, "2025-11-17");
  if (index === 199) return appleRow(6808806776, "Sun Without a Map", "2026-09-29");
  const dayOffset = Math.floor((index - 132) * 44 / 66);
  const date = new Date(Date.parse("2026-08-15T00:00:00.000Z") + dayOffset * 86_400_000).toISOString().slice(0, 10);
  return appleRow(9_100_000_000 + index, `Recent ${index}`, date);
});
const recentWindowStore = new FakeOverlayStore();
const recentWindowReport = await runAppleReleaseSync({
  baseWorks,
  store: recentWindowStore,
  fetcher: fakeFetch([{ wrapperType: "artist", artistId: Number(APPLE_ARTIST_ID), artistName: "ABI伯爵" }, ...recentWindowRows]) as typeof fetch,
  now: FIXED_NOW,
});
assert.equal(recentWindowReport.sourceCollectionCount, 200);
assert.equal(recentWindowReport.sourceTruncated, true);
assert.equal(recentWindowReport.oldestObservedReleaseDate, "2025-11-17");
assert.equal(recentWindowReport.newestObservedReleaseDate, "2026-09-29");
assert.equal(recentWindowReport.postCutoffNewCount, 68, "Post-cutoff admission count is computed from this source window");
assert.equal(recentWindowReport.historicalPreCutoffUnresolvedCount, 132);
assert.equal(recentWindowReport.newCount, 68);
assert.equal(recentWindowReport.admittedOverlayWorkCount, 68);
assert.equal(recentWindowReport.recentReleaseWindowCoverage, "REACHED");
assert.equal(recentWindowReport.backfillWindowStatus, "BACKFILL_WINDOW_REACHED");
assert.equal(recentWindowReport.historicalCatalogCompleteness, "NOT_PROVEN");
assert.equal((recentWindowStore.value as AppleReleaseOverlaySnapshot).works["apple-album-6808806776"].title, "Sun Without a Map");

const unavailableStore = new FakeOverlayStore();
unavailableStore.failRead = true;
const unavailableRead = await readAppleReleaseOverlay(unavailableStore);
assert.equal(unavailableRead.status, "UNAVAILABLE");
const unavailableLoader = await loadLiveMergedWorksServerWithStatus({ baseLoader: async () => baseWorks, store: unavailableStore });
assert.equal(unavailableLoader.overlayStatus, "UNAVAILABLE");
assert.deepEqual(unavailableLoader.works, baseWorks, "Overlay unavailability preserves the base catalog");

assert.equal(APPLE_RELEASE_OVERLAY_KEY, "musiam:release-overlay:v1");
assert.equal(authorizedStore.reads + authorizedStore.writes, 2, "Fixture sync uses only its in-memory fake store");
process.stdout.write(`${JSON.stringify({
  result: "PASS",
  projection: "PASS",
  stableIdDedupe: "PASS",
  titleDoesNotJoinIdentity: "PASS",
  staticAppleIdExcluded: "PASS",
  newChangedOmissionAndFailure: "PASS",
  lookupErrorClassification: "PASS",
  malformedAndUnavailableFailOpen: "PASS",
  staleOverlayHealth: "PASS",
  exhibitionReleasedAndFuture: "PASS",
  chatLiveLatestAndAppleGenreFact: "PASS",
  noInventedSonicMetadata: "PASS",
  cronUnauthorizedAndAuthorizedFixture: "PASS",
  cronStoreConstructionFailure: "PASS",
  sourceCap: "PASS",
  recentSortRequestAndBootstrapFloor: "PASS",
  historicalAdmissionPreventionAndNoTitleMerge: "PASS",
  postCutoffAdmissionAndRecentWindowCoverage: "PASS",
  persistedFloorAndLatestRelease: "PASS",
  realRedisOperations: 0,
  providerCalls: 0,
}, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
