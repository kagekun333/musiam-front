import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chatResponseEvents, observeChatResponse } from "../../src/lib/analytics/chat.server";
import { GrowthEventSchema } from "../../src/lib/analytics/schema";
import { growthAnalyticsKey, growthAnalyticsScope, persistGrowthEvents } from "../../src/lib/analytics/store.server";

async function main() {
  const payload = {
    ok: true,
    assistantText: "private email alice@example.test health address name",
    card: {
      title: "private title",
      id: "private-work-id",
      links: [
        { kind: "listen", url: "https://private.test/?email=alice" },
        { kind: "open", url: "https://private.test/open" },
        { kind: "listen" },
        { kind: "private", url: "https://private.test" },
      ],
    },
    cta: { href: "https://private.test/buy", label: "private" },
    productId: "private-product",
    actionResult: { status: "LINK_PRESENTED", kind: "listen", workId: "private-work-id" },
    interestBridge: { action: "offer", id: "private" },
    memory: { residue: "private" },
  };

  const original = JSON.stringify(payload);
  const events = chatResponseEvents(payload, 1);
  assert.deepEqual(events.map((event) => event.event), [
    "chat_first_request",
    "recommendation_presented",
    "work_links_presented",
    "action_link_presented",
    "product_interest_bridge",
    "product_cta_presented",
  ]);
  assert.equal(events.find((event) => event.event === "work_links_presented")?.properties.linkCount, 2);
  assert.equal(new Set(events.map((event) => event.requestId)).size, 1);
  assert.equal(new Set(events.map((event) => event.eventId)).size, events.length);

  const serialized = JSON.stringify(events);
  for (const forbidden of [
    "private",
    "alice",
    "email",
    "health",
    "address",
    "private-work-id",
    "https://",
    "private-product",
  ]) {
    assert(!serialized.includes(forbidden), `analytics leaked forbidden value: ${forbidden}`);
  }

  for (const event of events) assert(GrowthEventSchema.safeParse(event).success);

  for (const key of [
    "email", "name", "address", "health", "message", "url", "ip",
    "sessionId", "conversationId", "workId", "productId", "title",
  ]) {
    assert(!GrowthEventSchema.safeParse({ ...events[0], [key]: "private" }).success);
    assert(!GrowthEventSchema.safeParse({
      ...events[0],
      properties: { [key]: "private" },
    }).success);
  }

  assert.deepEqual(chatResponseEvents({ ok: false }, 0), []);
  assert.deepEqual(chatResponseEvents({ ok: true }, 0).map((event) => event.event), ["chat_start"]);
  assert.deepEqual(chatResponseEvents({ ok: true }, 2), []);

  let captured = 0;
  await observeChatResponse(payload, 1, async (rows) => { captured = rows.length; });
  assert.equal(captured, events.length);
  await observeChatResponse(payload, 1, async () => { throw new Error("private"); });
  assert.equal(JSON.stringify(payload), original);

  assert.equal(growthAnalyticsScope("production"), "production");
  assert.equal(growthAnalyticsScope("preview"), "preview");
  assert.equal(growthAnalyticsScope("development"), "development");
  assert.equal(growthAnalyticsScope(undefined), "local");
  assert.equal(growthAnalyticsKey("2026-09-30T12:00:00.000Z", "production"), "growth:v1:production:count-chat:2026-09-30");
  assert.equal(growthAnalyticsKey("2026-09-30T12:00:00.000Z", "preview"), "growth:v1:preview:count-chat:2026-09-30");
  assert.notEqual(
    growthAnalyticsKey("2026-09-30T12:00:00.000Z", "production"),
    growthAnalyticsKey("2026-09-30T12:00:00.000Z", "preview"),
  );

  process.env.MUSIAM_ANALYTICS_SPINE_ENABLED = "0";
  assert.equal(await persistGrowthEvents(events), "disabled");

  const source = readFileSync("src/pages/api/chat-experience-v3.ts", "utf8");
  assert.equal((source.match(/res\.status\(200\)\.json/g) ?? []).length, 1);
  assert(source.includes("await observeChatResponse(payload, userTurns)"));
  assert(!source.includes("observeCountChat"));
  assert(!source.includes("storeGrowthEvents"));

  console.log(JSON.stringify({
    verdict: "MUSIAM_GROWTH_ANALYTICS_SPINE_V1=PASS_LOCAL",
    emittedEvents: events.map((event) => event.event),
    piiProjection: "PASS",
    storageDisabledDuringValidation: true,
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
