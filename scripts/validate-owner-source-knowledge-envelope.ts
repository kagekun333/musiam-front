import assert from "node:assert/strict";
import editorialJson from "../public/works/editorial-knowledge.json";
import { getEditorialKnowledgeForWorkId, resolveEditorialKnowledgeFromQuery } from "../src/lib/editorial-knowledge";
import { buildLunaEvidencePack, buildWorkKnowledgeEnvelope, asksForWorkStory, asksForSonicDetails, unknownSonicText, workStoryResponseLooksComplete } from "../src/lib/chat-release-knowledge";
import { projectExhibitionWorks } from "../src/lib/exhibition-projection";
import { loadMergedWorksServer } from "../src/lib/loadMergedWorksServer";
import type { CatalogWork } from "../src/lib/mergeWorksCatalog";

(async () => {
  const items = (editorialJson as { items?: unknown[] }).items ?? [];
  assert.ok(items.length >= 14);

  const works = await loadMergedWorksServer();
  const fuego = works.find((work) => String(work.id) === "fuego-en-la-noche-228");
  const fuegoSpotify = works.find((work) => String(work.id) === "spotify-single-0isH27stV7eiEpIbqfhood");
  const gorli = works.find((work) => String(work.id) === "g-rli-garden-149");
  const sun: CatalogWork = { id: "apple-album-6808806776", title: "Sun Without a Map", type: "music", releasedAt: "2026-09-29" };
  assert.ok(fuego);
  assert.ok(fuegoSpotify);
  assert.ok(gorli);

  const fuegoEditorial = getEditorialKnowledgeForWorkId("fuego-en-la-noche-228");
  assert.ok(fuegoEditorial);
  assert.equal(fuegoEditorial?.sourceClass, "OWNER_PUBLISHED_MEDIA");
  assert.equal(fuegoEditorial?.ownerIntentStatus, "EXPLICIT");
  assert.match(String(fuegoEditorial?.ownerIntentSummaryJa), /夜|振れ幅/);

  const fuegoAliasEditorial = getEditorialKnowledgeForWorkId("spotify-single-0isH27stV7eiEpIbqfhood");
  assert.equal(fuegoAliasEditorial?.workId, "fuego-en-la-noche-228");

  const fuegoQueryResolution = resolveEditorialKnowledgeFromQuery("Fuego en la Nocheってどんな曲？", works);
  assert.equal(String(fuegoQueryResolution?.work.id), "fuego-en-la-noche-228");
  assert.equal(fuegoQueryResolution?.row.ownerIntentStatus, "EXPLICIT");

  const gorliQueryResolution = resolveEditorialKnowledgeFromQuery("Görli Gardenはなんで作ったの？", works);
  assert.equal(String(gorliQueryResolution?.work.id), "g-rli-garden-149");
  assert.equal(gorliQueryResolution?.row.ownerIntentStatus, "NOT_EXPLICIT");

  const gorliEditorial = getEditorialKnowledgeForWorkId("g-rli-garden-149");
  assert.ok(gorliEditorial);
  assert.equal(gorliEditorial?.sourceClass, "OWNER_PUBLISHED_MEDIA");
  assert.equal(gorliEditorial?.ownerIntentStatus, "NOT_EXPLICIT");
  assert.equal(gorliEditorial?.ownerIntentSummaryJa, undefined);

  assert.equal(getEditorialKnowledgeForWorkId("fake-same-title-id"), null);
  const fakeSameTitle: CatalogWork = { id: "fake-same-title-id", title: "Fuego en la Noche", type: "music", releasedAt: "2025-09-04" };
  assert.equal(resolveEditorialKnowledgeFromQuery("Fuego en la Nocheってどんな曲？", [fakeSameTitle]), null);

  const fuegoEnvelope = buildWorkKnowledgeEnvelope(fuego!);
  assert.ok(fuegoEnvelope?.editorial);
  assert.equal(fuegoEnvelope?.editorial?.ownerIntentStatus, "EXPLICIT");
  assert.ok(!fuegoEnvelope?.unknowns.includes("ownerProductionIntent"));

  const gorliEnvelope = buildWorkKnowledgeEnvelope(gorli!);
  assert.ok(gorliEnvelope?.editorial);
  assert.equal(gorliEnvelope?.editorial?.ownerIntentStatus, "NOT_EXPLICIT");
  assert.ok(gorliEnvelope?.unknowns.includes("ownerProductionIntent"));

  const sunEnvelope = buildWorkKnowledgeEnvelope(sun);
  assert.equal(sunEnvelope?.editorial, null);
  assert.ok(sunEnvelope?.unknowns.includes("editorialSummary"));
  assert.ok(sunEnvelope?.unknowns.includes("ownerProductionIntent"));

  const fuegoPack = JSON.parse(buildLunaEvidencePack(fuego!)!);
  assert.equal(fuegoPack.editorial.ownerIntentStatus, "EXPLICIT");
  assert.equal(fuegoPack.editorialPolicy.ownerIntentMayBeAttributedToOwner, true);
  assert.equal(fuegoPack.editorialPolicy.biographicalFabricationForbidden, true);

  const gorliPack = JSON.parse(buildLunaEvidencePack(gorli!)!);
  assert.equal(gorliPack.editorial.ownerIntentStatus, "NOT_EXPLICIT");
  assert.equal(gorliPack.editorialPolicy.ownerIntentMayBeAttributedToOwner, false);

  const sunPack = JSON.parse(buildLunaEvidencePack(sun)!);
  assert.equal(sunPack.editorial, null);
  assert.equal(sunPack.editorialPolicy.ownerIntentMayBeAttributedToOwner, false);
  assert.equal(sunPack.editorialPolicy.curatorialInterpretationAllowedIfClearlyFramedAsInterpretation, true);

  assert.equal(asksForWorkStory("Fuego en la Nocheってどんな曲？"), true);
  assert.equal(asksForWorkStory("この曲はなぜ作ったの？"), true);
  assert.equal(asksForWorkStory("この曲のテーマは？"), true);
  assert.equal(asksForWorkStory("OMNIって何を込めた曲？"), true);
  assert.equal(asksForWorkStory("どんな思いを込めたの？"), true);
  assert.equal(asksForWorkStory("この曲で何を伝えたいの？"), true);
  assert.equal(asksForWorkStory("どんな楽器が入ってる？"), false);
  assert.equal(asksForSonicDetails("どんな楽器が入ってる？"), true);
  assert.equal(workStoryResponseLooksComplete("館の世界を一望させ", "ja"), false);
  assert.equal(workStoryResponseLooksComplete("館の世界を一望させる一曲ですね。", "ja"), true);
  assert.equal(workStoryResponseLooksComplete("これはかなり自信あります", "ja"), true);
  assert.equal(workStoryResponseLooksComplete("This work brings the whole museum into view.", "en"), true);
  assert.equal(workStoryResponseLooksComplete("This work brings the whole museum into", "en"), false);
  const sonicUnknown = unknownSonicText("ja", "fuego-en-la-noche-228", true);
  assert.match(sonicUnknown, /発掘|裏が取れて/);
  assert.doesNotMatch(sonicUnknown, /資料にありません|catalog metadata/i);

  const projected = projectExhibitionWorks([
    fuego!,
    fuegoSpotify!,
    gorli!,
    fakeSameTitle,
  ], undefined, "2026-09-30").works;
  const projectedFuego = projected.find((work) => work.id === "fuego-en-la-noche-228");
  const projectedFuegoSpotify = projected.find((work) => work.id === "spotify-single-0isH27stV7eiEpIbqfhood");
  const projectedGorli = projected.find((work) => work.id === "g-rli-garden-149");
  const projectedFake = projected.find((work) => work.id === "fake-same-title-id");
  assert.match(String(projectedFuego?.description), /情熱的/);
  assert.match(String(projectedFuegoSpotify?.description), /情熱的/);
  assert.match(String(projectedGorli?.description), /ベルリンの公園/);
  assert.equal(projectedFake?.description, undefined);

  console.log(JSON.stringify({
    verdict: "OWNER_SOURCE_KNOWLEDGE_ENVELOPE_V1=PASS_LOCAL",
    editorialItems: items.length,
    fuegoOwnerIntent: fuegoEnvelope?.editorial?.ownerIntentStatus,
    gorliOwnerIntent: gorliEnvelope?.editorial?.ownerIntentStatus,
    sunEditorial: sunEnvelope?.editorial,
  }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
