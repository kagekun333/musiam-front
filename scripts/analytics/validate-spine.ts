import assert from "node:assert/strict";
import { createServer } from "node:http";
import { chatResponseEvents, classifyGrowthTraffic, observeChatResponse, parseAnalyticsDelivery } from "../../src/lib/analytics/chat.server";
import { GrowthEventSchema } from "../../src/lib/analytics/schema";
import { growthAnalyticsKey, growthEventWrite, persistGrowthEvents, writeGrowthEvents, type GrowthBackend } from "../../src/lib/analytics/store.server";

// Contract model ONLY: this does not execute Lua or prove hosted Redis behavior.
class ModelBackend implements GrowthBackend {
  values = new Map<string, unknown>();
  expires = new Map<string, number>();
  fault: "before-row" | "after-row" | "expiry" | null = null;
  async eval(_script: string, keys: string[], args: (string | number)[]) {
    const [budgetKey, rowKey] = keys;
    const [expiry, id, encoded, cap] = args;
    const budget = this.values.get(budgetKey);
    const stored = this.values.get(rowKey);
    if (budget !== undefined && (typeof budget !== "string" || !/^\d+$/.test(budget))) throw new Error("wrong budget type/value");
    if (stored !== undefined && typeof stored !== "string") throw new Error("wrong event type");
    if (stored !== undefined) {
      const row = GrowthEventSchema.parse(JSON.parse(stored as string));
      if (row.eventId !== id) throw new Error("wrong existing row");
      return 0;
    }
    if (Number(budget ?? 0) >= Number(cap)) return 2;
    if (this.fault === "expiry") throw new Error("expiry failed");
    this.values.set(budgetKey, String(Number(budget ?? 0) + 1));
    this.expires.set(budgetKey, Number(expiry));
    if (this.fault === "before-row") throw new Error("row SET failed after budget increment");
    // SET NX EXAT stores the row and its expiry as one command.
    this.values.set(rowKey, String(encoded)); this.expires.set(rowKey, Number(expiry));
    if (this.fault === "after-row") throw new Error("reply lost after storing row");
    return 1;
  }
}
async function main() {
  const now = Date.UTC(2026, 9, 1, 23, 59, 58);
  const delivery = { id: "ed4a6ec0-6a93-4b74-8c63-378bccf85cf9", createdAt: now };
  const payload = { ok: true, assistantText: "private alice@example.test", card: { title: "private", id: "private", links: [{kind:"listen", url:"https://private.test"}] }, cta: { href:"https://private.test" }, actionResult: {status:"LINK_PRESENTED", kind:"listen"}, interestBridge:{action:"offer"} };
  const original = JSON.stringify(payload);
  const transportBody = JSON.stringify({ analyticsDelivery: delivery });
  const events = chatResponseEvents(payload, 1, JSON.parse(transportBody).analyticsDelivery, "unknown", now);
  const retransmitted = chatResponseEvents(payload, 1, JSON.parse(transportBody).analyticsDelivery, "unknown", now + 10000);
  assert.deepEqual(events, retransmitted, "retransmitting the same request body across midnight retains identity, timestamp and day");
  const httpBackend = new ModelBackend();
  let requests = 0;
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = JSON.parse(Buffer.concat(chunks).toString());
    const rows = chatResponseEvents(payload, 1, body.analyticsDelivery, "unknown", now + 10000);
    const result = await writeGrowthEvents(rows, httpBackend, "preview", now + 10000);
    if (++requests === 1) { res.destroy(); return; } // request persisted; network response lost
    res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ok:result === "stored"}));
  });
  await new Promise<void>(resolve=>server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert(address && typeof address !== "string");
    const url = `http://127.0.0.1:${address.port}`;
    const send = () => fetch(url, {method:"POST", headers:{"Content-Type":"application/json"}, body:transportBody});
    await assert.rejects(send);
    assert.equal((await (await send()).json()).ok, true);
    assert.equal([...httpBackend.values.keys()].filter(k=>k.includes(":event:")).length, events.length);
  } finally {
    const stopped = new Promise<void>(resolve=>server.close(()=>resolve()));
    server.closeAllConnections(); await stopped;
  }
  const fresh = chatResponseEvents(payload, 1, {...delivery, id:"6f08e9cd-7264-4944-b13a-8eeed6574804"}, "unknown", now);
  assert.notEqual(events[0].eventId, fresh[0].eventId);
  assert.deepEqual(events.map(e=>e.event), ["chat_first_request","recommendation_presented","work_links_presented","action_link_presented","product_interest_bridge","product_cta_presented"]);
  assert.deepEqual(chatResponseEvents(payload, 1, undefined, "unknown", now), []);
  for (const invalid of [{id:"alice@example.test",createdAt:now},{...delivery, sessionId:"private"},{...delivery, createdAt:now-31*86400000},{...delivery,createdAt:now+300001}]) {
    assert.equal(parseAnalyticsDelivery(invalid, now), null);
    assert.deepEqual(chatResponseEvents(payload, 1, invalid, "unknown", now), []);
  }
  for (const forbidden of ["private", "alice", "https://", delivery.id]) assert(!JSON.stringify(events).includes(forbidden));
  for (const row of events) assert(GrowthEventSchema.safeParse(row).success);
  for (const key of ["email", "name", "address", "health", "message", "url", "ip", "sessionId", "conversationId", "workId", "productId", "title", "userAgent", "authorization"]) {
    assert(!GrowthEventSchema.safeParse({...events[0], [key]: "private"}).success);
    assert(!GrowthEventSchema.safeParse({...events[0], properties: {[key]: "private"}}).success);
  }
  assert.equal(new Set(events.map(e=>e.requestId)).size, 1);
  assert.equal(new Set(events.map(e=>e.eventId)).size, events.length);
  assert.deepEqual(chatResponseEvents({ok:false}, 0, delivery, "unknown", now), []);
  assert.deepEqual(chatResponseEvents({ok:true}, 0, delivery, "unknown", now).map(e=>e.event), ["chat_start"]);
  assert.deepEqual(chatResponseEvents({ok:true}, 2, delivery, "unknown", now), []);
  const linkRows = chatResponseEvents({ok:true,card:{links:[{kind:"listen",url:"https://private.test"},{kind:"open",url:"https://private.test/open"},{kind:"listen"},{kind:"private",url:"https://private.test"}]}}, 2, delivery, "unknown", now);
  assert.equal(linkRows.find(e=>e.event==="work_links_presented")?.properties.linkCount, 2);
  assert.equal(classifyGrowthTraffic("production", "Mozilla", "Bearer test-only-secret", "test-only-secret"), "synthetic_test");
  assert.equal(classifyGrowthTraffic("production", "Mozilla", "Bearer attacker", "test-only-secret"), "unknown");
  assert.equal(classifyGrowthTraffic("production", "Mozilla", "é".repeat(23), "test-only-secret"), "unknown");
  assert.equal(classifyGrowthTraffic("production", "Googlebot/2.1", undefined, ""), "bot");
  assert.equal(classifyGrowthTraffic("production", "Mozilla", undefined, ""), "unknown");
  assert.equal(classifyGrowthTraffic("preview", "Mozilla"), "synthetic_test");
  assert.notEqual(growthAnalyticsKey(new Date(now).toISOString(), "production"), growthAnalyticsKey(new Date(now).toISOString(), "preview"));
  const plan = growthEventWrite(events[0], "preview", now);
  assert.equal(plan.args[0], Math.floor(now/86400000)*86400+31*86400);
  assert.deepEqual(plan, growthEventWrite(retransmitted[0], "preview", now+10000));
  assert.throws(()=>growthEventWrite(events[0], "preview", Number(plan.args[0])*1000));
  const model = new ModelBackend();
  assert.equal(await writeGrowthEvents(events, model, "preview", now), "stored");
  const rows = [...model.values.keys()].filter(k=>k.includes(":event:"));
  assert.equal(rows.length, events.length);
  assert.equal(await writeGrowthEvents(retransmitted, model, "preview", now+10000), "stored");
  assert.equal([...model.values.keys()].filter(k=>k.includes(":event:")).length, rows.length);
  for (const fault of ["before-row", "after-row", "expiry"] as const) {
    const model = new ModelBackend(); model.fault = fault;
    assert.equal(await writeGrowthEvents([events[0]], model, "preview", now), "unavailable");
    model.fault = null;
    assert.equal(await writeGrowthEvents([events[0]], model, "preview", now+10000), "stored");
    assert.equal([...model.values.keys()].filter(k=>k.includes(":event:")).length, 1);
    assert.equal(model.expires.get(plan.keys[1]), plan.args[0]);
  }
  for (const badKey of plan.keys) {
    const model = new ModelBackend(); model.values.set(badKey, []);
    assert.equal(await writeGrowthEvents([events[0]], model, "preview", now), "unavailable");
    assert.equal(model.values.size, 1, "wrong key types cause no additional write");
  }
  const partial = new ModelBackend(); partial.fault = "after-row";
  assert.equal(await writeGrowthEvents(events, partial, "preview", now), "unavailable");
  partial.fault = null;
  assert.equal(await writeGrowthEvents(retransmitted, partial, "preview", now+10000), "stored");
  assert.equal([...partial.values.keys()].filter(k=>k.includes(":event:")).length, events.length);
  const corrupt = new ModelBackend(); corrupt.values.set(plan.keys[1], "not an event row");
  assert.equal(await writeGrowthEvents([events[0]], corrupt, "preview", now), "unavailable");
  const invalidBudget = new ModelBackend(); invalidBudget.values.set(plan.keys[0], "not a number");
  assert.equal(await writeGrowthEvents([events[0]], invalidBudget, "preview", now), "unavailable");
  assert(events.every(e=>e.event !== "paid" && e.event !== "checkout"));
  const capped = new ModelBackend(); capped.values.set(plan.keys[0], "100000");
  assert.equal(await writeGrowthEvents([events[0]], capped, "preview", now), "capped");
  assert(!capped.values.has(plan.keys[1]));
  let captured = 0;
  // Observer uses the wall-clock validator; use a fresh valid delivery here.
  const current = {...delivery, createdAt:Date.now()};
  await observeChatResponse(payload, 1, async e=>{captured=e.length;}, current);
  assert.equal(captured, events.length);
  await observeChatResponse(payload, 1, async()=>{throw Error("private");}, current);
  assert.equal(JSON.stringify(payload), original);
  process.env.MUSIAM_ANALYTICS_SPINE_ENABLED="0";
  assert.equal(await persistGrowthEvents(events), "disabled");
  console.log(JSON.stringify({verdict:"PASS_LOCAL_CONTRACTS_REDIS_UNVERIFIED", projectionPrivacy:"PASS", transportReplayAcrossMidnight:"PASS", localHttpLostResponseReplay:"PASS", authenticatedSyntheticClassification:"PASS", failureContractModel:"PASS", actualRedisLua:"UNRUN", hostedRedis:"UNRUN", productionGate:"NOT_PASS"}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
