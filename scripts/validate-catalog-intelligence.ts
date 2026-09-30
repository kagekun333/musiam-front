import assert from "node:assert/strict";
import intelligenceJson from "../public/works/work-intelligence.json";
import { applyWorkIntelligence, scoreWorkIntelligenceQuery, type WorkIntelligenceFile } from "../src/lib/catalog-intelligence";
import { loadMergedWorksServer } from "../src/lib/loadMergedWorksServer";
import { resolveCatalogIdentity, selectOneRecommendation, type SalesOptOut } from "../src/lib/chat-recommendation-core";
import type { CatalogWork } from "../src/lib/mergeWorksCatalog";

const openSales: SalesOptOut = {
  temporaryNoBuy: false,
  persistentSalesStop: false,
  persistentRecommendationStop: false,
  persistentStop: false,
  currentStopRequest: false,
  currentReopenRequest: false,
  suppressSales: false,
  suppressRecommendations: false,
};

function byTitle(works: CatalogWork[], title: string): CatalogWork {
  const work = works.find((item) => String(item.title) === title && item.intelligence?.facets?.length);
  assert.ok(work, `Missing intelligent work: ${title}`);
  return work;
}

(async () => {
  const file = intelligenceJson as WorkIntelligenceFile;
  assert.equal(file.schemaVersion, 1);
  assert.ok(file.records.length >= 22);

  const works = await loadMergedWorksServer();
  assert.equal(works.length, 514);

  const danke = byTitle(works, "Danke&Bitte");
  const gorli = byTitle(works, "Görli Garden");
  const brandenburg = byTitle(works, "BRANDENBURGER TOR");
  const sesoko = byTitle(works, "Sesoko Island");

  assert.ok(scoreWorkIntelligenceQuery(danke, "ドイツ語の曲ある？").score > 0);
  assert.ok(scoreWorkIntelligenceQuery(gorli, "German song please").score > 0);
  assert.equal(
    scoreWorkIntelligenceQuery(brandenburg, "ドイツ語の曲ある？").score,
    0,
    "German geography must not be mistaken for German-language when the work is marked instrumental",
  );
  assert.ok(scoreWorkIntelligenceQuery(brandenburg, "ドイツの曲ある？").score > 0);
  assert.ok(scoreWorkIntelligenceQuery(sesoko, "沖縄の曲ある？").score > 0);
  assert.ok(scoreWorkIntelligenceQuery(sesoko, "瀬底島の曲").score > 0);

  const music = works.filter((work) => String(work.type).toLowerCase().includes("music"));
  const german = selectOneRecommendation({
    works: music,
    query: "ドイツ語の曲ある？",
    language: "ja",
    sales: openSales,
  });
  assert.ok(german, "German-language discovery should return a real catalog work");
  assert.ok(["Danke&Bitte", "Görli Garden"].includes(String(german?.work.title)));
  assert.notEqual(String(german?.work.title), "BRANDENBURGER TOR");
  assert.match(german!.reason, /^あります。/);
  assert.doesNotMatch(german!.reason, /catalog metadata/i);

  const okinawa = selectOneRecommendation({
    works: music,
    query: "沖縄の曲ある？",
    language: "ja",
    sales: openSales,
  });
  assert.ok(okinawa, "Okinawa discovery should return a real catalog work");
  assert.ok(scoreWorkIntelligenceQuery(okinawa!.work, "沖縄の曲ある？").score > 0);
  assert.match(okinawa!.reason, /^あります。/);
  assert.doesNotMatch(okinawa!.reason, /catalog metadata/i);

  const languageCases = [
    { query: "フランス語の曲ある？", label: "フランス語" },
    { query: "中国語の曲ある？", label: "中国語" },
    { query: "韓国語の曲ある？", label: "韓国語" },
    { query: "スペイン語の曲ある？", label: "スペイン語" },
    { query: "ポルトガル語の曲ある？", label: "ポルトガル語" },
    { query: "イタリア語の曲ある？", label: "イタリア語" },
    { query: "ラテン語の曲ある？", label: "ラテン語" },
    { query: "古代ギリシャ語の曲ある？", label: "古代ギリシャ語" },
    { query: "アラビア語の曲ある？", label: "アラビア語" },
    { query: "ヒンディー語の曲ある？", label: "ヒンディー語" },
    { query: "ロシア語の曲ある？", label: "ロシア語" },
    { query: "インドネシア語の曲ある？", label: "インドネシア語" },
    { query: "スワヒリ語の曲ある？", label: "スワヒリ語" },
    { query: "ベンガル語の曲ある？", label: "ベンガル語" },
    { query: "英語の曲ある？", label: "英語" },
    { query: "日本語の曲ある？", label: "日本語" },
  ] as const;

  const languageResults: Record<string, string> = {};
  const languageReasons: Record<string, string> = {};
  for (const test of languageCases) {
    const rec = selectOneRecommendation({
      works: music,
      query: test.query,
      language: "ja",
      sales: openSales,
    });
    assert.ok(rec, `Expected real recommendation for ${test.label}`);
    assert.ok(
      rec!.work.intelligence?.facets?.some((facet) => facet.kind === "language" && facet.label === test.label),
      `Selected work must carry the requested language facet: ${test.label}`,
    );
    assert.match(rec!.reason, /^あります。/);
    assert.doesNotMatch(rec!.reason, /catalog metadata/i);
    languageResults[test.label] = String(rec!.work.title);
    languageReasons[test.label] = rec!.reason;
  }

  assert.match(languageReasons["フランス語"], /含む多言語曲/);
  assert.equal(languageResults["中国語"], "赔偿节奏");
  assert.equal(languageResults["韓国語"], "하늘 위로");
  assert.equal(languageResults["イタリア語"], "Madre del Silenzio");
  assert.notEqual(languageResults["ヒンディー語"], "WORLD STRIKE Thirteen Tongues");

  const sameTitleWrongId: CatalogWork = {
    id: "fake-sesoko-id",
    title: "Sesoko Island",
    type: "music",
  };
  const [notEnriched] = applyWorkIntelligence([sameTitleWrongId], file);
  assert.equal(notEnriched.intelligence, undefined, "title equality must never attach intelligence");

  const overlayWork: CatalogWork = {
    id: "apple-album-6801905903",
    title: "風の記憶、久米島",
    type: "music",
  };
  const [enrichedOverlay] = applyWorkIntelligence([overlayWork], file);
  assert.ok(scoreWorkIntelligenceQuery(enrichedOverlay, "沖縄").score > 0, "Apple overlay IDs must receive intelligence");

  assert.equal(
    resolveCatalogIdentity("瀬底島", [sesoko]).status,
    "none",
    "search aliases are discovery aids, never stable identity aliases",
  );

  console.log(JSON.stringify({
    verdict: "CATALOG_INTELLIGENCE_GRAPH_V1=PASS_LOCAL",
    catalogCount: works.length,
    intelligenceRecordCount: file.records.length,
    germanRecommendation: german?.work.title,
    okinawaRecommendation: okinawa?.work.title,
    languageCoverageCount: languageCases.length,
    languageResults,
    languageReasons,
  }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
