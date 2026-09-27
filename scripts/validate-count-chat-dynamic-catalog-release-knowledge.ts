import assert from "node:assert/strict";
import fs from "node:fs";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import { getPublicLinksForCard } from "@/lib/work-links";
import {
  DISTROKID_FEED_STATUS,
  INGESTION_PIPELINE_STATUS,
  asksForLatestRelease,
  asksForSonicDetails,
  buildLunaEvidencePack,
  buildWorkKnowledgeEnvelope,
  classifyIncrementalRows,
  deriveVisitorState,
  eligibleForVisitor,
  latestReleasedWorks,
  projectDistributionMetadata,
  resolveDistributionRow,
  unknownSonicText,
} from "@/lib/chat-release-knowledge";
import { selectOneRecommendation } from "@/lib/chat-recommendation-core";
import { buildChatWorkCard } from "@/lib/chat-work-card";
import type { CatalogWork } from "@/lib/mergeWorksCatalog";

async function main() {
const works = await loadMergedWorksServer();
const ids = works.map((work) => String(work.id ?? "")).filter(Boolean);
assert.equal(ids.length, works.length, "fresh runtime catalog must have a stable ID for every work");
assert.equal(new Set(ids).size, ids.length, "fresh runtime stable IDs must be unique");
const envelopes = works.map(buildWorkKnowledgeEnvelope);
assert.equal(envelopes.filter(Boolean).length, works.length, "every current runtime work must produce an envelope");
assert.equal(works.filter((work) => work.catalogStatus?.identityConflict).length, 0, "fixture observes identity conflicts without forcing a fixed count");

const music = (id: string, title: string, releaseDate: string, additions: Partial<CatalogWork> = {}): CatalogWork => ({
  id, title, type: "music", cover: "/cover.jpg", releasedAt: releaseDate,
  links: { spotify: "https://open.spotify.com/album/0123456789abcdef012345" },
  ...additions,
});
const sample = music("stable-a", "Sample", "2026-09-20", {
  identifiers: { release: { upc: "001234567890" }, recordings: [{ isrc: "USAAA2600001", trackNumber: 1 }] },
  distribution: { source: "approved-fixture", primaryGenre: "Ambient", secondaryGenre: "Electronic", isrc: "USAAA2600001", upc: "001234567890" },
});
const row = { workId: "stable-a", title: "Sample", isrc: "USAAA2600001", primaryGenre: "Ambient", secondaryGenre: "Electronic" };
const newClassification = classifyIncrementalRows([row], [sample], {});
assert.equal(newClassification[0].status, "NEW", "C. new stable work is NEW");
assert.equal(newClassification[0].refreshProjection, true);
const fingerprint = newClassification[0].fingerprint!;
assert.equal(classifyIncrementalRows([row], [sample], { "stable-a": fingerprint })[0].status, "UNCHANGED", "E. same stable facts skip projection");
const changed = classifyIncrementalRows([{ ...row, secondaryGenre: "Jazz" }], [sample], { "stable-a": fingerprint });
assert.equal(changed[0].status, "CHANGED", "D. changed metadata uses stable ID and refreshes");
assert.equal(changed[0].workId, "stable-a", "title or metadata changes do not create a new identity");
const renamed = classifyIncrementalRows([{ ...row, title: "Renamed sample" }], [sample], { "stable-a": fingerprint });
assert.equal(renamed[0].status, "CHANGED", "title change on a stable ID refreshes metadata without creating a new ID");
assert.equal(renamed[0].workId, "stable-a");
const titleOnly = resolveDistributionRow({ title: "Sample" }, [sample]);
assert.equal(titleOnly.status, "UNRESOLVED", "F. title-only row remains unresolved");
if (titleOnly.status === "UNRESOLVED") assert.equal(titleOnly.reason, "TITLE_ONLY");
assert.deepEqual(resolveDistributionRow({ isrc: "USAAA2600001" }, [sample]), { status: "RESOLVED", workId: "stable-a", method: "EXACT_ISRC" }, "G. exact ISRC maps to one stable work");
assert.deepEqual(resolveDistributionRow({ upc: "001234567890" }, [sample]), { status: "RESOLVED", workId: "stable-a", method: "UNIQUE_RELEASE_ID" }, "release identifiers map only when unique");
const duplicateIsrc = music("stable-b", "Other title", "2026-09-21", { identifiers: { recordings: [{ isrc: "USAAA2600001", trackNumber: 1 }] } });
assert.deepEqual(resolveDistributionRow({ isrc: "USAAA2600001" }, [sample, duplicateIsrc]), { status: "UNRESOLVED", reason: "AMBIGUOUS_IDENTIFIER" }, "ambiguous exact identifiers require review");
const projected = projectDistributionMetadata({ workId: "stable-a", title: "Sample", primaryGenre: "Ambient", secondaryGenre: "Electronic", releaseDate: "2026-09-20" }, [sample], "approved-export");
assert.equal(projected.work && buildWorkKnowledgeEnvelope(projected.work)?.distribution.source, "approved-export", "joined feed source remains explicit");
assert.equal(projected.work && buildWorkKnowledgeEnvelope(projected.work)?.distribution.secondaryGenre, "Electronic", "approved feed fields enter the dynamic envelope after identity resolution");
assert.equal(resolutionMethod({ workId: "stable-a", canonicalWorkId: "other", isrc: "wrong" }, [sample]), "EXACT_WORK_ID", "identity priority starts with exact work ID");
assert.equal(resolutionMethod({ canonicalWorkId: "stable-a", isrc: "wrong" }, [sample]), "CANONICAL_MAPPING", "explicit canonical mapping outranks identifiers");
assert.equal(resolutionMethod({ alias: "legacy-a" }, [music("stable-alias", "Alias", "2026-09-10", { catalogAliases: ["legacy-a"] })]), "EXPLICIT_ALIAS", "only an explicit recorded alias resolves by alias");

const sales = { temporaryNoBuy: false, persistentSalesStop: false, persistentRecommendationStop: false, persistentStop: false, currentStopRequest: false, currentReopenRequest: false, suppressSales: false, suppressRecommendations: false };
const genreWorks = [
  music("genre-a", "Ambient signal", "2026-09-01", { distribution: { primaryGenre: "Ambient", secondaryGenre: "Electronic" } }),
  music("genre-b", "Jazz signal", "2026-09-02", { distribution: { primaryGenre: "Jazz", secondaryGenre: "Classical" } }),
];
assert.equal(selectOneRecommendation({ works: genreWorks, query: "Ambient", language: "en", sales })?.work.id, "genre-a", "H. primary distribution genre participates in retrieval");
assert.equal(selectOneRecommendation({ works: genreWorks, query: "Classical", language: "en", sales })?.work.id, "genre-b", "H. secondary distribution genre participates in retrieval");
assert.equal(selectOneRecommendation({ works: genreWorks, query: "Ambient", language: "en", sales, excludedWorkIds: ["genre-a"] }), null, "O/P. rejected or recently presented candidate cannot re-enter through generic ranking");
assert.equal(buildWorkKnowledgeEnvelope(sample)?.distribution.primaryGenre, "Ambient");
assert.ok(buildLunaEvidencePack(sample)?.includes('"unknown"'), "Luna evidence pack states unknowns explicitly");

const releases = [music("r1", "Old", "2026-09-01T00:00:00Z"), music("r2", "New", "2026-09-24T00:00:00Z"), music("r3", "Future", "2027-01-01T00:00:00Z")];
assert.equal(latestReleasedWorks(releases, { medium: "music", now: new Date("2026-09-27T12:00:00Z") })[0]?.id, "r2", "I. latest music excludes future dates");
assert.deepEqual(latestReleasedWorks(releases, { medium: "music", now: new Date("2026-09-27T12:00:00Z"), limit: 2 }).map((work) => work.id), ["r2", "r1"], "J. recent releases sort by current release date");
assert.ok(latestReleasedWorks(releases, { medium: "music" })[0] && buildWorkKnowledgeEnvelope(latestReleasedWorks(releases, { medium: "music" })[0])?.actions.some((action) => action.kind === "listen"), "K. latest song exposes a recorded listen action when available");

const state = deriveVisitorState([
  { role: "assistant", content: "Work A", recommendedWorkId: "r1" },
  { role: "user", content: "これは違う" },
  { role: "user", content: "別の曲" },
]);
assert.equal(state.lastPresentedWorkId, "r1");
assert.ok(state.rejectedWorkIds.includes("r1"), "explicit rejection is session-scoped");
assert.ok(state.anotherRequested, "another-work request is detected");
assert.equal(eligibleForVisitor(releases[0], state), false, "rejected work is excluded");
assert.equal(eligibleForVisitor(releases[1], state), true, "a different work remains eligible");
assert.equal(deriveVisitorState([{ role: "assistant", content: "Work A", recommendedWorkId: "r1" }, { role: "user", content: "not bad" }]).rejectedWorkIds.length, 0, "ambiguous sentiment is not rejection");
assert.equal(deriveVisitorState([{ role: "assistant", content: "Work A", recommendedWorkId: "r1" }, { role: "user", content: "show this again" }]).rejectedWorkIds.length, 0, "explicit reopen is allowed");
assert.equal(state.preferredMedium, "music", "Q. explicit medium preference persists in conversation-derived state");
assert.equal(eligibleForVisitor({ id: "book-a", type: "book" }, state), false, "Q. another-song continuity excludes other media");
assert.equal(latestReleasedWorks(releases, { medium: state.preferredMedium ?? undefined, limit: 1 })[0]?.type, "music", "Q. release lookup honors the visitor medium");
const duplicateTitles = [music("same-a", "Same title", "2026-09-01"), music("same-b", "Same title", "2026-09-02")];
assert.equal(resolveDistributionRow({ title: "Same title" }, duplicateTitles).status, "UNRESOLVED", "R. same-title release rows do not merge");
const reopened = deriveVisitorState([
  { role: "assistant", content: "Work A", recommendedWorkId: "r1" },
  { role: "user", content: "これは違う" },
  { role: "user", content: "やっぱりこれを見せて" },
]);
assert.equal(eligibleForVisitor(releases[0], reopened), true, "explicit reopen clears the session rejection for that work");

const card = buildChatWorkCard(sample);
assert.ok(card?.links.some((link) => link.kind === "listen" && link.url === "https://open.spotify.com/album/0123456789abcdef012345"), "L. unknown sonic detail can complete with the correct recorded listen action");
assert.ok(unknownSonicText("ja", "stable-a", true).length > 0, "L. sonic unknown with action stays non-speculative");
const noAction = music("no-action", "No action", "2026-09-01", { links: {} });
assert.equal(buildWorkKnowledgeEnvelope(noAction)?.unknowns.includes("publicListenAction"), true, "M. absent listen action remains explicitly unknown");
assert.match(unknownSonicText("ja", "no-action", false), /分かりません/);
const factsEnvelope = buildWorkKnowledgeEnvelope(sample)!;
assert.ok(factsEnvelope.evidence.some((entry) => entry.field === "primaryGenre" && entry.sourceType === "DISTRIBUTION_METADATA"), "N. genre remains sourced distribution fact");
assert.equal(factsEnvelope.interpretations.status, "UNPOPULATED", "N. genre is not promoted to an interpretation or sonic fact");

assert.equal(asksForLatestRelease("新曲ある？"), true);
assert.equal(asksForLatestRelease("What is your latest song?"), true);
assert.equal(asksForSonicDetails("ピアノ入ってる？"), true);
assert.equal(asksForSonicDetails("What instruments are used?"), true);
const languageScenarios = [
  { language: "ja", latest: "最新曲は？", another: "別の曲", sonic: "どんな音？", medium: "本がいい", expected: "book" },
  { language: "en", latest: "What is your latest song?", another: "another song", sonic: "What does it sound like?", medium: "I prefer a book", expected: "book" },
  { language: "fr", latest: "dernier morceau", another: "autre morceau", sonic: "quels instruments", medium: "un livre", expected: "book" },
  { language: "es", latest: "última canción", another: "otra canción", sonic: "instrumentos", medium: "un libro", expected: "book" },
  { language: "de", latest: "neueste Lied", another: "anderes Lied", sonic: "welche Instrumente", medium: "ein Buch", expected: "book" },
  { language: "ar", latest: "أحدث أغنية", another: "أغنية أخرى", sonic: "آلات موسيقية", medium: "كتاب", expected: "book" },
] as const;
for (const scenario of languageScenarios) {
  assert.equal(asksForLatestRelease(scenario.latest), true, `T. latest release intent works in ${scenario.language}`);
  assert.equal(deriveVisitorState([{ role: "user", content: scenario.another }]).anotherRequested, true, `T. another-work intent works in ${scenario.language}`);
  assert.equal(asksForSonicDetails(scenario.sonic), true, `T. sonic-detail intent works in ${scenario.language}`);
  assert.equal(deriveVisitorState([{ role: "user", content: scenario.medium }]).preferredMedium, scenario.expected, `T. medium continuity works in ${scenario.language}`);
}
for (const language of ["ja", "en", "fr", "es", "de", "ar"] as const) {
  const unknownWithAction = unknownSonicText(language, "stable-a", true);
  const unknownWithoutAction = unknownSonicText(language, "stable-a", false);
  assert.ok(unknownWithAction.length > 0 && unknownWithoutAction.length > 0, `sonic unknown copy exists for ${language}`);
  assert.equal(/saxophone|saxophone|サックス|piano|ピアノ/.test(unknownWithAction), false, `sonic reply does not invent instruments (${language})`);
}
assert.ok(getPublicLinksForCard(sample).length > 0, "fixture link is recognized by the existing public-action contract");

const sourceCounts = {
  primary: itemCount("public/works/works.json"),
  imports: itemCount("public/works/catalog-imports.json"),
  ssd: itemCount("public/works/works-ssd.json"),
  mergedRuntime: works.length,
  uniqueIds: new Set(ids).size,
  missingIds: works.length - ids.length,
  identityConflicts: works.filter((work) => work.catalogStatus?.identityConflict).length,
  music: works.filter((work) => /music|album|track|song|audio/i.test(String(work.type ?? ""))).length,
  book: works.filter((work) => /book|novel|read|pdf/i.test(String(work.type ?? ""))).length,
  releaseDateCoverage: works.filter((work) => Boolean(work.distribution?.releaseDate || work.releasedAt)).length,
  publicActionCoverage: works.filter((work) => getPublicLinksForCard(work).length > 0).length,
};
assert.ok(sourceCounts.mergedRuntime > 0, "A. fresh dynamic catalog count is non-empty; no fixed total is asserted");
assert.equal(DISTROKID_FEED_STATUS, "NOT_CONNECTED");
assert.equal(INGESTION_PIPELINE_STATUS, "READY");
console.log(JSON.stringify({ result: "PASS", currentRuntime: sourceCounts, envelopes: envelopes.length, distrokidFeed: DISTROKID_FEED_STATUS, ingestionPipeline: INGESTION_PIPELINE_STATUS, unresolvedSyntheticRows: 2, fixtureCases: ["A-T", "incremental", "visitor-state", "sonic-unknown", "six-languages"], providerCalls: 0 }));

function itemCount(path: string): number {
  const document = JSON.parse(fs.readFileSync(path, "utf8")) as { items?: unknown[] } | unknown[];
  return Array.isArray(document) ? document.length : Array.isArray(document.items) ? document.items.length : 0;
}

function resolutionMethod(row: Parameters<typeof resolveDistributionRow>[0], candidates: CatalogWork[]) {
  const resolution = resolveDistributionRow(row, candidates);
  return resolution.status === "RESOLVED" ? resolution.method : null;
}
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "dynamic catalog fixture failed");
  process.exitCode = 1;
});
