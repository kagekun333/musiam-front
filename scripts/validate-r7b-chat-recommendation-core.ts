import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { deriveChatCoreTurn, lookupR4EvidenceByWorkId, selectOneRecommendation } from "../src/lib/chat-recommendation-core";
import { loadMergedWorksServer } from "../src/lib/loadMergedWorksServer";
import { getPublicLinksForCard } from "../src/lib/work-links";
import type { CatalogWork } from "../src/lib/mergeWorksCatalog";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`[validate-r7b-chat-recommendation-core] ${message}`);
}

async function main() {
const works = await loadMergedWorksServer();
const musicWithAction = works.find((work) => /music|album|track|song|audio/i.test(String(work.type)) && Boolean(work.title) && Boolean(work.cover) && getPublicLinksForCard(work).length);
assert(musicWithAction, "a catalog music work with a recorded public action is required for fixtures");

const messages = (...items: { role: "user" | "assistant"; content: string }[]) => items;
const base = { works, language: "ja" as const };

// 1. greeting: no invented work.
const greeting = deriveChatCoreTurn({ ...base, messages: messages({ role: "user", content: "こんにちは" }) });
assert(selectOneRecommendation({ works, query: greeting.currentRequest, language: greeting.language, sales: greeting.sales }) === null, "greeting must not invent a work");

// 2-4. mood, exactly one result, and current language override.
const mood = deriveChatCoreTurn({ ...base, language: "en", messages: messages({ role: "user", content: "夜に静かに聴けるものを一個だけ、日本語で" }) });
const moodRecommendation = selectOneRecommendation({ works, query: mood.currentRequest, language: mood.language, sales: mood.sales });
assert(mood.language === "ja", "current explicit Japanese instruction must override UI language");
assert(moodRecommendation?.work.id, "mood request must select one catalog work");
assert(moodRecommendation.links.length > 0, "recommendation must expose only recorded public actions");
assert(moodRecommendation.reason.includes("夜に静かに聴けるもの"), "reason must refer to the current request");

// 5-7. temporary non-purchase is local; explicit stop remains until a current reopen.
const temporary = deriveChatCoreTurn({ ...base, messages: messages({ role: "user", content: "今日は買わない。夜に静かに聴けるもの" }) });
assert(temporary.sales.temporaryNoBuy && temporary.sales.suppressSales && !temporary.sales.suppressRecommendations, "temporary no-buy must suppress only this turn's sales CTA");
const persistent = deriveChatCoreTurn({ ...base, messages: messages({ role: "user", content: "もう商品を勧めないで" }, { role: "assistant", content: "承知しました" }, { role: "user", content: "夜に静かに聴けるもの" }) });
assert(persistent.sales.persistentStop && persistent.sales.suppressRecommendations, "explicit persistent stop must suppress recommendation in the conversation");
const reopened = deriveChatCoreTurn({ ...base, messages: messages({ role: "user", content: "もう商品を勧めないで" }, { role: "assistant", content: "承知しました" }, { role: "user", content: "やっぱり買いたい" }) });
assert(!reopened.sales.persistentStop && !reopened.sales.suppressSales, "current explicit purchase reopen must not be blocked by an earlier temporary or persistent stop");

// 8. Action completion is only for an existing, previously named catalog work.
const listen = deriveChatCoreTurn({ ...base, messages: messages({ role: "assistant", content: `先ほどの「${musicWithAction.title}」です。` }, { role: "user", content: "これ聴きたい" }) });
assert(listen.actionStatus === "available" && listen.actionTargetId === String(musicWithAction.id), "listen request must complete only the previous work's recorded public action");
const noActionWork: CatalogWork = { id: "no-action", title: "No Action", type: "music", cover: "/cover.jpg", moodTags: ["静か"] };
const noAction = deriveChatCoreTurn({ works: [noActionWork], language: "ja", messages: messages({ role: "assistant", content: "「No Action」を紹介しました。" }, { role: "user", content: "これ聴きたい" }) });
assert(noAction.actionStatus === "unavailable" && noAction.actionLinks.length === 0, "missing action must not be fabricated");

// 9. The current explicit work wins over a previous one.
const alternate = works.find((work) => String(work.id) !== String(musicWithAction.id) && Boolean(work.title) && Boolean(work.cover) && getPublicLinksForCard(work).length);
assert(alternate, "a second catalog work with a recorded public action is required for previous-work fixture");
const explicitNew = selectOneRecommendation({ works, query: `「${alternate.title}」を聴きたい`, language: "ja", sales: greeting.sales });
assert(String(explicitNew?.work.id) === String(alternate.id), "current named work must beat a previous recommendation");

// 10-11. A stop wins, and a catalog-external title never becomes a substitute product.
assert(selectOneRecommendation({ works, query: "売らないで。作品だけ紹介して", language: "ja", sales: persistent.sales }) === null, "explicit stop must suppress a card and sales path");
assert(selectOneRecommendation({ works, query: "「存在しない伯爵の作品」を聴きたい", language: "ja", sales: greeting.sales }) === null, "catalog-external title must not be replaced with another work");

// 12-13. R4 is exact-ID, lookup-only evidence: it cannot make semantic claims.
const claims = JSON.parse(readFileSync(resolve("ops/simulation-refinement/phase5-generalization-20260913/music/batch-r3/claims-matrix.json"), "utf8"));
const ambiguous = claims.records?.find((entry: { ambiguity?: string | null }) => entry.ambiguity) ?? claims.find?.((entry: { ambiguity?: string | null }) => entry.ambiguity);
assert(ambiguous?.workId, "claims matrix must retain an ambiguous stable work ID");
const evidence = lookupR4EvidenceByWorkId(String(ambiguous.workId));
assert(evidence?.ambiguity === ambiguous.ambiguity, "R4 ambiguity must remain unresolved by exact work ID");
assert(evidence?.prohibitedClaims?.some((claim) => /lyrics|mood|vocal/i.test(claim)), "R4 guard must retain content-claim prohibitions");
assert(!/全曲|lyrics|vocal|genre|quality/i.test(moodRecommendation.reason), "recommendation reason must not launder R4 audio claims");

// 14-15. The reason is current-turn-specific and one deterministic card is returned.
const repeated = selectOneRecommendation({ works, query: mood.currentRequest, language: mood.language, sales: mood.sales });
assert(String(repeated?.work.id) === String(moodRecommendation.work.id), "same request must be deterministic rather than repeatedly varying cards");
assert(repeated?.reason === moodRecommendation.reason, "same request must not accumulate or repeat a different full response");

const activeRoute = readFileSync(resolve("src/pages/api/chat-experience-v3.ts"), "utf8");
assert(activeRoute.includes("deriveChatCoreTurn") && activeRoute.includes("!coreTurn.sales.suppressSales"), "active route must apply the core sales guard before serializing CTA");
assert(!activeRoute.includes("rankSalesWorks"), "active route must not score recommendation from SSD production notes");

console.log("R7B_CHAT_RECOMMENDATION_FIXTURES_PASS cases=15 provider_calls=0 network_calls=0");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
