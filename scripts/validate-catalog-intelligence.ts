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
  assert.ok(file.records.length >= 10);

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

  const okinawa = selectOneRecommendation({
    works: music,
    query: "沖縄の曲ある？",
    language: "ja",
    sales: openSales,
  });
  assert.ok(okinawa, "Okinawa discovery should return a real catalog work");
  assert.ok(scoreWorkIntelligenceQuery(okinawa!.work, "沖縄の曲ある？").score > 0);

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
  }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
