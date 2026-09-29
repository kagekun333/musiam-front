import assert from "node:assert/strict";
import { appleReleaseOverlayKey, chatHistoryKey, resolveRuntimeDataScope } from "../src/lib/runtime-data-scope";
import { chatHistoryRedisKey } from "../src/lib/chat-history.server";
import { handleAppleReleaseCron } from "../src/lib/apple-release-cron-handler";
import { readAppleReleaseOverlay } from "../src/lib/apple-release-overlay";

const conversationId = "11111111-1111-4111-8111-111111111111";

async function main() {
assert.equal(resolveRuntimeDataScope("production"), "production");
assert.equal(resolveRuntimeDataScope("preview"), "preview");
assert.equal(resolveRuntimeDataScope("development"), "development");
assert.equal(resolveRuntimeDataScope(undefined), "local");
assert.equal(resolveRuntimeDataScope("unknown"), "local");

assert.equal(chatHistoryKey(conversationId, resolveRuntimeDataScope("production")), `chat-history:v1:${conversationId}`);
assert.equal(chatHistoryKey(conversationId, resolveRuntimeDataScope("preview")), `chat-history:preview:v1:${conversationId}`);
assert.equal(chatHistoryKey(conversationId, resolveRuntimeDataScope("development")), `chat-history:development:v1:${conversationId}`);
assert.equal(chatHistoryKey(conversationId, resolveRuntimeDataScope(undefined)), `chat-history:local:v1:${conversationId}`);
assert.equal(chatHistoryRedisKey(conversationId, "production"), `chat-history:v1:${conversationId}`);
assert.equal(chatHistoryRedisKey(conversationId, "preview"), `chat-history:preview:v1:${conversationId}`);
assert.equal(chatHistoryRedisKey(conversationId, undefined), `chat-history:local:v1:${conversationId}`);

assert.equal(appleReleaseOverlayKey(resolveRuntimeDataScope("production")), "musiam:release-overlay:v1");
assert.equal(appleReleaseOverlayKey(resolveRuntimeDataScope("preview")), "musiam:release-overlay:preview:v1");
assert.equal(appleReleaseOverlayKey(resolveRuntimeDataScope("development")), "musiam:release-overlay:development:v1");
assert.equal(appleReleaseOverlayKey(resolveRuntimeDataScope(undefined)), "musiam:release-overlay:local:v1");

for (const [env, expectedKey] of [
  ["production", "musiam:release-overlay:v1"],
  ["preview", "musiam:release-overlay:preview:v1"],
  ["development", "musiam:release-overlay:development:v1"],
  [undefined, "musiam:release-overlay:local:v1"],
] as const) {
  const requestedKeys: string[] = [];
  const read = await readAppleReleaseOverlay({
    async get(key) { requestedKeys.push(key); return null; },
    async set() { assert.fail("overlay read must not write"); },
  }, new Date(), resolveRuntimeDataScope(env));
  assert.equal(read.status, "EMPTY");
  assert.deepEqual(requestedKeys, [expectedKey]);
}

let unauthorizedDependenciesCalled = false;
const unauthorized = await handleAppleReleaseCron(new Request("https://example.test/api/cron/apple-release-sync"), {
  secret: "fixture-secret",
  getStore() { unauthorizedDependenciesCalled = true; return null; },
  async loadBaseWorks() { unauthorizedDependenciesCalled = true; return []; },
  async fetcher() { unauthorizedDependenciesCalled = true; return new Response("{}", { status: 200 }); },
});
assert.equal(unauthorized.status, 401);
assert.equal(unauthorizedDependenciesCalled, false);

for (const [env, expectedKey] of [
  ["production", "musiam:release-overlay:v1"],
  ["preview", "musiam:release-overlay:preview:v1"],
  ["development", "musiam:release-overlay:development:v1"],
  [undefined, "musiam:release-overlay:local:v1"],
] as const) {
  const priorEnv = process.env.VERCEL_ENV;
  if (env === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = env;
  const readKeys: string[] = [];
  const writeKeys: string[] = [];
  try {
    const result = await handleAppleReleaseCron(new Request("https://example.test/api/cron/apple-release-sync", {
      headers: { authorization: "Bearer fixture-secret" },
    }), {
      secret: "fixture-secret",
      getStore() {
        return {
          async get(key) { readKeys.push(key); return null; },
          async set(key) { writeKeys.push(key); },
        };
      },
      async loadBaseWorks() { return []; },
      async fetcher() { return new Response(JSON.stringify({ results: [] }), { status: 200 }); },
      now: new Date("2026-09-29T12:00:00.000Z"),
    });
    assert.equal(result.status, 200);
    assert.equal(result.body.key, expectedKey);
    assert.deepEqual(readKeys, [expectedKey]);
    assert.deepEqual(writeKeys, [expectedKey]);
  } finally {
    if (priorEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = priorEnv;
  }
}

console.log("PASS chat history and Apple overlay namespace isolation, production compatibility, and unauthorized cron no-op");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
