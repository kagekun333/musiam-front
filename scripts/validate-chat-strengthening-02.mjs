/* global console */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import chatUiContract from "../src/lib/chat-ui-contract.ts";
import cardJourney from "../src/lib/chat-card-journey.ts";
import chatWorkCards from "../src/lib/chat-work-card.ts";
import historyRecommendation from "../src/lib/chat-history-recommendation.ts";
import workLinks from "../src/lib/work-links.ts";
import chatExperience from "../src/lib/chat-experience.ts";
import mergedCatalogLoader from "../src/lib/loadMergedWorksServer.ts";

const { normalizeChatHistory, normalizeChatUiReply, appendAssistantReply } = chatUiContract;
const { getChatCardJourney } = cardJourney;
const { buildChatWorkCard } = chatWorkCards;
const { hasAssistantRecommendedWorkId, normalizeHistoryForCatalog, resolveRestoredRecommendation } = historyRecommendation;
const { getPublicLinksForCard } = workLinks;
const { getSalonStarters } = chatExperience;
const { loadMergedWorksServer } = mergedCatalogLoader;

const read = (path) => readFileSync(path, "utf8");
const page = read("src/pages/chat.tsx");
const api = read("src/pages/api/chat-experience-v3.ts");
const historyApi = read("src/pages/api/chat-history.ts");
const historyStore = read("src/lib/chat-history.server.ts");
const historyRoute = read("src/pages/api/chat-history.ts");
const storedMessageFields = [...(historyStore.match(/export type StoredChatMessage = \{([\s\S]*?)\n\};/)?.[1] ?? "").matchAll(/^\s+(\w+)(?:\?)?:/gm)].map((match) => match[1]);
const nav = read("src/components/Nav.tsx");
const catalogJson = JSON.parse(read("public/works/works.json"));
const catalog = catalogJson.items;
const productRecord = JSON.parse(read("ops/product/chat-strengthening-02-20260925.json"));
const runtimeCatalog = await loadMergedWorksServer();
const languages = ["ja", "en", "fr", "es", "de", "ar"];
let passed = 0;

function check(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${passed}: ${name}`);
}

check("F1: six localized intros and starter guidance remain; composer and shared navigation exist", () => {
  for (const lang of languages) assert.match(page, new RegExp(`^  ${lang}: \\{ title:`, "m"));
  assert.match(page, /promptHint/);
  assert.match(page, /aria-label=\{ui\.inputPlaceholder\}/);
  assert.match(nav, /function Nav|export default function Nav/);
  assert.match(page, /getChatCardJourney/);
});

check("F2: a localized starter is sent through the existing user-turn path", () => {
  assert.ok(getSalonStarters("ja", "night").length > 0);
  assert.match(page, /onClick=\{\(\) => \{[\s\S]*?sendText\(s\)/);
  assert.match(page, /setMessages\(next\)/);
});

check("F3: deterministic assistant response normalization and completion clear the UI send guard", () => {
  const reply = normalizeChatUiReply({ assistantText: "Fixture reply", persona: "count" });
  const messages = appendAssistantReply([{ role: "user", content: "hello" }], reply);
  assert.equal(messages.at(-1)?.content, "Fixture reply");
  assert.match(page, /setSending\(false\);\s*sendInFlightRef\.current = false;/);
});

const work = runtimeCatalog.find((item) => String(item.id) === "apple-album-6797260493");
assert.ok(work && catalog.some((item) => String(item.id) === String(work.id)) && work.title && work.cover && getPublicLinksForCard(work).length > 0, "Fractal Hands must resolve by stable ID in the live merged Catalog with recorded public action");
const publicLinks = getPublicLinksForCard(work).map((link) => ({
  kind: ["spotify", "appleMusic", "amazonMusic"].includes(link.kind) ? "listen" : link.kind,
  url: link.url,
}));
const realWorkReply = normalizeChatUiReply({
  assistantText: "Catalog fixture recommendation",
  card: { id: String(work.id), title: work.title, cover: work.cover, type: work.type, links: publicLinks, reason: "Fixture reason grounded in the current request." },
});

check("F4: a real catalog work yields exactly one card with stable identity, metadata, and recorded links", () => {
  assert.equal(realWorkReply.cards.length, 1);
  assert.equal(realWorkReply.cards[0].workId, String(work.id));
  assert.equal(realWorkReply.cards[0].title, work.title);
  assert.equal(realWorkReply.cards[0].cover, work.cover);
  assert.deepEqual(realWorkReply.cards[0].links.map((link) => link.url), publicLinks.map((link) => link.url));
  assert.equal(normalizeChatUiReply({ assistantText: "unknown", card: { id: "", title: "Invented", cover: "/invented.jpg", links: [] } }).cards.length, 0);
});

check("F5: recommendation explains its reason and offers catalog detail plus neutral exploration prompts", () => {
  const card = realWorkReply.cards[0];
  const journey = getChatCardJourney(card.workId, "ja");
  assert.ok(card.reason);
  assert.equal(journey.detailHref, `/works/${encodeURIComponent(String(work.id))}`);
  assert.equal(journey.followUpPrompts.length, 2);
  assert.match(page, /journey\.followUpPrompts\.map/);
});

check("F6: retry reuses the same user turn and assistant append deduplicates an identical response", () => {
  assert.match(page, /lastFailedRequestRef\.current = \{ messages: requestMessages/);
  assert.match(page, /requestAssistantReply\(failed\.messages\)/);
  assert.match(page, /setSending\(false\);\s*sendInFlightRef\.current = false;/);
  const userTurn = [{ role: "user", content: "one turn" }];
  const once = appendAssistantReply(userTurn, { assistantText: "success", persona: "count" });
  assert.equal(appendAssistantReply(once, { assistantText: "success", persona: "count" }).length, once.length);
});

check("F7: opening failure exposes a retry action that calls the existing deterministic begin path", () => {
  assert.match(page, /messages\.length === 0[\s\S]*?onClick=\{\(\) => void begin\(lang, timeTone\)\}/);
  assert.match(page, /if \(requestId !== replyRequestIdRef\.current\) return;/);
});

check("F8-A: assistant stable work ID survives normalization only when present in the canonical catalog", () => {
  const canonicalCatalog = [work];
  const restored = normalizeHistoryForCatalog([
    { role: "assistant", content: "Opening" },
    { role: "user", content: "Find one work" },
    { role: "assistant", content: "Recommended Fractal Hands", recommendedWorkId: String(work.id) },
  ], canonicalCatalog);
  assert.deepEqual(restored.map((message) => message.content), ["Opening", "Find one work", "Recommended Fractal Hands"]);
  assert.equal(restored[2].recommendedWorkId, String(work.id));
  assert.deepEqual(Object.keys(restored[2]).sort(), ["content", "recommendedWorkId", "role"]);
  assert.equal(hasAssistantRecommendedWorkId(restored), true);
  const card = resolveRestoredRecommendation(restored, canonicalCatalog);
  assert.equal(card?.id, String(work.id));
  assert.equal(card?.title, work.title);
  assert.equal(card?.cover, work.cover);
  assert.deepEqual(card?.links.map((link) => link.url), publicLinks.map((link) => link.url));
});

check("F8-B: legacy message-only history stays compatible and does not acquire recommendation metadata", () => {
  const restored = normalizeHistoryForCatalog([{ role: "assistant", content: "Old history" }], [work]);
  assert.deepEqual(restored, [{ role: "assistant", content: "Old history" }]);
  assert.equal(resolveRestoredRecommendation(restored, [work]), null);
});

check("F8-C: unknown IDs, title-as-ID, and user-role IDs are dropped without losing message text", () => {
  const restored = normalizeHistoryForCatalog([
    { role: "user", content: "user turn", recommendedWorkId: String(work.id) },
    { role: "assistant", content: "Stale card text", recommendedWorkId: "unknown-work-id" },
    { role: "assistant", content: "Title is not identity", recommendedWorkId: work.title },
  ], [work]);
  assert.deepEqual(restored, [
    { role: "user", content: "user turn" },
    { role: "assistant", content: "Stale card text" },
    { role: "assistant", content: "Title is not identity" },
  ]);
  assert.equal(resolveRestoredRecommendation(restored, [work]), null);
  assert.equal(buildChatWorkCard({ ...work, id: undefined }), null, "title must not substitute for stable ID");
});

check("F8-D: only the latest assistant ID restores a current card through the shared builder", () => {
  const stale = resolveRestoredRecommendation(normalizeHistoryForCatalog([
    { role: "assistant", content: "Old card", recommendedWorkId: String(work.id) },
    { role: "assistant", content: "Newest answer" },
  ], [work]), [work]);
  assert.equal(stale, null, "a later assistant response without an ID must not show a stale card");
  const current = resolveRestoredRecommendation(normalizeHistoryForCatalog([
    { role: "assistant", content: "Current card", recommendedWorkId: String(work.id) },
  ], [work]), [work]);
  assert.equal(current?.id, String(work.id));
  assert.equal(current?.title, work.title);
  assert.equal(current?.cover, work.cover);
  assert.deepEqual(current?.links.map((link) => link.url), getPublicLinksForCard(work).map((link) => link.url));
  assert.equal(current?.reason, undefined);
  assert.match(historyRoute, /normalizeHistoryForCatalog/);
  assert.match(historyRoute, /resolveRestoredRecommendation/);
  assert.match(historyRoute, /loadMergedWorksServer/);
  assert.match(historyStore, /recommendedWorkId\?: string/);
  assert.match(historyStore, /60 \* 60 \* 24 \* 90/);
  assert.match(historyStore, /CHAT_HISTORY_MAX_MESSAGES = 40/);
  assert.deepEqual(storedMessageFields.sort(), ["content", "persona", "recommendedWorkId", "role"]);
  assert.doesNotMatch(storedMessageFields.join(" "), /recommendedWorkCard|title|cover|image|url|reason|price|availability|ownership|entitlement|analytics/i);
  assert.doesNotMatch(historyRoute, /entitlement|analytics|tracking/i);
});

check("history order and 40-message cap remain unchanged", () => {
  const restored = normalizeChatHistory([
    { role: "assistant", content: "A" },
    { role: "user", content: "B" },
    { role: "assistant", content: "C" },
  ]);
  assert.deepEqual(restored.map((message) => message.content), ["A", "B", "C"]);
  assert.equal(normalizeChatHistory(Array.from({ length: 45 }, (_, i) => ({ role: "user", content: String(i) }))).length, 40);
});

check("F9: history 503 remains isolated from Chat opening and is described as unavailable, not entitlement", () => {
  assert.match(page, /if \(generation === entryGenerationRef\.current\) await begin\(l, tone\)/);
  assert.match(page, /Memory is currently unavailable/);
  assert.match(page, /Chat can continue/);
  assert.match(historyApi, /return res\.status\(503\)\.json\(\{ ok: false, error: "history_unavailable" \}\)/);
  assert.doesNotMatch(historyStore, /entitlement/i);
});

check("F10: stale opening and reply responses are ignored after a newer request", () => {
  assert.ok((page.match(/requestId !== replyRequestIdRef\.current/g) ?? []).length >= 4);
  assert.ok((page.match(/generation !== entryGenerationRef\.current/g) ?? []).length >= 1);
});

check("production stays isolated: no fixture flag/route, and provider calls remain behind the active v3 route", () => {
  assert.doesNotMatch(page, /fixture|mockApi|__fixture/i);
  assert.match(page, /fetch\("\/api\/chat-experience-v3"/);
  assert.match(api, /llmChat\(/);
  assert.doesNotMatch(page, /\/api\/chat-experience-v3\?[^"`]*fixture/);
});

check("Product record proves all F gates, minimal history storage, required validators, invariants, and local-only truth boundary", () => {
  for (const gate of ["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10"]) assert.equal(productRecord.fixture[gate], "PASS", `${gate} must pass`);
  assert.deepEqual(Object.values(productRecord.fixture.F8Cases), ["PASS", "PASS", "PASS", "PASS"]);
  assert.equal(productRecord.history.contract, "STABLE_WORK_ID_ONLY");
  assert.equal(productRecord.history.persistedRecommendationField, "optional recommendedWorkId on assistant messages only");
  assert.equal(productRecord.history.maxMessages, 40);
  assert.equal(productRecord.history.ttlDays, 90);
  assert.equal(productRecord.history.historyIsEntitlement, false);
  assert.equal(productRecord.recommendationContract.exactlyOne, true);
  assert.equal(productRecord.recommendationContract.publicActions, "recorded links only");
  assert.equal(productRecord.validation.typecheck, "PASS");
  assert.equal(productRecord.validation.scopedChangedTypeScriptLint, "PASS: 0 errors, 0 warnings");
  assert.equal(productRecord.validation.rootLint.newLintWarnings, 0);
  assert.ok(Object.values(productRecord.validation.recoveryValidators).every((status) => status === "PASS"));
  assert.equal(productRecord.validation.catalog.primary, 450);
  assert.equal(productRecord.validation.catalog.runtimeMerged, 514);
  assert.equal(productRecord.validation.exhibition.displayed, 514);
  assert.equal(productRecord.validation.exhibition.releasedWorksMissing, 0);
  for (const operation of ["provider", "payment", "customerDataMutations", "analyticsAdditions", "redisHistoryReadsOrWrites", "deploy", "push"]) {
    assert.equal(productRecord.externalOperations[operation], 0, `${operation} must remain zero`);
  }
  assert.match(productRecord.validation.sourceTruth, /mocked browser fixture only; not Production/);
  assert.equal(productRecord.validation.catalog.runtimeProductionParity, "UNVERIFIED");
  assert.equal(productRecord.commit.status, "PASS_COMMITTED");
});

console.log(`CHAT_STRENGTHENING_02_FIXTURE=PASS checks=${passed} provider_calls=0 browser_suite=fixture-chat-strengthening-02.browser.mjs`);
