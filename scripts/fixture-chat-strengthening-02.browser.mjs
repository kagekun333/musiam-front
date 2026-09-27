/* global process, URL, console, setTimeout, document, localStorage */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import puppeteer from "puppeteer";

const baseUrl = process.env.CHAT_FIXTURE_BASE_URL ?? "http://127.0.0.1:3117";
const base = new URL(baseUrl);
assert.ok(base.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(base.hostname), "fixture may only target a local HTTP server");
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const catalog = JSON.parse(readFileSync("public/works/works.json", "utf8")).items;
const work = catalog.find((item) => String(item.id) === "apple-album-6797260493");
assert.ok(work, "fixture requires an existing catalog work with a recorded public link");
const publicLink = Object.entries(work.links).find(([, value]) => typeof value === "string" && value.startsWith("https://"));
assert.ok(publicLink, "fixture requires a recorded HTTPS public link");
const card = { id: String(work.id), title: work.title, cover: work.cover, type: work.type, reason: "今のご希望とカタログ情報を照らして選びました。", links: [{ kind: "listen", url: publicLink[1] }] };
const counts = new Map();
const sendBodies = [];
const historyWrites = [];
const historyDeletes = [];
let passed = 0;
let blocked = 0;
let externalBlocked = 0;

function check(name, fn) {
  fn();
  passed += 1;
  console.log(`PASS ${passed}: ${name}`);
}

function increment(key) {
  const next = (counts.get(key) ?? 0) + 1;
  counts.set(key, next);
  return next;
}

async function openFixture(browser, fixture = "default", lang = "ja") {
  const page = await browser.newPage();
  page.on("pageerror", (error) => console.error(`PAGE ERROR ${fixture}: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().endsWith(".Inspector")) console.error(`BROWSER ERROR ${fixture}: ${message.text()}`); });
  await page.setViewport({ width: 1280, height: 900 });
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    const url = new URL(request.url());
    if (url.origin !== new URL(baseUrl).origin) {
      externalBlocked += 1;
      await request.abort("blockedbyclient");
      return;
    }
    const key = `${fixture}:${request.method()}:${url.pathname}`;
    if (url.pathname === "/api/chat-history") {
      if (request.method() === "GET") {
        if (fixture === "history-unavailable" && increment(key) === 1) {
          await request.respond({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, error: "history_unavailable" }) });
          return;
        }
        const history = ["history-restore", "history-legacy", "history-invalid", "history-unavailable", "history-delete-retry", "history-delete-success", "history-disable-retry"].includes(fixture)
          ? { version: 1, lang, messages: [
              { role: "assistant", content: "履歴の案内です" },
              { role: "user", content: "以前の希望" },
              {
                role: "assistant",
                content: "Fractal Hands をご紹介します",
                ...(fixture === "history-restore" ? { recommendedWorkId: String(work.id) } : {}),
                ...(fixture === "history-invalid" ? { recommendedWorkId: "unknown-work-id" } : {}),
              },
            ] }
          : null;
        const restoredRecommendation = fixture === "history-restore"
          ? { id: String(work.id), title: work.title, cover: work.cover, type: work.type, links: card.links }
          : null;
        await request.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, history, restoredRecommendation }) });
        return;
      }
      if (fixture === "history-unavailable" && request.method() === "PUT") {
        await request.respond({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, error: "history_unavailable" }) });
        return;
      }
      if (request.method() === "DELETE") {
        const attempt = increment(key);
        historyDeletes.push({ fixture, conversationId: url.searchParams.get("conversationId"), attempt });
        if (["history-delete-retry", "history-disable-retry"].includes(fixture) && attempt === 1) {
          await request.respond({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, error: "history_unavailable" }) });
          return;
        }
      }
      if (request.method() === "PUT") {
        let body = {};
        try { body = JSON.parse(request.postData() ?? "{}"); } catch { /* fixture ignores malformed request bodies */ }
        historyWrites.push({ fixture, body });
      }
      await request.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      return;
    }
    if (url.pathname === "/api/chat-experience-v3" && request.method() === "POST") {
      let body = {};
      try { body = JSON.parse(request.postData() ?? "{}"); } catch { /* fixture ignores malformed request bodies */ }
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const last = messages.filter((message) => message.role === "user").at(-1)?.content ?? "";
      sendBodies.push({ fixture, body });
      if (fixture === "opening-failure" && messages.length === 0 && increment(key) === 1) {
        await request.respond({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, error: "fixture_opening_error" }) });
        return;
      }
      if (fixture === "retry" && last === "retry fixture" && increment(key) === 1) {
        await request.respond({ status: 503, contentType: "application/json", body: JSON.stringify({ ok: false, error: "fixture_reply_error" }) });
        return;
      }
      if (fixture === "stale" && last === "stale fixture") {
        await new Promise((resolve) => setTimeout(resolve, 1800));
      }
      if (fixture === "normal") await new Promise((resolve) => setTimeout(resolve, 700));
      if (messages.length === 0) {
        await request.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, assistantText: "Fixture opening", persona: "count", card: null }) });
        return;
      }
      if (/catalog|recommend/i.test(last)) {
        await request.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, assistantText: "こちらがご希望に沿う作品です。", persona: "count", card, cta: null }) });
        return;
      }
      const assistantText = last === "long fixture response" ? `Long fixture reply: ${"detail ".repeat(120)}` : `Fixture reply: ${last}`;
      await request.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, assistantText, persona: "count", card: null, cta: null }) });
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      await request.respond({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      return;
    }
    await request.continue();
  });
  page.on("requestfailed", () => {});
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(`${baseUrl}/chat?lang=${encodeURIComponent(lang)}&fixture=${encodeURIComponent(fixture)}`, { waitUntil: "domcontentloaded" });
  return page;
}

async function send(page, text) {
  await page.locator("textarea").fill(text);
  await page.$eval("textarea", (textarea) => textarea.nextElementSibling?.click());
}

const browser = await puppeteer.launch({ headless: true, executablePath: chromePath, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
let failure;
try {
  const initial = await openFixture(browser, "initial", "ja");
  await initial.waitForSelector("[class*=starterSection] button");
  const f1Evidence = await initial.evaluate(() => ({
    intro: document.querySelector("[class*=chatIntro] h2")?.textContent,
    starters: document.querySelectorAll("[class*=starterSection] button").length,
    composer: Boolean(document.querySelector("textarea[aria-label]")),
    nav: Boolean(document.querySelector("nav")),
  }));
  assert.ok(f1Evidence.intro && f1Evidence.starters > 0 && f1Evidence.composer && f1Evidence.nav);
  await initial.$eval("textarea", (textarea) => textarea.focus());
  await initial.keyboard.press("Tab");
  assert.equal(await initial.evaluate(() => document.activeElement?.tagName), "BUTTON");
  check("F1: six-language initial guidance, starters, composer, navigation, and keyboard focus render", () => {});
  await initial.close();

  const localizedIntroStarts = { en: "A conversation", fr: "Une conversation", es: "Una conversación", de: "Ein Gespräch", ar: "حوار" };
  for (const lang of ["en", "fr", "es", "de", "ar"]) {
    const page = await openFixture(browser, `lang-${lang}`, lang);
    await page.waitForSelector("[class*=starterSection] button");
    const intro = await page.$eval("[class*=chatIntro] h2", (node) => node.textContent ?? "");
    assert.ok(intro.startsWith(localizedIntroStarts[lang]), `unexpected ${lang} intro: ${intro}`);
    await page.close();
  }

  const starter = await openFixture(browser, "starter");
  await starter.waitForSelector("[class*=starterSection] button");
  await starter.$eval("[class*=starterSection] button", (button) => button.click());
  await starter.waitForFunction(() => document.querySelectorAll("[class*=assistantBubble]").length >= 2);
  check("F2: selecting a starter creates a user turn and reaches the reply state", async () => {});
  await starter.close();

  const normal = await openFixture(browser, "normal");
  await normal.waitForSelector("textarea");
  await send(normal, "A normal fixture message");
  await normal.waitForSelector("[role=status]");
  await normal.waitForFunction(() => [...document.querySelectorAll("[class*=bubbleText]")].some((node) => node.textContent?.includes("Fixture reply: A normal fixture message")));
  assert.equal(await normal.$("[role=status]"), null);
  check("F3: normal assistant response completes and loading status clears", () => {});
  await normal.close();

  const recommendation = await openFixture(browser, "recommendation");
  await recommendation.waitForSelector("textarea");
  await send(recommendation, "catalog recommendation");
  await recommendation.waitForSelector("[class*=giftCard][data-work-id]");
  const reco = await recommendation.evaluate(() => ({
    cards: document.querySelectorAll("[class*=giftCard][data-work-id]").length,
    id: document.querySelector("[class*=giftCard][data-work-id]")?.getAttribute("data-work-id"),
    title: document.querySelector("[class*=giftWorkTitle]")?.textContent,
    image: document.querySelector("[class*=giftCover]")?.getAttribute("src"),
    links: [...document.querySelectorAll("[class*=giftCard] [class*=linkButton][href^='https://']")].map((node) => node.getAttribute("href")),
    detail: document.querySelector("[class*=giftJourney] a[href^='/works/']")?.getAttribute("href"),
    prompts: document.querySelectorAll("[class*=giftJourney] button").length,
    reason: document.querySelector("[class*=giftReason]")?.textContent,
  }));
  assert.equal(reco.cards, 1);
  assert.equal(reco.id, String(work.id));
  assert.equal(reco.title, work.title);
  assert.equal(reco.image, work.cover);
  assert.deepEqual(reco.links, [publicLink[1]]);
  assert.equal(reco.detail, `/works/${encodeURIComponent(String(work.id))}`);
  assert.equal(reco.prompts, 2);
  assert.ok(reco.reason);
  for (let i = 0; i < 20 && !historyWrites.some((entry) => entry.fixture === "recommendation" && entry.body.messages?.some((message) => message.recommendedWorkId)); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const persistedRecommendation = historyWrites.findLast((entry) => entry.fixture === "recommendation" && entry.body.messages?.some((message) => message.recommendedWorkId))?.body.messages.findLast((message) => message.recommendedWorkId);
  assert.equal(persistedRecommendation?.recommendedWorkId, String(work.id));
  assert.deepEqual(Object.keys(persistedRecommendation).sort(), ["content", "persona", "recommendedWorkId", "role"]);
  assert.ok(historyWrites.filter((entry) => entry.fixture === "recommendation").every((entry) => entry.body.messages.every((message) => message.role !== "user" || !message.recommendedWorkId)));
  await recommendation.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  assert.ok(await recommendation.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
  check("F4/F5: real one-work recommendation renders with recorded link, rationale, catalog detail, and follow-up prompts", () => {});
  await recommendation.close();

  const retry = await openFixture(browser, "retry");
  await retry.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await retry.waitForSelector("textarea");
  await send(retry, "retry fixture");
  await retry.waitForSelector("[class*=error] button");
  assert.ok(await retry.$("[role=alert] button"));
  assert.equal(await retry.$$eval("[class*=userBubble]", (nodes) => nodes.length), 1);
  await retry.$eval("[class*=error] button", (button) => button.click());
  await retry.waitForFunction(() => [...document.querySelectorAll("[class*=bubbleText]")].some((node) => node.textContent?.includes("Fixture reply: retry fixture")));
  const retries = sendBodies.filter((entry) => entry.fixture === "retry" && entry.body.messages?.some((message) => message.role === "user" && message.content === "retry fixture"));
  assert.equal(retries.length, 2);
  assert.deepEqual(retries[0].body.messages, retries[1].body.messages);
  assert.equal(await retry.$$eval("[class*=userBubble]", (nodes) => nodes.length), 1);
  check("F6: failed reply can be retried successfully without duplicate user turns", () => {});
  assert.ok(await retry.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
  await retry.close();

  const longReply = await openFixture(browser, "long-reply");
  await longReply.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await longReply.waitForSelector("textarea");
  await send(longReply, "long fixture response");
  await longReply.waitForFunction(() => [...document.querySelectorAll("[class*=bubbleText]")].some((node) => (node.textContent?.length ?? 0) > 700));
  assert.ok(await longReply.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
  check("390px mobile long reply and composer remain usable without horizontal page overflow", () => {});
  await longReply.close();

  const opening = await openFixture(browser, "opening-failure");
  await opening.waitForSelector("[class*=error] button");
  await opening.$eval("[class*=error] button", (button) => button.click());
  await opening.waitForFunction(() => [...document.querySelectorAll("[class*=bubbleText]")].some((node) => node.textContent?.includes("Fixture opening")));
  check("F7: opening failure exposes a working retry and recovers to the welcome", () => {});
  await opening.close();

  const history = await openFixture(browser, "history-restore");
  await history.waitForFunction(() => [...document.querySelectorAll("[class*=bubbleText]")].some((node) => node.textContent?.includes("以前の希望")));
  assert.equal(await history.$$eval("[class*=bubbleText]", (nodes) => nodes.map((node) => node.textContent?.trim()).slice(0, 3).join("|")), "履歴の案内です|以前の希望|Fractal Hands をご紹介します");
  await history.waitForSelector("[class*=giftCard][data-work-id]");
  const restoredCard = await history.evaluate(() => ({
    workId: document.querySelector("[class*=giftCard][data-work-id]")?.getAttribute("data-work-id"),
    title: document.querySelector("[class*=giftWorkTitle]")?.textContent,
    cover: document.querySelector("[class*=giftCover]")?.getAttribute("src"),
    links: [...document.querySelectorAll("[class*=giftCard] [class*=linkButton][href^='https://']")].map((node) => node.getAttribute("href")),
    reason: document.querySelector("[class*=giftReason]")?.textContent ?? null,
  }));
  assert.deepEqual(restoredCard, { workId: String(work.id), title: work.title, cover: work.cover, links: [publicLink[1]], reason: null });
  check("F8-A: stable work ID restores one current Catalog card with recorded public link", () => {});
  await history.close();

  const legacyHistory = await openFixture(browser, "history-legacy");
  await legacyHistory.waitForFunction(() => [...document.querySelectorAll("[class*=bubbleText]")].some((node) => node.textContent?.includes("以前の希望")));
  assert.equal(await legacyHistory.$("[class*=giftCard]"), null);
  assert.equal(await legacyHistory.$("[class*=error]"), null);
  check("F8-B: legacy message-only history restores without a card, error, or migration", () => {});
  await legacyHistory.close();

  const invalidHistory = await openFixture(browser, "history-invalid");
  await invalidHistory.waitForFunction(() => [...document.querySelectorAll("[class*=bubbleText]")].some((node) => node.textContent?.includes("Fractal Hands をご紹介します")));
  assert.equal(await invalidHistory.$("[class*=giftCard]"), null);
  assert.equal(await invalidHistory.$("[class*=error]"), null);
  check("F8-C: unknown work ID preserves assistant text and displays no fake/title-fallback card", () => {});
  await invalidHistory.close();

  const unavailable = await openFixture(browser, "history-unavailable");
  await unavailable.waitForFunction(() => document.body.innerText.includes("会話の復元を再試行"));
  const unavailableId = await unavailable.evaluate(() => localStorage.getItem("musiam_chat_conversation_id_v1"));
  assert.equal(sendBodies.filter((entry) => entry.fixture === "history-unavailable" && entry.body.messages?.length === 0).length, 0);
  assert.equal(historyWrites.filter((entry) => entry.fixture === "history-unavailable").length, 0);
  assert.equal(await unavailable.$eval("textarea", (node) => node.disabled), true);
  assert.ok(await unavailable.evaluate(() => document.body.innerText.includes("保存された会話を確認できません")));
  await unavailable.$$eval("button", (buttons) => buttons.find((button) => button.textContent?.includes("会話の復元を再試行"))?.click());
  await unavailable.waitForFunction(() => document.body.innerText.includes("以前の希望"));
  assert.equal(await unavailable.evaluate(() => localStorage.getItem("musiam_chat_conversation_id_v1")), unavailableId);
  assert.equal(sendBodies.filter((entry) => entry.fixture === "history-unavailable" && entry.body.messages?.length === 0).length, 0);
  assert.equal(historyWrites.filter((entry) => entry.fixture === "history-unavailable").length, 0);
  check("F9: history 503 leaves the saved ID untouched and retries restoration without an opening write", () => {});
  await unavailable.close();

  const deletion = await openFixture(browser, "history-delete-retry");
  await deletion.waitForFunction(() => document.body.innerText.includes("以前の希望"));
  const oldId = await deletion.evaluate(() => localStorage.getItem("musiam_chat_conversation_id_v1"));
  await deletion.$$eval("button", (buttons) => buttons.find((button) => button.textContent?.includes("記憶を消去して新しく始める"))?.click());
  await deletion.waitForFunction(() => document.body.innerText.includes("保存された会話を削除できませんでした"));
  assert.equal(await deletion.evaluate(() => localStorage.getItem("musiam_chat_conversation_id_v1")), oldId);
  assert.ok(await deletion.evaluate(() => document.body.innerText.includes("以前の希望")));
  assert.equal(await deletion.evaluate(() => document.body.innerText.includes("会話の記憶を消去しました")), false);
  assert.ok(await deletion.$$eval("button", (buttons) => buttons.some((button) => button.textContent?.includes("削除を再試行") && !button.disabled)));
  assert.equal(sendBodies.filter((entry) => entry.fixture === "history-delete-retry" && entry.body.messages?.length === 0).length, 0);
  check("DELETE 503 keeps the old ID and restored conversation, shows failure and retry, and does not reset Chat", () => {});
  await deletion.$$eval("button", (buttons) => buttons.find((button) => button.textContent?.includes("削除を再試行"))?.click());
  await deletion.waitForFunction(() => document.body.innerText.includes("会話の記憶を消去しました"));
  assert.notEqual(await deletion.evaluate(() => localStorage.getItem("musiam_chat_conversation_id_v1")), oldId);
  assert.equal(historyDeletes.filter((entry) => entry.fixture === "history-delete-retry").length, 2);
  assert.ok(historyDeletes.filter((entry) => entry.fixture === "history-delete-retry").every((entry) => entry.conversationId === oldId));
  await deletion.waitForFunction(() => document.body.innerText.includes("Fixture opening"));
  assert.equal(sendBodies.filter((entry) => entry.fixture === "history-delete-retry" && entry.body.messages?.length === 0).length, 1);
  check("DELETE retry success clears the old ID once and resets Chat once without stuck loading", () => {});
  await deletion.close();

  const directDelete = await openFixture(browser, "history-delete-success");
  await directDelete.waitForFunction(() => document.body.innerText.includes("以前の希望"));
  await directDelete.$$eval("button", (buttons) => buttons.find((button) => button.textContent?.includes("記憶を消去して新しく始める"))?.click());
  await directDelete.waitForFunction(() => document.body.innerText.includes("会話の記憶を消去しました"));
  assert.equal(historyDeletes.filter((entry) => entry.fixture === "history-delete-success").length, 1);
  check("direct DELETE success acknowledges deletion once", () => {});
  await directDelete.close();

  const disable = await openFixture(browser, "history-disable-retry");
  await disable.waitForFunction(() => document.body.innerText.includes("以前の希望"));
  const disableId = await disable.evaluate(() => localStorage.getItem("musiam_chat_conversation_id_v1"));
  await disable.$eval("[class*=memoryControl] input[type=checkbox]", (input) => input.click());
  await disable.waitForFunction(() => document.body.innerText.includes("保存された会話を削除できませんでした"));
  assert.equal(await disable.$eval("[class*=memoryControl] input[type=checkbox]", (input) => input.checked), true);
  assert.equal(await disable.evaluate(() => localStorage.getItem("musiam_chat_memory_enabled_v1")), null);
  await disable.$$eval("button", (buttons) => buttons.find((button) => button.textContent?.includes("削除を再試行"))?.click());
  await disable.waitForFunction(() => document.body.innerText.includes("会話の記憶を停止しました"));
  assert.equal(await disable.$eval("[class*=memoryControl] input[type=checkbox]", (input) => input.checked), false);
  assert.equal(await disable.evaluate(() => localStorage.getItem("musiam_chat_memory_enabled_v1")), "off");
  assert.equal(await disable.evaluate(() => localStorage.getItem("musiam_chat_conversation_id_v1")), disableId);
  assert.ok(await disable.evaluate(() => document.body.innerText.includes("以前の希望")));
  assert.equal(historyDeletes.filter((entry) => entry.fixture === "history-disable-retry").length, 2);
  check("memory-off DELETE failure retains opt-in and retries without resetting the current conversation", () => {});
  await disable.close();

  const stale = await openFixture(browser, "stale");
  await stale.waitForSelector("textarea");
  await send(stale, "stale fixture");
  await stale.$$eval("button", (buttons) => buttons.find((button) => button.textContent?.includes("記憶を消去して新しく始める"))?.click());
  await stale.waitForFunction(() => [...document.querySelectorAll("[class*=bubbleText]")].some((node) => node.textContent?.includes("Fixture opening")));
  await new Promise((resolve) => setTimeout(resolve, 1900));
  assert.equal(await stale.$$eval("[class*=bubbleText]", (nodes) => nodes.some((node) => node.textContent?.includes("Fixture reply: stale fixture"))), false);
  check("F10: delayed stale reply cannot replace the newer conversation", () => {});
  await stale.close();

  const mobile = await openFixture(browser, "mobile");
  await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await mobile.waitForSelector("textarea");
  await mobile.waitForFunction(() => {
    const input = document.querySelector("textarea");
    return Boolean(input && input.getBoundingClientRect().width > 0);
  });
  const mobileMetrics = await mobile.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth, nav: document.querySelector("nav")?.getBoundingClientRect().width, composer: document.querySelector("textarea")?.getBoundingClientRect().width }));
  assert.ok(mobileMetrics.content <= mobileMetrics.viewport + 1, JSON.stringify(mobileMetrics));
  assert.ok(mobileMetrics.composer > 0);
  check("390px mobile initial state has visible navigation and composer without horizontal page overflow", () => {});
  await mobile.close();
} catch (error) {
  failure = error;
} finally {
  await Promise.race([browser.close(), new Promise((resolve) => setTimeout(resolve, 1500))]);
  if (browser.process()?.exitCode === null) browser.process()?.kill("SIGKILL");
}

if (failure) {
  console.error(failure);
  process.exit(1);
}
console.log(`CHAT_STRENGTHENING_02_BROWSER=PASS checks=${passed} blocked=${blocked} provider_calls=0 external_requests_blocked=${externalBlocked} chrome=153`);
process.exit(blocked ? 2 : 0);
