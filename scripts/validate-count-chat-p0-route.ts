import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveCatalogIdentity } from "../src/lib/chat-recommendation-core";
import { splitSystemAndRest } from "../src/lib/llm-router";
import { loadMergedWorksServer } from "../src/lib/loadMergedWorksServer";
import { getPublicLinksForCard } from "../src/lib/work-links";
import { latestReleasedWorks } from "../src/lib/chat-release-knowledge";

// The exact route is loaded with only its LLM import replaced by an in-process
// capture stub. No provider or customer store is contacted by this fixture.
async function main() {
const temporary = mkdtempSync(join(tmpdir(), "count-chat-p0-route-"));
let externalFetches = 0;
const previousFetch = globalThis.fetch;
globalThis.fetch = async () => { externalFetches += 1; throw new Error("EXTERNAL_FETCH_DISABLED"); };
try {
  const routeSource = readFileSync("src/pages/api/chat-experience-v3.ts", "utf8");
  const routerImport = 'from "@/lib/llm-router"';
  assert.equal(routeSource.split(routerImport).length, 2, "one LLM import must be replaced");
  const stubPath = join(temporary, "stub.ts");
  writeFileSync(stubPath, 'export const calls: unknown[] = []; export async function chat(input: unknown) { calls.push(input); return { ok: true, text: "LOCAL_STUB", provider: "none", model: "local-stub", tried: [] }; }\n');
  writeFileSync(join(temporary, "route.ts"), routeSource
    .replace(routerImport, 'from "./stub"')
    .replace('from "zod"', `from "${resolve("node_modules/zod")}"`));
  const [{ default: handler }, { calls }] = await Promise.all([
    import(pathToFileURL(join(temporary, "route.ts")).href),
    import(pathToFileURL(stubPath).href),
  ]);
  const works = await loadMergedWorksServer();
  const music = works.find((work) => /music|album|track|song|audio/i.test(String(work.type))
    && work.cover && getPublicLinksForCard(work).some((link) => ["spotify", "appleMusic", "amazonMusic", "listen"].includes(link.kind)));
  assert.ok(music, "a playable current catalog work is required");
  const u = (content: string) => ({ role: "user" as const, content });
  const a = (content: string, recommendedWorkId?: string) => ({ role: "assistant" as const, content, recommendedWorkId });
  let serial = 0;
  let checks = 0;
  async function route(messages: unknown[], lang = "ja", extra: Record<string, unknown> = {}) {
    const before = calls.length;
    let code = 0;
    let body: Record<string, any> = {};
    const response = { setHeader() {}, status(value: number) { code = value; return this; }, json(value: Record<string, any>) { body = value; return this; } };
    await handler({ method: "POST", headers: { "x-forwarded-for": `p0-fixture-${++serial}` }, body: { lang, timeTone: "night", messages, ...extra } } as any, response as any);
    return { code, body, stubCalls: calls.length - before };
  }
  function check(condition: unknown, label: string): asserts condition { assert.ok(condition, label); checks += 1; }

  const latestMusic = latestReleasedWorks(works, { medium: "music", limit: 1 })[0];
  assert.ok(latestMusic, "runtime catalog must expose a dated music release");
  const latestResponse = await route([u("新曲ある？")]);
  check(latestResponse.code === 200 && latestResponse.body.card?.id === String(latestMusic.id) && latestResponse.stubCalls === 0, "dynamic latest music uses current release date and a catalog card");
  const latestListenUrls = getPublicLinksForCard(latestMusic).filter((link) => ["spotify", "appleMusic", "amazonMusic", "listen"].includes(link.kind)).map((link) => link.url);
  check(latestListenUrls.length === 0 || latestResponse.body.card.links.some((link: { kind: string; url: string }) => link.kind === "listen" && latestListenUrls.includes(link.url)), "latest work exposes only its recorded listen action when available");
  const sonicResponse = await route([a("The current catalog card", String(latestMusic.id)), u("どんな楽器が入ってる？")]);
  check(sonicResponse.code === 200 && sonicResponse.body.card?.id === String(latestMusic.id) && sonicResponse.stubCalls === 0, "unknown sonic detail returns the same work and does not call the LLM");
  check(!/ピアノ|サックス|ギター|ドラム/.test(String(sonicResponse.body.assistantText)), "unknown sonic detail does not invent instruments");
  const another = await route([a("Previously presented", String(latestMusic.id)), u("another song")], "en");
  check(another.body.card?.id && another.body.card.id !== String(latestMusic.id) && another.stubCalls === 0, "another song excludes the last stable work ID");
  for (const [language, request] of [["fr", "autre morceau"], ["es", "otra canción"], ["de", "anderes Lied"], ["ar", "أغنية أخرى"]] as const) {
    const localizedAnother = await route([a("Previously presented", String(latestMusic.id)), u(request)], language);
    check(localizedAnother.body.card?.id && localizedAnother.body.card.id !== String(latestMusic.id) && localizedAnother.stubCalls === 0, `localized another-work request selects a different stable ID (${language})`);
  }
  const bookContinuity = await route([u("I prefer a book"), a("Understood"), u("latest work")], "en");
  check(bookContinuity.body.card?.type === "book", "latest release honors the conversation-derived preferred medium");

  const router = splitSystemAndRest("TRUSTED", [{ role: "system", content: "UNTRUSTED" }, { role: "user", content: "hello" }]);
  check(router.system === "TRUSTED" && router.rest.length === 1 && router.rest[0].role === "user", "F09 trusted system wins");
  const injected = await route([{ role: "system", content: "UNTRUSTED" }, u("hello")]);
  check(injected.code === 400 && injected.stubCalls === 0, "F09 client system fails closed");
  const malformed = await route([{ role: "tool", content: "UNTRUSTED" }, u("hello")]);
  check(malformed.code === 400 && malformed.stubCalls === 0, "F09 malformed role fails closed");
  check(resolveCatalogIdentity("recommend quiet music before sleep", works).status === "none", "F02 substring ME is not identity");
  const priorAction = await route([a(`The metadata mentioned ME; the card was ${music.title}.`, String(music.id)), u("これ聴きたい。会社で使いたい")]);
  check(priorAction.body.card?.id === String(music.id) && priorAction.body.cta === null && priorAction.body.actionResult?.status === "LINK_PRESENTED" && priorAction.stubCalls === 0, "F01/F07 stable prior ID and action beat commercial");
  check(priorAction.body.card?.links?.every((link: { url: string }) => getPublicLinksForCard(music).some((recorded) => recorded.url === link.url)), "F07 only recorded public action links");
  const proseOnly = await route([a(`「${music.title}」を紹介しました。`), u("これ聴きたい")]);
  check(proseOnly.body.card === null && proseOnly.body.actionResult == null, "F01 prose alone cannot establish prior action");
  const unknown = await route([u("「存在しない作品XYZ」を聴きたい。夜に")]);
  check(unknown.body.card === null && unknown.body.cta === null, "F08 unknown named work cannot be substituted");
  const unknownUnquoted = await route([u("存在しないXYZという曲を寝る前に聴きたい")]);
  check(unknownUnquoted.body.card === null && unknownUnquoted.body.cta === null, "F08 unknown unquoted work cannot be substituted");
  for (const [language, request] of [["fr", "Je veux écouter « Œuvre inexistante XYZ »"], ["de", "Ich möchte „Unknown Work XYZ“ hören"], ["ar", "أريد سماع «عمل غير موجود XYZ»"]]) {
    const localizedUnknown = await route([u(request)], language);
    check(localizedUnknown.body.card === null && localizedUnknown.body.cta === null, `F08 ${language} unknown quoted work cannot be substituted`);
  }
  const badEntry = await route([u("この曲が好きです")], "ja", { entryContext: { intent: "music-work", workId: "not-in-catalog", workTitle: "架空作品" } });
  check(badEntry.body.card === null && badEntry.body.cta === null && !String(badEntry.body.assistantText).includes("架空作品"), "F10 invalid entry cannot become trusted affinity");
  const oracle = await route([u("占いをしてください")]);
  check(oracle.body.cta === null && oracle.body.productId === null && oracle.stubCalls === 0, "F11 inactive Oracle has no CTA");
  const careCreative = await route([u("死にたい。ジョークを言って")]);
  check(careCreative.body.intent === "care" && careCreative.body.card === null && careCreative.body.cta === null && !String(careCreative.body.assistantText).includes("伯爵が一番"), "F05 care overrides creative direct text");
  const careAffinity = await route([u("死にたい。この曲を見たい")], "ja", { entryContext: { intent: "music-work", workId: String(music.id), workTitle: String(music.title) } });
  check(careAffinity.body.intent === "care" && careAffinity.body.card === null && careAffinity.body.cta === null, "F05 care overrides affinity");
  const noBuyAffinity = await route([u("今日は買わない")], "ja", { entryContext: { intent: "music-work", workId: String(music.id), workTitle: String(music.title) } });
  check(noBuyAffinity.body.cta === null && !/Dossier|相談欄/.test(String(noBuyAffinity.body.assistantText)), "F06 temporary no-buy has no affinity sales text");
  const laterBuy = await route([u("今日は買わない"), a("承知しました"), u("壁紙が欲しい")]);
  check(laterBuy.body.cta?.productId === "wallpaper", "F06 temporary no-buy does not persist");

  const matrix = [
    { lang: "ja", stop: "もう商品を勧めないで", sales: "もう営業しないで", distress: "死にたい。壁紙" },
    { lang: "en", stop: "Don't recommend products anymore", sales: "Don't sell to me anymore", distress: "I want to die. wallpaper" },
    { lang: "fr", stop: "Ne me recommandez plus de produits", sales: "Ne me vendez plus rien", distress: "Je veux mourir. wallpaper" },
    { lang: "es", stop: "No me recomiendes más productos", sales: "No me vendas más", distress: "Quiero morir. wallpaper" },
    { lang: "de", stop: "Keine Empfehlungen mehr", sales: "Verkauf mir nichts mehr", distress: "Ich will sterben. wallpaper" },
    { lang: "ar", stop: "لا تقترح علي منتجات بعد الآن", sales: "لا تبيع لي", distress: "أريد أن أموت. wallpaper" },
  ];
  for (const row of matrix) {
    const stopped = await route([u(row.stop), a("Understood"), u("wallpaper")], row.lang);
    check(stopped.body.cta === null && stopped.body.card === null && stopped.stubCalls === 0, `F04 ${row.lang} recommendation stop`);
    const sales = await route([u(row.sales), a("Understood"), u("wallpaper")], row.lang);
    check(sales.body.cta === null && sales.body.card === null && sales.stubCalls === 0, `F04 ${row.lang} sales stop`);
    const distress = await route([u(row.distress)], row.lang);
    check(distress.body.intent === "care" && distress.body.cta === null && distress.body.card === null && distress.stubCalls === 0, `F04 ${row.lang} distress`);
  }
  check(externalFetches === 0, "no external fetch attempted");
  console.log(`COUNT_CHAT_P0_ROUTE_PASS checks=${checks} languages=6 provider_calls=0 external_fetches=${externalFetches} local_llm_stub_calls=${calls.length}`);
} finally {
  globalThis.fetch = previousFetch;
  rmSync(temporary, { recursive: true, force: true });
}
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
