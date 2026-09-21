import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { mergeWorksCatalog, type CatalogWork } from "../src/lib/mergeWorksCatalog";
import { loadMergedWorksServer } from "../src/lib/loadMergedWorksServer";
import { projectExhibitionWorks } from "../src/lib/exhibition-projection";
import { ORACLE_SONG_MAP } from "../src/lib/oracle-song";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");
const readJson = <T>(relativePath: string): T => JSON.parse(read(relativePath)) as T;
const today = "2026-09-21";

async function main() {
const fixtureWorks: CatalogWork[] = [
  { id: "released-a", title: "Same display title", type: "music", releasedAt: "2026-01-01", cover: "/a.jpg", links: { spotify: "https://open.spotify.com/album/a" } },
  { id: "released-b", title: "Same display title", type: "music", releasedAt: "2026-01-02", cover: "/b.jpg", links: { spotify: "https://open.spotify.com/album/b" } },
  { id: "future", title: "Future", type: "music", releasedAt: "2026-12-01", cover: "/future.jpg" },
  { id: "unknown", title: "Unknown", type: "music", cover: "/unknown.jpg" },
  { id: "conflict", title: "Conflict", type: "music", releasedAt: "2026-01-01", cover: "/conflict.jpg", catalogStatus: { identityConflict: true } },
  {
    id: "safe-editorial",
    title: "Safe editorial",
    type: "music",
    releasedAt: "2026-01-01",
    cover: "/safe.jpg",
    tags: ["genre:ambient", "internal:campaign", "ssd-private"],
    links: { spotify: "https://open.spotify.com/album/safe", hyperfollow: "https://distrokid.com/hyperfollow/private" },
    matchInfo: { summary: "MV映像イメージ: this must not be public" },
    ssd: { tracks: [{ notes: "Shorts strategy must not be public" }] },
  },
];
const fixture = projectExhibitionWorks(
  fixtureWorks,
  [{ workId: "safe-editorial", summaryJa: "記録済みの公開編集要約。" }],
  today,
);

assert.deepEqual(
  fixture.works.map((work) => work.id),
  ["released-a", "released-b", "safe-editorial"],
  "title-only rows must remain separate; released non-conflict works must be displayed",
);
assert.equal(fixture.coverage.explicitReleasedWorks, 4);
assert.equal(fixture.coverage.excludedFutureOrUnreleased, 1);
assert.equal(fixture.coverage.excludedIdentityConflict, 1);
assert.equal(fixture.coverage.unknownReleaseState, 1);
assert.equal(fixture.coverage.missingFromExhibitionReleasedWorks, 0);
const safeFixture = fixture.works.find((work) => work.id === "safe-editorial");
assert.equal(safeFixture?.description, "記録済みの公開編集要約。");
assert.deepEqual(safeFixture?.tags, ["genre:ambient"]);
assert.deepEqual(safeFixture?.links, { spotify: "https://open.spotify.com/album/safe" });
assert.equal(/MV映像イメージ|Shorts strategy|hyperfollow/i.test(JSON.stringify(safeFixture)), false, "internal/raw source fields must not enter the exhibition projection");

const titleOnly = mergeWorksCatalog(
  [{ id: "primary", title: "Same", type: "music" }],
  [{ id: "secondary", title: "Same", type: "music" }],
);
assert.equal(titleOnly.length, 2, "title equality must not merge exhibition identities");
const exactId = mergeWorksCatalog(
  [{ id: "same-id", title: "Primary", type: "music" }],
  [{ id: "same-id", title: "Secondary", type: "music" }],
);
assert.equal(exactId.length, 1, "exact work ID may merge identities");

const canonical = await loadMergedWorksServer();
const actual = projectExhibitionWorks(canonical, undefined, today);
const imports = readJson<{ items: Array<{ id: string }> }>("public/works/catalog-imports.json").items;
const canonicalIds = new Set(canonical.map((work) => String(work.id)));
assert.ok(imports.every((work) => canonicalIds.has(work.id)), "catalog imports must be present in the canonical server projection");
assert.equal(actual.coverage.missingFromExhibitionReleasedWorks, 0, "all non-conflicted explicitly released works must reach exhibition");
assert.equal(new Set(actual.works.map((work) => work.id)).size, actual.works.length, "exhibition work IDs must remain unique");
assert.equal(actual.works.every((work) => !!work.id), true, "stable workId is required for each exhibition detail link");
assert.equal(/MV映像イメージ|Shorts strategy|promotion notes|localCover|hyperfollow_url/i.test(JSON.stringify(actual.works)), false, "actual exhibition projection must not leak raw/internal notes");

const exhibitionPage = read("src/pages/exhibition.tsx");
assert.match(exhibitionPage, /\/works\/\$\{encodeURIComponent\(String\(work\.id\)\)\}/, "detail links must use stable workId");
assert.equal(exhibitionPage.includes("https://open.spotify.com/${"), false, "the page must not infer Spotify URLs from cover metadata");
assert.equal(exhibitionPage.includes("https://www.amazon.co.jp/dp/${"), false, "the page must not manufacture Amazon URLs from tags");

const oraclePage = read("src/app/oracle/page.tsx");
const omikujiPage = read("src/app/oracle/omikuji/page.tsx");
const sitemap = read("src/app/sitemap.ts");
const oracleClient = read("src/app/oracle/omikuji/Client.tsx");
const dailyOracle = read("src/app/api/cron/daily-oracle/route.ts");
const todayPick = read("src/app/api/todays-pick/route.ts");
assert.match(oraclePage, /redirect\("\/"\)/, "/oracle must remain redirected");
assert.match(omikujiPage, /占い完全撤退（2026-06 リノベ）/, "/oracle/omikuji must retain its explicit inactive decision");
assert.match(omikujiPage, /redirect\("\/"\)/, "/oracle/omikuji must remain redirected");
assert.equal(sitemap.includes("${base}/oracle/omikuji"), false, "inactive omikuji must remain excluded from sitemap");
assert.match(oracleClient, /loadMergedWorksClient/, "retained Oracle client is legacy and must not be treated as the active projection");
assert.match(dailyOracle, /STRIPE_ORACLE_PRICE_ID/, "daily Oracle stays a separate untouched subscription candidate");
assert.match(todayPick, /loadMergedWorksServer/, "TodaysPick must retain the canonical server loader");

const unresolvedOracleMappings = Object.entries(ORACLE_SONG_MAP)
  .filter(([, pick]) => !canonicalIds.has(pick.id))
  .map(([rank]) => rank);
assert.equal(unresolvedOracleMappings.length, 0, "legacy fixed Oracle mappings must resolve by exact work ID when inspected");
assert.equal(/find\([^\n]*title|filter\([^\n]*title/.test(read("src/lib/oracle-song.ts")), false, "Oracle mapping may not resolve a work by title");

console.log(JSON.stringify({
  status: "PASS",
  fixturesPassed: 20,
  canonicalRuntimeWorks: actual.coverage.canonicalRuntimeWorks,
  explicitReleasedWorks: actual.coverage.explicitReleasedWorks,
  displayedExhibitionWorks: actual.coverage.displayedWorks,
  excludedFutureOrUnreleased: actual.coverage.excludedFutureOrUnreleased,
  excludedIdentityConflict: actual.coverage.excludedIdentityConflict,
  unknownReleaseState: actual.coverage.unknownReleaseState,
  missingFromExhibitionReleasedWorks: actual.coverage.missingFromExhibitionReleasedWorks,
  oracleCurrentState: "ORACLE_INACTIVE_BY_DESIGN",
  oracleMappingType: "LEGACY_FIXED_EXACT_WORK_ID",
  unresolvedOracleMappings,
  dailyOracleConnected: false,
  productionParity: "UNVERIFIED",
  networkRequests: 0,
}, null, 2));
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
