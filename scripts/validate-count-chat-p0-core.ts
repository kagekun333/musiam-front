import { deriveChatCoreTurn, isDistressRequest, resolveCatalogIdentity, salesSuppressionText, selectOneRecommendation, unavailableRecommendationText, type CoreLanguage, type CoreMessage } from "../src/lib/chat-recommendation-core";
import type { CatalogWork } from "../src/lib/mergeWorksCatalog";

function assert(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(`COUNT_CHAT_P0_CORE_FAIL ${label}`);
}

const works: CatalogWork[] = [
  { id: "id-me", title: "ME", type: "music", catalogAliases: ["My Alias"], links: { spotify: "https://open.spotify.com/album/abcd1234" }, moodTags: ["calm"] },
  { id: "id-book", title: "The Book", type: "book", href: "https://example.org/book" },
  { id: "id-dup-1", title: "Shared Title", type: "music", links: { spotify: "https://open.spotify.com/album/efgh1234" } },
  { id: "id-dup-2", title: "Shared Title", type: "music", links: { spotify: "https://open.spotify.com/album/ijkl1234" } },
];
const turn = (messages: CoreMessage[], language: CoreLanguage = "en") => deriveChatCoreTurn({ messages, language, works });
const user = (content: string): CoreMessage => ({ role: "user", content });
const assistant = (content: string, recommendedWorkId?: string): CoreMessage => ({ role: "assistant", content, recommendedWorkId });

assert(resolveCatalogIdentity("recommend something calm", works).status === "none", "ME substring cannot resolve");
assert(resolveCatalogIdentity("recommend me something calm", works).status === "none", "ME pronoun cannot resolve");
assert(resolveCatalogIdentity("id-me", works).status === "exact", "stable ID resolves");
assert(resolveCatalogIdentity("「My Alias」を聴きたい", works).status === "exact", "explicit alias resolves");
assert(resolveCatalogIdentity("「ME」を聴きたい", works).status === "exact", "exact unique title resolves");
assert(resolveCatalogIdentity("「Shared Title」を聴きたい", works).status === "ambiguous", "duplicate title is ambiguous");
assert(resolveCatalogIdentity("「Unknown Work」を聴きたい", works).status === "unknown", "unknown quote is unknown");
assert(resolveCatalogIdentity("écouter « Unknown Work »", works).status === "unknown", "French quoted unknown is unknown");
assert(resolveCatalogIdentity("Ich möchte „Unknown Work“ hören", works).status === "unknown", "German quoted unknown is unknown");
assert(resolveCatalogIdentity("أريد سماع «Unknown Work»", works).status === "unknown", "Arabic quoted unknown is unknown");
const clearSales = turn([user("hello")]).sales;
assert(selectOneRecommendation({ works, query: "「Shared Title」を聴きたい", language: "en", sales: clearSales }) === null, "ambiguous title has no card");
assert(selectOneRecommendation({ works, query: "「Unknown Work」を聴きたい", language: "en", sales: clearSales, preferWorkId: "id-me" }) === null, "unknown quote cannot substitute prior work");

const prior = turn([assistant("The Book and ME were mentioned, but this card is ME.", "id-me"), user("Play this")]);
assert(prior.actionStatus === "link_available" && prior.actionTargetId === "id-me" && prior.actionKind === "listen" && prior.actionLinks.length === 1, "action uses shown stable ID and only reports a link");
assert(turn([assistant("ME"), user("Play this")]).actionStatus === "unavailable", "assistant text is not identity evidence");
assert(turn([assistant("ME", "id-me"), user("thanks"), assistant("You are welcome"), user("Play this")]).actionStatus === "unavailable", "latest assistant without a card breaks prior-card reference");
assert(turn([assistant("ME", "id-book"), user("Play this")]).actionStatus === "unavailable", "listen requires music");
assert(turn([assistant("The Book", "id-book"), user("Read this")]).actionStatus === "link_available", "read requires book and recorded link");
assert(turn([assistant("The Book", "id-book"), user("Open this")]).actionStatus === "link_available", "open accepts recorded link");
assert(turn([user("View 「Shared Title」")]).actionStatus === "ambiguous", "ambiguous action asks for clarification");
assert(turn([user("Play 「Unknown Work」"), assistant("ME", "id-me")]).actionStatus === "unavailable", "unknown explicit name does not fall back");

const languages: { language: CoreLanguage; stop: string; salesStop: string; noBuy: string; reopen: string; recReopen: string; distress: string }[] = [
  { language: "ja", stop: "もう作品を勧めないで", salesStop: "もう営業しないで", noBuy: "今日は買わない。作品を見たい", reopen: "やっぱり買いたい", recReopen: "やっぱりおすすめして", distress: "死にたい" },
  { language: "en", stop: "Don't recommend works anymore", salesStop: "Don't sell to me anymore", noBuy: "I'm not buying today", reopen: "I want to buy now", recReopen: "Recommend works again", distress: "I want to die" },
  { language: "fr", stop: "Ne me recommandez plus d'œuvres", salesStop: "Ne me vendez plus rien", noBuy: "Je n'achète pas aujourd'hui", reopen: "Je veux acheter", recReopen: "Recommandez-moi de nouveau", distress: "Je veux mourir" },
  { language: "es", stop: "No me recomiendes más obras", salesStop: "No me vendas más", noBuy: "No voy a comprar hoy", reopen: "Quiero comprar", recReopen: "Recomiéndame de nuevo", distress: "Quiero morir" },
  { language: "de", stop: "Keine Empfehlungen mehr", salesStop: "Verkauf mir nichts mehr", noBuy: "Ich kaufe heute nicht", reopen: "Ich möchte kaufen", recReopen: "Empfiehl mir wieder", distress: "Ich will sterben" },
  { language: "ar", stop: "لا تقترح علي أعمالاً", salesStop: "لا تبيع لي", noBuy: "لن أشتري اليوم", reopen: "أريد الشراء", recReopen: "اقترح لي مرة أخرى", distress: "أريد أن أموت" },
];
for (const { language, stop, salesStop, noBuy, reopen, recReopen, distress } of languages) {
  const temporary = turn([user(noBuy)], language).sales;
  assert(temporary.temporaryNoBuy && temporary.suppressSales && !temporary.persistentStop && !temporary.suppressRecommendations, `${language} temporary no-buy`);
  const stopped = turn([user(stop), assistant("Understood"), user("another work")], language).sales;
  assert(stopped.persistentRecommendationStop && stopped.suppressSales && stopped.suppressRecommendations && !stopped.currentStopRequest, `${language} persistent recommendation stop`);
  const salesOnly = turn([user(salesStop), assistant("Understood"), user("another work")], language).sales;
  assert(salesOnly.persistentSalesStop && salesOnly.suppressSales && !salesOnly.suppressRecommendations, `${language} persistent sales stop`);
  assert(turn([user(stop)], language).sales.currentStopRequest, `${language} current stop signal`);
  const reopened = turn([user(stop), assistant("Understood"), user(reopen)], language).sales;
  assert(!reopened.persistentStop && !reopened.suppressSales && !reopened.suppressRecommendations && reopened.currentReopenRequest, `${language} explicit reopen`);
  const recommendationReopened = turn([user(stop), assistant("Understood"), user(recReopen)], language).sales;
  assert(!recommendationReopened.persistentRecommendationStop && recommendationReopened.currentReopenRequest, `${language} recommendation reopen`);
  const salesRemainsStopped = turn([user(salesStop), assistant("Understood"), user(recReopen)], language).sales;
  assert(salesRemainsStopped.persistentSalesStop && salesRemainsStopped.suppressSales && !salesRemainsStopped.suppressRecommendations, `${language} recommendation reopen does not reopen sales`);
  assert(isDistressRequest(distress), `${language} distress`);
  assert(unavailableRecommendationText(language, "unavailable").length > 0, `${language} localized unavailable action`);
  assert(salesSuppressionText(language, "sales") !== salesSuppressionText(language, "recommendations"), `${language} stop text reflects scope`);
}
assert(isDistressRequest("涙が止まらない"), "existing Japanese distress cue");

console.log("COUNT_CHAT_P0_CORE_PASS languages=6 provider_calls=0 network_calls=0");
