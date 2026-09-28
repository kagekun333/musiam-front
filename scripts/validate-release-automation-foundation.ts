import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { classifyAppleArtistLookup, nextUpcomingRelease, resolveReleaseState } from "../src/lib/release-automation";
import { buildWorkKnowledgeEnvelope } from "../src/lib/chat-release-knowledge";
import { parseCanonicalReleaseDocument } from "../src/lib/distrokid-release-ingestion";
import { projectResolvedDistroKidRelease } from "../src/lib/distrokid-catalog-projection";
import { releaseTiming } from "../src/lib/release-status";
import { classifyAppleArtistResults, stableAppleWorkId } from "./apple-catalog-diff.mjs";
import { resolveAppleUpcResult } from "./apple-upc-resolver.mjs";

async function main() {
const here = process.cwd();
const require = createRequire(path.join(process.cwd(), "package.json"));
const capture = require("./tools/distrokid-capture-extension/capture.js");
const html = (name: string) => fs.readFileSync(path.join(here, "tools/distrokid-capture-extension/fixtures", name), "utf8");

const human = [
  { releaseSource: "distrokid", sourceReleaseId: "D631F8A9-14A5-40E7-867D01081E026EF1", title: "Ⅶ", artist: "ABI伯爵", releaseDate: null, uploadDate: null, label: "Hakusyaku Lab", primaryGenre: "Electronic", secondaryGenre: null, upc: "700989739020", isrc: "QT6J32604414", albumuuid: "D631F8A9-14A5-40E7-867D01081E026EF1", artworkRef: null, publicUrls: ["https://open.spotify.com/album/1qsMiOzudMSgKIneEZPofH", "https://distrokid.com/hyperfollow/abi35/n5dpul17z6g"], sourceObservedAt: null },
  { releaseSource: "distrokid", sourceReleaseId: "22859F40-B4F4-4488-B13E3EC3991CCE09", title: "キャンバスの語源", artist: "ABI伯爵", releaseDate: "2026-10-02", label: "Hakusyaku Lab", primaryGenre: "J-Pop", secondaryGenre: null, upc: "700574488180", isrc: "QTA2S2650095", albumuuid: "22859F40-B4F4-4488-B13E3EC3991CCE09", artworkRef: null, publicUrls: [], sourceObservedAt: null },
];
assert.equal(releaseTiming(human[0].releaseDate, new Date("2026-09-27T12:00:00Z")), "UNKNOWN");
assert.equal(resolveReleaseState({ release: human[0], asOf: new Date("2026-09-27T12:00:00Z") }).state, "PUBLIC_RELEASE_DATE_PENDING");
assert.equal(resolveReleaseState({ release: human[0], publicReleaseDate: "2026-09-27", appleCollectionId: "7001", asOf: new Date("2026-09-27T12:00:00Z") }).state, "RELEASED_RESOLVED", "a resolved Apple public date supplies released status");
assert.equal(resolveReleaseState({ release: human[0], publicReleaseDate: "2026-10-02", asOf: new Date("2026-09-27T12:00:00Z") }).state, "PUBLIC_RELEASE_DATE_PENDING", "public future dates cannot establish upcoming status");
assert.equal(releaseTiming(human[1].releaseDate, new Date("2026-09-27T12:00:00Z")), "UPCOMING");
assert.equal(resolveReleaseState({ release: human[1], asOf: new Date("2026-09-27T12:00:00Z") }).state, "UPCOMING");
const nextUpcoming = nextUpcomingRelease(human, new Date("2026-09-27T12:00:00Z"));
assert.ok(nextUpcoming);
assert.equal(nextUpcoming.title, "キャンバスの語源");
assert.equal(nextUpcomingRelease(human, new Date("2026-10-02T12:00:00Z")), null, "release day is not upcoming in Tokyo date");

const sameDayCollection = (collectionId: number): any => ({ wrapperType: "collection", artistId: 1811526635, collectionId, collectionName: "Same Day", artistName: "ABI伯爵", releaseDate: "2026-09-27T00:00:00Z", collectionViewUrl: "https://music.apple.com/jp/album/same-day/" + collectionId, artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/Music/item/100x100bb.jpg", trackCount: 1 });
const currentIds = new Set(["apple-album-10"]);
const appleRows = [sameDayCollection(10), sameDayCollection(11), sameDayCollection(12)];
const diff = classifyAppleArtistResults(appleRows, currentIds, 1811526635, 200);
assert.deepEqual(diff.existingIds, ["apple-album-10"]);
assert.deepEqual(diff.proposedAffectedIds, ["apple-album-11", "apple-album-12"], "same-day and delayed-indexed releases are found by stable ID set difference");
assert.equal(classifyAppleArtistResults(Array(200).fill(null).map((_, index) => sameDayCollection(index + 100)), currentIds, 1811526635, 200).capWarning, "APPLE_ARTIST_LOOKUP_LIMIT_REACHED_200");
assert.equal(diff.completeness, "NOT_PROVEN");
assert.deepEqual(classifyAppleArtistLookup({ resultCount: 200, requestedLimit: 200 }), { completeness: "NOT_PROVEN", sourceTruncated: true, warning: "APPLE_ARTIST_LOOKUP_LIMIT_REACHED_200" });
assert.equal(stableAppleWorkId("not-numeric"), null);
assert.equal(stableAppleWorkId(123), "apple-album-123");
const appliedDiff = classifyAppleArtistResults(appleRows, new Set([...currentIds, "apple-album-11", "apple-album-12"]), 1811526635);
assert.equal(appliedDiff.newItems.length, 0, "rerunning the same ID set is idempotent");

const appleResult = sameDayCollection(7001);
appleResult.collectionName = "VII - Single";
appleResult.primaryGenreName = "Alternative";
appleResult.tracks = [{ wrapperType: "track", trackName: "VII", isrc: "QT6J32604414", previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview123.m4a" }];
const upcResolution = resolveAppleUpcResult({ expectedArtist: "ABI伯爵", expectedIsrc: "QT6J32604414", expectedReleaseDate: null }, [appleResult]);
assert.equal(upcResolution.status, "RESOLVED", "exact UPC result with expected artist/date/ISRC resolves");
assert.ok(upcResolution.collection);
assert.equal(upcResolution.collection.collectionId, "7001");
assert.equal(resolveAppleUpcResult({ expectedArtist: "ABI伯爵" }, [sameDayCollection(1), sameDayCollection(2)]).status, "AMBIGUOUS");
assert.equal(resolveAppleUpcResult({ expectedArtist: "ABI伯爵" }, []).status, "NO_RESULT");
assert.equal(resolveAppleUpcResult({ expectedArtist: "Other Artist" }, [sameDayCollection(1)]).status, "ARTIST_MISMATCH");
assert.equal(resolveAppleUpcResult({ expectedArtist: "ABI伯爵", expectedIsrc: "wrong" }, [appleResult]).status, "ISRC_MISMATCH");
assert.equal(human[0].releaseDate, null, "the real VII DistroKid capture does not fabricate its missing release date");
assert.equal(human[0].uploadDate, null, "the real VII DistroKid capture keeps upload date optional");
assert.equal(resolveReleaseState({ release: human[0], publicReleaseDate: "2026-09-27", asOf: new Date("2026-09-27T12:00:00Z"), appleCollectionId: "7001" }).stableWorkId, "apple-album-7001");
assert.equal(resolveReleaseState({ release: human[0], publicReleaseDate: "2026-09-27", asOf: new Date("2026-09-27T12:00:00Z"), catalogWork: { id: "apple-album-7001" } }).state, "CATALOG_ACTIVE");

const myMusic = capture.fromHtml(html("my-music.html"), "https://distrokid.com/mymusic", "2026-09-27T00:00:00Z");
assert.equal(myMusic.releases.length, 2, "My Music capture keeps each visible same-origin release row");
assert.deepEqual(myMusic.releases.map((row: { visibleStatus: string | null }) => row.visibleStatus), ["Live", "Upcoming"]);
// Sanitized URL placeholder only; the supplied capture evidence did not include the real VII pathname.
const sanitizedUuid = "aaaaaaaa-bbbb-cccc-dddddddddddddddd";
const detail = capture.fromHtml(html("release-detail.html"), `https://distrokid.com/album/${sanitizedUuid}`, "2026-09-27T00:00:00Z").releases[0];
assert.equal(detail.title, "Example Release");
assert.equal(detail.artist, "Synthetic Artist");
assert.equal(detail.releaseDate, "2026-01-03", "month-name date parsing is timezone independent");
assert.equal(detail.uploadDate, "2025-12-20");
assert.equal(detail.label, "Example Label");
assert.equal(detail.upc, "123456789012");
assert.equal(detail.isrc, "USABC2600001");
assert.equal(detail.albumuuid, sanitizedUuid, "valid release UUID is extracted from the sanitized detail path");
assert.equal(detail.visibleStatus, "Live");
assert.deepEqual(detail.publicUrls, [
  "https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy",
  "https://distrokid.com/hyperfollow/exampleartist/example-release",
  "https://music.apple.com/us/album/example-release/1234567890",
  "https://music.youtube.com/watch?v=abcdefghijk",
]);
assert.equal(detail.publicUrls.some((url: string) => url.includes("ref=globalmenu")), false, "generic HyperFollow navigation is rejected");
assert.equal(JSON.stringify(detail).includes("synthetic-url-secret"), false, "public URL tracking queries are stripped");
const domText = (value: string) => ({ nodeType: 3, nodeValue: value });
const domElement = (tag: string, attrs: Record<string, string> = {}, children: any[] = [], value?: string) => ({
  nodeType: 1, tagName: tag.toUpperCase(), childNodes: children, hidden: Object.hasOwn(attrs, "hidden"), value,
  getAttribute: (name: string) => attrs[name] ?? null,
  hasAttribute: (name: string) => Object.hasOwn(attrs, name),
  getClientRects: () => Object.hasOwn(attrs, "hidden") || attrs["aria-hidden"] === "true" || /display\s*:\s*none/.test(attrs.style ?? "") ? [] : [{}],
});
const fakeDocument = {
  defaultView: { getComputedStyle: (node: any) => ({ display: /display\s*:\s*none/.test(node.getAttribute("style") ?? "") ? "none" : "block", visibility: "visible", opacity: "1" }) },
  documentElement: domElement("html", {}, [domElement("body", {}, [
    domElement("main", {}, [domElement("div", {}, [domElement("span", {}, [domText("Release title")]), domElement("strong", {}, [domText("Document Sample")])]), domElement("label", { for: "artist" }, [domText("Artist")]), domElement("input", { id: "artist", value: "Document Artist" }, [], "Document Artist"), domElement("div", { hidden: "" }, [domElement("span", { "data-field": "title" }, [domText("synthetic-hidden-dom-value")])])])])]),
};
const documentCapture = capture.fromDocument(fakeDocument, `https://distrokid.com/releases/${sanitizedUuid}`, "2026-09-27T00:00:00Z").releases[0];
assert.equal(documentCapture.title, "Document Sample", "live capture reads rendered neighboring label-value elements");
assert.equal(documentCapture.artist, "Document Artist", "live capture resolves visible form labels");
assert.equal(JSON.stringify(documentCapture).includes("synthetic-hidden-dom-value"), false, "live capture omits hidden DOM descendants");
const dateDocument = {
  defaultView: fakeDocument.defaultView,
  documentElement: domElement("html", {}, [domElement("body", {}, [domElement("main", {}, [
    domElement("div", {}, [domElement("span", {}, [domText("アップロード日：")]), domElement("span", {}, [domText("2026年9月4日")])]),
    domElement("div", {}, [domText("リリース日："), domElement("span", {}, [domText("2026年9月27日")])]),
    domElement("div", {}, [domElement("span", {}, [domText("アップロード日：")]), domText("2026年9月4日")]),
    domElement("div", {}, [domText("リリース日：2026年9月27日")]),
    domElement("div", {}, [domText("2026年10月3日")]),
    domElement("div", {}, [domText("別の日付：2026年10月4日")]),
  ])])]),
};
const serializedDateCapture = capture.fromDocument(dateDocument, "https://distrokid.com/dashboard/album/").releases[0];
assert.equal(serializedDateCapture.uploadDate, "2026-09-04", "live DOM serialization keeps label/value structure for bounded upload dates");
assert.equal(serializedDateCapture.releaseDate, "2026-09-27", "live DOM serialization keeps label/value structure for bounded release dates");
const dashboardDetail = capture.fromHtml(html("dashboard-album.html"), "https://distrokid.com/dashboard/album/", "2026-09-27T00:00:00Z").releases[0];
assert.equal(dashboardDetail.title, "Dashboard Sample", "dashboard album title class/data attribute is allowlisted");
assert.equal(dashboardDetail.artist, "Dashboard Artist", "dashboard artist header class is allowlisted");
assert.equal(dashboardDetail.releaseDate, "2026-02-14");
assert.equal(dashboardDetail.uploadDate, "2026-02-01");
assert.equal(dashboardDetail.label, "Example Dashboard Label");
assert.equal(dashboardDetail.upc, "123456789012", "UPC is accepted only inside the observed UPC class");
assert.equal(dashboardDetail.isrc, "USXYZ2600003");
assert.equal(dashboardDetail.primaryGenre, "Indie Folk");
assert.equal(dashboardDetail.albumuuid, "cccccccc-dddd-eeee-ffffffffffffffff", "dashboard URL without an ID can use a visible same-origin album link");
assert.deepEqual(dashboardDetail.publicUrls, ["https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy"]);
const dashboardDiagnostic = capture.diagnoseHtml(html("dashboard-album.html"), "https://distrokid.com/dashboard/album/");
assert.equal(dashboardDiagnostic.visibleLabelSnippets.some((row: { field: string }) => row.field === "releaseDate"), true);
assert.equal(dashboardDiagnostic.dataAttributeNames.includes("data-album-genre-primary"), true);
const japaneseDashboard = capture.fromHtml(html("dashboard-album-japanese.html"), "https://distrokid.com/dashboard/album/?id=D631F8A9-14A5-40E7-867D01081E026EF1", "2026-09-27T00:00:00Z").releases[0];
assert.equal(japaneseDashboard.title, "Ⅶ", "canonical display title preserves the source exact representation");
assert.equal(japaneseDashboard.title.normalize("NFKC"), "VII", "comparison may normalize Roman numeral compatibility characters");
assert.equal(japaneseDashboard.artist, "ABI伯爵");
assert.equal(japaneseDashboard.isrc, "QT6J32604414");
assert.equal(japaneseDashboard.primaryGenre, "Electronic");
assert.equal(japaneseDashboard.albumuuid, "D631F8A9-14A5-40E7-867D01081E026EF1");
assert.equal(japaneseDashboard.label, "Hakusyaku Lab");
assert.equal(japaneseDashboard.releaseDate, "2026-09-27");
assert.equal(japaneseDashboard.uploadDate, "2026-09-04");
assert.equal(japaneseDashboard.upc, "700989739020");
assert.deepEqual(japaneseDashboard.publicUrls, [
  "https://open.spotify.com/album/1qsMiOzudMSgKIneEZPofH",
  "https://distrokid.com/hyperfollow/abi35/n5dpul17z6g",
]);
assert.equal(japaneseDashboard.publicUrls.some((url: string) => url.includes("ref=globalmenu")), false);
const dateStructureFixtures = [
  { name: "label span + value span", markup: `<div><span>アップロード日：</span><span>2026年9月4日</span></div>`, field: "uploadDate", expected: "2026-09-04" },
  { name: "text label + value span", markup: `<div>リリース日：<span>2026年9月27日</span></div>`, field: "releaseDate", expected: "2026-09-27" },
  { name: "label span + text value", markup: `<div><span>リリース日：</span>2026年9月27日</div>`, field: "releaseDate", expected: "2026-09-27" },
  { name: "same-element Japanese label/value", markup: `<div>アップロード日：2026年9月4日</div>`, field: "uploadDate", expected: "2026-09-04" },
];
for (const fixture of dateStructureFixtures) {
  const parsed = capture.fromHtml(`<main>${fixture.markup}</main>`, "https://distrokid.com/dashboard/album/").releases[0];
  assert.equal(parsed[fixture.field], fixture.expected, fixture.name);
}
const unrelatedJapaneseDates = capture.fromHtml(`<main><div>2026年9月4日</div><div>別の日付：2026年9月27日</div></main>`, "https://distrokid.com/dashboard/album/").releases[0];
assert.equal(unrelatedJapaneseDates.uploadDate, null, "unlabeled dates are not assigned to upload date");
assert.equal(unrelatedJapaneseDates.releaseDate, null, "unrecognized labels do not assign unrelated dates");
const pairedJapaneseDates = capture.fromHtml(`<main><section><span>アップロード日：</span><span>2026年9月4日</span><span>参考日：2026年10月2日</span></section><section><span>リリース日：</span><span>2026年9月27日</span><span>別の日付：2026年10月3日</span></section></main>`, "https://distrokid.com/dashboard/album/").releases[0];
assert.equal(pairedJapaneseDates.uploadDate, "2026-09-04", "multiple dates remain attached to the upload label's immediate bounded value");
assert.equal(pairedJapaneseDates.releaseDate, "2026-09-27", "multiple dates remain attached to the release label's immediate bounded value");
const invalidJapaneseDate = capture.fromHtml(`<div data-field="releaseDate">2026年2月30日</div>`, "https://distrokid.com/dashboard/album/").releases[0];
assert.equal(invalidJapaneseDate.releaseDate, null, "invalid Japanese calendar dates are unavailable, never inferred");
const structured = capture.fromHtml(html("structured-state.html"), "https://distrokid.com/album/bbbbbbbb-cccc-dddd-eeeeeeeeeeeeeeee", "2026-09-27T00:00:00Z").releases[0];
assert.equal(structured.title, "Structured Sample");
assert.equal(structured.artist, "State Artist");
assert.equal(structured.releaseDate, "2026-02-14");
assert.equal(structured.label, "State Label");
assert.equal(structured.upc, "987654321098");
assert.equal(structured.isrc, "USDEF2600002");
assert.equal(structured.primaryGenre, "Indie Pop");
assert.equal(structured.visibleStatus, "Upcoming");
assert.equal(JSON.stringify(structured).includes("private@example.invalid"), false, "structured projection drops non-allowlisted private values");
assert.equal(JSON.stringify(structured).includes("synthetic-state-secret"), false, "structured projection drops secret-shaped values");
assert.equal(capture.fromHtml("<main></main>", "https://distrokid.com/releases/details/cccccccc-dddd-eeee-ffffffffffffffff/edit").releases[0].albumuuid, "cccccccc-dddd-eeee-ffffffffffffffff", "UUID extraction works outside the synthetic /album route shape");
assert.equal(capture.fromHtml("<main></main>", "https://distrokid.com/release?albumuuid=dddddddd-eeee-ffff-aaaaaaaaaaaaaaaa").releases[0].albumuuid, "dddddddd-eeee-ffff-aaaaaaaaaaaaaaaa", "valid UUID query parameter is parsed deterministically");
assert.equal(capture.fromHtml("<main></main>", "https://distrokid.com/dashboard/album/?id=eeeeeeee-ffff-aaaa-bbbbbbbbbbbbbbbb").releases[0].albumuuid, "eeeeeeee-ffff-aaaa-bbbbbbbbbbbbbbbb", "dashboard album ID query is accepted only on the album route");
assert.equal(capture.fromHtml("<main></main>", "https://distrokid.com/dashboard/profile?id=ffffffff-aaaa-bbbb-cccccccccccccccc").releases[0].albumuuid, null, "generic dashboard identity is not misclassified as an album ID");
const noGuess = capture.fromHtml(html("no-value-no-guess.html"), "https://distrokid.com/album/edit", "2026-09-27T00:00:00Z").releases[0];
assert.equal(noGuess.upc, null, "empty or unpaired digits are never guessed as UPC");
assert.equal(noGuess.isrc, null, "invalid/unpaired ISRC text is not captured");
assert.deepEqual(noGuess.publicUrls, [], "generic HyperFollow navigation is excluded");
const diagnostic = capture.diagnoseHtml(html("release-detail.html"), `https://distrokid.com/album/${sanitizedUuid}`);
assert.equal(diagnostic.pathname, `/album/${sanitizedUuid}`);
assert.ok(diagnostic.tags.includes("section"));
assert.ok(diagnostic.safeClasses.includes("metadata-row"));
assert.deepEqual(diagnostic.dataAttributeNames, ["data-track-row", "data-field"]);
assert.equal(Object.hasOwn(diagnostic, "html"), false, "diagnostics do not persist or return page HTML");
const structuredDiagnostic = capture.diagnoseHtml(html("structured-state.html"), "https://distrokid.com/album/details");
assert.equal(structuredDiagnostic.embeddedJsonExists, true);
assert.equal(JSON.stringify(structuredDiagnostic).includes("private@example.invalid"), false, "diagnostic never returns script contents");
const capturedSanitizedUuid = capture.fromHtml(`<div data-field="albumuuid">${sanitizedUuid}</div>`, `https://distrokid.com/album/${sanitizedUuid}`, "2026-09-27T00:00:00Z").releases[0];
assert.equal(capturedSanitizedUuid.albumuuid, sanitizedUuid, "synthetic UUID form is retained as a stable source ID");
const parsedExtensionDoc = parseCanonicalReleaseDocument({ schemaVersion: 1, releases: [detail] });
assert.equal(parsedExtensionDoc[0].albumuuid, detail.albumuuid, "extension output matches canonical importer input");
const edit = capture.fromHtml(html("edit-form.html"), "https://distrokid.com/album/edit", "2026-09-27T00:00:00Z").releases[0];
assert.equal(edit.primaryGenre, "Indie Pop");
assert.equal(edit.secondaryGenre, "Alternative");
const secretFixtureOutput = JSON.stringify(capture.fromHtml(html("secret-fields.html"), "https://distrokid.com/album/edit", "2026-09-27T00:00:00Z"));
for (const secret of ["synthetic-password-never-capture", "synthetic-token-never-capture", "synthetic-cookie-never-capture", "synthetic-payment-never-capture", "synthetic-csrf-never-capture", "synthetic-email-never-capture", "synthetic-hidden-account-content", "synthetic-hidden-artist"]) assert.equal(secretFixtureOutput.includes(secret), false, "sensitive-shaped or hidden page values are not captured");
assert.equal(secretFixtureOutput.includes("password"), false);

const urls = Array.from({ length: 22 }, (_, index) => `https://distrokid.com/album/${String(index + 1).padStart(8, "0")}-1111-4111-8111-111111111111`);
urls.push("https://evil.example/album/33333333-3333-4333-8333-333333333333");
const selection = capture.selectBatchUrls(urls, "https://distrokid.com/mymusic");
assert.equal(selection.urls.length, 20);
assert.equal(selection.truncated, true);
assert.equal(selection.candidateCount, 22);
let fetched = 0;
let delays = 0;
const batch = await capture.captureBatch(urls, "https://distrokid.com/mymusic", async (url: string) => {
  fetched++;
  return { ok: true, url, headers: { get: () => "10" }, text: async () => html("release-detail.html") };
}, async () => { delays++; });
assert.equal(fetched, 20, "batch capture performs no more than 20 same-origin reads");
assert.equal(delays, 19, "batch is rate bounded between requested pages");
assert.equal(batch.failures.length, 0);
assert.equal(batch.sourceTruncated, true);
const visible = capture.visibleLinks({ querySelectorAll: () => [
  { href: urls[0], getAttribute: () => null, getClientRects: () => [{}] },
  { href: urls[1], getAttribute: () => null, getClientRects: () => [] },
  { href: "https://evil.example/album/33333333-3333-4333-8333-333333333333", getAttribute: () => null, getClientRects: () => [{}] },
] }, "https://distrokid.com/mymusic");
assert.deepEqual(visible, [urls[0]], "batch discovery uses visible same-origin links only");

const projected = projectResolvedDistroKidRelease({ release: human[0], apple: {
  collectionId: "7001", title: "VII - Single", artist: "ABI伯爵", releaseDate: "2026-09-27",
  primaryGenreName: "Alternative", collectionViewUrl: "https://music.apple.com/jp/album/vii/7001",
  artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/Music/item/100x100bb.jpg", trackCount: 1,
  tracks: [{ title: "VII", isrc: "QT6J32604414", previewUrl: null }],
} }, new Date("2026-09-27T12:00:00Z"));
assert.ok(projected);
assert.equal(projected.id, "apple-album-7001");
assert.equal(projected.releasedAt, "2026-09-27", "a matched Apple UPC result may supply its public release date when DistroKid date is absent");
assert.ok(projected.distribution);
assert.equal(projected.distribution.appleGenre, "Alternative");
assert.equal(projected.distribution.primaryGenre, "Electronic", "captured DistroKid genre remains authoritative");
assert.equal(projected.distribution.releaseDate, "2026-09-27", "public Apple date is projected as distribution release date only after UPC resolution");
assert.equal(projected.distribution.releaseDateAuthority, "APPLE_PUBLIC_DISTRIBUTION", "Apple date provenance remains explicit in projected Catalog metadata");
assert.equal(buildWorkKnowledgeEnvelope(projected)?.distribution.releaseDateAuthority, "APPLE_PUBLIC_DISTRIBUTION", "knowledge envelope retains public date authority");
const noDistributorGenreProjection = projectResolvedDistroKidRelease({ release: { ...human[0], primaryGenre: null }, apple: {
  collectionId: "7001", title: "VII - Single", artist: "ABI伯爵", releaseDate: "2026-09-27", primaryGenreName: "Alternative",
  collectionViewUrl: "https://music.apple.com/jp/album/vii/7001", artworkUrl: null, trackCount: 1, tracks: [],
} }, new Date("2026-09-27T12:00:00Z"));
assert.equal(noDistributorGenreProjection?.distribution?.primaryGenre, null, "Apple genre is not substituted for missing distributor genre");
assert.equal(projectResolvedDistroKidRelease({ release: human[1], apple: { collectionId: "7002", title: "Canvas", artist: "ABI伯爵", releaseDate: "2026-10-02", primaryGenreName: null, collectionViewUrl: "https://music.apple.com/jp/album/canvas/7002", artworkUrl: null, trackCount: 1, tracks: [] } }, new Date("2026-09-27T12:00:00Z")), null, "upcoming release never projects into Catalog");
assert.equal(projectResolvedDistroKidRelease({ release: human[0], apple: { collectionId: "7003", title: "VII - Single", artist: "ABI伯爵", releaseDate: "2026-10-02", primaryGenreName: null, collectionViewUrl: "https://music.apple.com/jp/album/vii/7003", artworkUrl: null, trackCount: 1, tracks: [] } }, new Date("2026-09-27T12:00:00Z")), null, "a future Apple date cannot establish an upcoming release date");

const schema = JSON.parse(fs.readFileSync(path.join(here, "tools/release-inbox/schema.json"), "utf8"));
assert.equal(schema.properties.releases.maxItems, 20, "inbox schema bounds each batch");
const receiveSource = fs.readFileSync(path.join(here, "tools/release-inbox/receive.mjs"), "utf8");
assert.match(receiveSource, /server\.listen\(PORT, "127\.0\.0\.1"/);
assert.match(receiveSource, /timingSafeEqual/);
assert.match(receiveSource, /parseCanonicalReleaseDocument/);
assert.doesNotMatch(receiveSource, /works\.json|loadMergedWorksServer/);
assert.doesNotMatch(receiveSource, /console\.(?:log|info)\([^\n]*(?:title|artist|upc|token)/i);
const manifest = JSON.parse(fs.readFileSync(path.join(here, "tools/distrokid-capture-extension/manifest.json"), "utf8"));
assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.permissions.includes("cookies"), false);
assert.equal(manifest.permissions.includes("storage"), false);
assert.equal(manifest.content_scripts, undefined, "capture runs only after explicit popup action");

process.stdout.write(`${JSON.stringify({ result: "PASS", appleIdDiff: "PASS", upcResolution: "PASS", releaseStates: "PASS", extensionHtmlFixtures: "PASS", secretNonCapture: "PASS", batch: { maximum: capture.maxBatch, captured: batch.capturedCount, failures: batch.failures.length, truncated: batch.sourceTruncated }, inboxSchema: "PASS", providerCalls: 0, distroKidLogin: 0 })}\n`);
}

void main().catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : "release automation fixture failed"}\n`); process.exitCode = 1; });
