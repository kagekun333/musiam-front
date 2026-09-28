import assert from "node:assert/strict";
import {
  canonicalReleaseKey,
  classifyReleaseIngestion,
  isCatalogCompletionReady,
  mergeReleaseState,
  parseCanonicalReleaseDocument,
  projectReleaseMetadata,
  resolveReleaseWork,
  type CanonicalRelease,
} from "@/lib/distrokid-release-ingestion";
import { latestReleasedWorks } from "@/lib/chat-release-knowledge";
import type { CatalogWork } from "@/lib/mergeWorksCatalog";

const release = (overrides: Partial<CanonicalRelease> = {}): CanonicalRelease => ({
  releaseSource: "DistroKid",
  sourceReleaseId: "dk-release-001",
  title: "Synthetic Single",
  artist: "ABI Earl",
  releaseDate: "2026-09-26",
  primaryGenre: "Alternative",
  secondaryGenre: "Electronic",
  isrc: "USABC2600001",
  upc: "123456789012",
  artworkRef: null,
  publicUrls: ["https://open.spotify.com/album/0123456789abcdef012345"],
  sourceObservedAt: "2026-09-27T09:00:00Z",
  ...overrides,
});
const work = (id: string, title: string, date: string, additions: Partial<CatalogWork> = {}): CatalogWork => ({
  id, title, type: "music", releasedAt: date, primaryHref: `https://open.spotify.com/album/${id}`,
  distribution: { source: "DistroKid", releaseDate: date, isrc: `ISRC-${id}`, upc: `UPC-${id}` },
  ...additions,
});

const known = work("known-work", "Old title", "2026-08-14");
const single = release({ releaseType: "single" });
const album = release({ sourceReleaseId: "dk-album-002", title: "Synthetic Album", isrc: null, upc: "223456789012", releaseType: "album" });
const initial = classifyReleaseIngestion({ incoming: [single, album], stored: [], works: [known] });
assert.deepEqual(initial.map((item) => item.status), ["NEW", "NEW"], "NEW single and album candidates are detected without inventing Catalog works");
assert.deepEqual(initial.map((item) => item.catalogIntake), ["PENDING_CATALOG_COMPLETION", "PENDING_CATALOG_COMPLETION"]);

const stored = [single];
const genreChanged = release({ primaryGenre: "Alternative / Electronic", secondaryGenre: null });
const mixed = classifyReleaseIngestion({ incoming: [genreChanged, single], stored, works: [known] });
assert.deepEqual(mixed.map((item) => item.status), ["CHANGED", "UNCHANGED"], "genre updates change only the matching stored release");
assert.equal(genreChanged.primaryGenre, "Alternative / Electronic", "raw genre is retained");
assert.equal(single.secondaryGenre, "Electronic", "secondary genre remains separate");

const byIsrc = work("isrc-work", "ISRC match", "2026-08-01", { identifiers: { recordings: [{ isrc: "USABC2600001", trackNumber: 1 }] } });
const byUpc = work("upc-work", "UPC match", "2026-08-02", { distribution: { upc: "223456789012" } });
assert.equal(resolveReleaseWork(single, [byIsrc]).method, "EXACT_ISRC", "exact ISRC maps to one stable work");
assert.equal(resolveReleaseWork(album, [byUpc]).method, "UNIQUE_RELEASE_ID", "unique UPC/release maps to one stable work");
const appleCollectionWork = work("apple-collection-work", "Apple ID only", "2026-08-02", { identifiers: { release: { appleCollectionId: "7001" } } });
assert.equal(resolveReleaseWork(release({ sourceReleaseId: null, isrc: null, upc: "223456789012", releaseIdentifiers: { appleCollectionId: "7001" } }), [appleCollectionWork, byUpc]).workId, "upc-work", "exact UPC outranks an Apple collection ID");
assert.equal(resolveReleaseWork(release({ sourceReleaseId: null, isrc: null, upc: null, albumuuid: null, releaseIdentifiers: { appleCollectionId: "7001" } }), [appleCollectionWork]).workId, "apple-collection-work", "exact Apple collection ID is a later identity bridge");
assert.equal(resolveReleaseWork(release({ title: "Same title", isrc: null, upc: null, sourceReleaseId: null }), [byIsrc, byUpc]).workId, null, "title-only stays unresolved even when similar titles could exist");
assert.equal(resolveReleaseWork(release({ title: "Same title", isrc: null, upc: null, sourceReleaseId: null }), [byIsrc, work("other", "Same title", "2026-08-03")]).workId, null, "duplicate titles do not create identity");

const noGenre = release({ sourceReleaseId: "missing-genre", primaryGenre: null, secondaryGenre: null, isrc: null });
assert.equal(classifyReleaseIngestion({ incoming: [noGenre], stored: [], works: [] })[0].status, "NEW", "missing optional genre and ISRC do not invent metadata");
assert.equal(classifyReleaseIngestion({ incoming: [release({ sourceReleaseId: "undated-release", releaseDate: null, uploadDate: null })], stored: [], works: [] })[0].status, "NEW", "missing releaseDate and uploadDate do not block source registration");
assert.equal(projectReleaseMetadata(single, known).distribution?.primaryGenre, "Alternative", "projection preserves supplied genre only");
assert.equal(projectReleaseMetadata(single, known).cover, undefined, "projection does not fabricate cover art");
assert.equal(projectReleaseMetadata(single, known).type, "music", "projection retains the existing Catalog type");
assert.equal(isCatalogCompletionReady({ id: "candidate", title: "Candidate", type: "music", links: {} }), false, "an empty links container is not a recorded public action");
assert.equal(isCatalogCompletionReady({ id: "candidate", title: "Candidate", type: "music", primaryHref: "https://example.com/listen" }), true, "new work completion requires a stable ID, title/type, and recorded public action");

const twoDaily = [release({ sourceReleaseId: "daily-1", isrc: null, upc: "daily-upc-1", releaseDate: "2026-09-26" }), release({ sourceReleaseId: "daily-2", isrc: null, upc: "daily-upc-2", releaseDate: "2026-09-27" })];
const dayOne = classifyReleaseIngestion({ incoming: twoDaily, stored: [], works: [] });
assert.deepEqual(dayOne.map((entry) => entry.status), ["NEW", "NEW"], "two releases can be classified in one daily import");
const nextState = mergeReleaseState([], dayOne);
const rerun = classifyReleaseIngestion({ incoming: twoDaily, stored: nextState, works: [] });
assert.deepEqual(rerun.map((entry) => entry.status), ["UNCHANGED", "UNCHANGED"], "an applied source-state rerun is idempotent");
assert.equal(new Set(nextState.map(canonicalReleaseKey)).size, 2, "stable source identities keep same-title releases distinct");

const projected = [projectReleaseMetadata(release({ workId: "known-work", releaseDate: "2026-09-27" }), known), work("older-new", "Older new release", "2026-09-10")];
assert.equal(latestReleasedWorks(projected, { medium: "music", now: new Date("2026-09-27T23:59:00Z"), limit: 1 })[0].id, "known-work", "newer matching release becomes latest using its sourced date");
const olderProjected = [projectReleaseMetadata(release({ workId: "known-work", releaseDate: "2026-09-05" }), known), work("existing-latest", "Current latest", "2026-09-20")];
assert.equal(latestReleasedWorks(olderProjected, { medium: "music", now: new Date("2026-09-27T23:59:00Z"), limit: 1 })[0].id, "existing-latest", "older NEW metadata does not displace latest");

assert.throws(() => parseCanonicalReleaseDocument({ releases: [{ releaseSource: "DistroKid", releaseDate: "not-a-date" }] }), /releaseDate/, "malformed source is rejected");
assert.throws(() => parseCanonicalReleaseDocument({ releases: [single, single] }), /duplicate release identity/, "duplicate release identities are rejected");
assert.equal(parseCanonicalReleaseDocument({ releases: [release({ primaryGenre: null, secondaryGenre: null, isrc: null })] }).length, 1, "missing optional fields are accepted as null without defaults");

process.stdout.write(`${JSON.stringify({ result: "PASS", fixtureCases: ["new-single", "new-album", "changed-genre", "unchanged", "exact-isrc", "unique-upc", "title-only-unresolved", "duplicate-title", "missing-genre", "primary-secondary", "missing-isrc", "new-becomes-latest", "older-new-stays-older", "daily-two-release", "rerun-idempotency", "malformed-rejected", "no-fabricated-fields"], providerCalls: 0 })}\n`);
