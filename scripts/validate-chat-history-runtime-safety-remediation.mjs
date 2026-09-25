/* global console */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const record = JSON.parse(read("ops/product/chat-history-runtime-safety-remediation-20260925.json"));
const doc = read("docs/AI/CHAT_HISTORY_RUNTIME_SAFETY_REMEDIATION.md");
const api = read("src/pages/api/chat-history.ts");
const store = read("src/lib/chat-history.server.ts");
const page = read("src/pages/chat.tsx");
const browser = read("scripts/fixture-chat-strengthening-02.browser.mjs");
const safety = read("scripts/fixture-chat-history-runtime-safety.mjs");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const allowed = new Set([
  "docs/AI/CHAT_HISTORY_RUNTIME_SAFETY_REMEDIATION.md",
  "ops/product/chat-history-runtime-safety-remediation-20260925.json",
  "scripts/validate-chat-history-runtime-safety-remediation.mjs",
  "scripts/fixture-chat-history-runtime-safety.mjs",
  "scripts/fixture-chat-strengthening-02.browser.mjs",
  "src/pages/api/chat-history.ts",
  "src/pages/chat.tsx",
]);
let count = 0;
function check(name, fn) {
  fn();
  count += 1;
  console.log(`PASS ${count}: ${name}`);
}

check("starting HEAD and branch locked", () => {
  assert.equal(record.startingHead, "333ca0adb4fdb1d7a29264edc6c7ec830126b49d");
  assert.equal(record.branch, git("branch", "--show-current"));
  execFileSync("git", ["merge-base", "--is-ancestor", record.startingHead, "HEAD"]);
});
check("prior audit and Strengthening 02 authority preserved", () => {
  assert.equal(record.priorAudit, "CHAT_HISTORY_RUNTIME_READINESS = AUDITED_COMMITTED");
  const historical = ["docs/AI/CHAT_HISTORY_RUNTIME_READINESS.md", "ops/product/chat-history-runtime-readiness-20260925.json", "docs/AI/PRODUCT_LANE_A_CHAT_STRENGTHENING_02.md", "ops/product/chat-strengthening-02-20260925.json"];
  for (const path of historical) assert.equal(git("diff", record.startingHead, "--", path), "");
});
check("explicit application and evidence allowlist", () => {
  const changes = execFileSync("git", ["status", "--porcelain=v1"], { encoding: "utf8" }).split("\n").filter(Boolean).map((line) => line.slice(3));
  assert.ok(changes.every((path) => allowed.has(path) || path === record.protectedUntracked), changes.join(", "));
});
check("DELETE false success removed", () => {
  assert.match(page, /deleted = response\.ok && result\?\.ok === true/);
  assert.match(page, /if \(!await queueHistoryDeletion\(id\)\) return/);
  assert.equal(record.delete.failureFixture, "PASS");
});
check("DELETE failure retry verified", () => {
  assert.match(page, /setHistoryDeleteError\(true\)/);
  assert.match(page, /削除を再試行/);
  assert.match(browser, /history-delete-retry/);
  assert.equal(record.delete.retryFixture, "PASS");
});
check("direct DELETE success verified", () => {
  assert.match(browser, /history-delete-success/);
  assert.equal(record.delete.directSuccessFixture, "PASS");
});
check("local state is not cleared before success", () => {
  assert.match(page, /if \(!await queueHistoryDeletion\(id\)\) return;\s*conversationIdRef\.current = ""/);
  assert.equal(record.delete.prematureLocalClear, false);
});
check("memory-off failure keeps preference and retries", () => {
  assert.match(page, /if \(!await queueHistoryDeletion\(id\)\) return;\s*rememberConversationRef\.current = false/);
  assert.match(browser, /history-disable-retry/);
  assert.equal(record.delete.memoryOffRetryFixture, "PASS");
});
check("queued writes finish before DELETE and duplicate deletion suppressed", () => {
  assert.match(page, /if \(deletingHistoryRef\.current\) return false/);
  assert.match(page, /historyQueueRef\.current = historyQueueRef\.current\.catch/);
  assert.equal(record.delete.duplicateResetAfterRetry, false);
});
check("raw storage exception is not logged", () => {
  assert.doesNotMatch(api, /console\.error\([^\n]*error\)/);
  assert.match(api, /} catch \{\s*logChatHistoryFailure\(operation\)/);
  assert.equal(record.logging.rawStorageExceptionLogged, false);
});
check("safe log fixture passed", () => {
  assert.match(safety, /DO_NOT_LOG_SYNTHETIC_VALUE/);
  assert.match(api, /category: "storage_unavailable"/);
  assert.equal(record.logging.syntheticSecretTextExposed, false);
  assert.equal(record.logging.fixture, "PASS");
});
check("explicit 512 KiB body limit", () => {
  assert.match(api, /sizeLimit: "512kb"/);
  assert.equal(record.payload.bodyLimitBytes, 524288);
});
check("oversize rejected with bounded 413", () => {
  assert.match(safety, /assert\.equal\(oversized\.status, 413\)/);
  assert.equal(record.payload.oversizeStatus, 413);
  assert.ok(record.payload.oversizeResponseBytes < 128);
});
check("oversize storage calls zero", () => {
  assert.match(safety, /body parser rejects before route handler\/storage/);
  assert.equal(record.payload.oversizeStorageCalls, 0);
});
check("concurrency decision and future remedy explicit", () => {
  assert.match(store, /existing = await readChatHistory/);
  assert.equal(record.concurrency.decision, "ACCEPTED_DEFERRED_NON_BLOCKING");
  assert.match(record.concurrency.futureRemediation, /version\/CAS/);
});
check("bearer ID decision and future remedy explicit", () => {
  assert.match(page, /api\/chat-history\?conversationId=/);
  assert.equal(record.bearerIdTransport.decision, "ACCEPTED_DEFERRED");
  assert.match(record.bearerIdTransport.futureRemediation, /transport/);
});
check("client credential exposure remains zero in changed client path", () => {
  assert.doesNotMatch(page, /UPSTASH_REDIS_REST|KV_REST_API|NEXT_PUBLIC_.*REDIS/);
  assert.equal(record.environment.clientSecretExposure, 0);
});
check("Production and Preview env metadata result explicit", () => {
  const names = record.environment.requiredAlternatives.flat();
  for (const name of names) {
    assert.equal(record.environment.production[name], "UNVERIFIED_SECRET_BOUNDARY");
    assert.equal(record.environment.preview[name], "UNVERIFIED_SECRET_BOUNDARY");
  }
  assert.equal(record.environment.metadataVerdict, "ENV_METADATA_UNVERIFIED_SECRET_BOUNDARY");
});
check("secret values read zero", () => assert.equal(record.operations.secretValuesRead, 0));
check("environment mutations zero", () => assert.equal(record.operations.envMutations, 0));
check("customer data and Redis operations zero", () => {
  for (const key of ["customerHistoryReads", "customerHistoryWrites", "customerHistoryDeletes", "redisDataOperations"]) assert.equal(record.operations[key], 0);
});
check("Strengthening 02 new and legacy history regressions passed", () => {
  assert.equal(record.validation.strengthening02, "PASS 16/16");
  assert.equal(record.validation.browser, "PASS 17/17");
  for (const fixture of ["history-restore", "history-legacy", "history-invalid", "history-unavailable", "stale"]) assert.match(browser, new RegExp(fixture));
});
check("R7-C1 and R7-C2 passed", () => {
  assert.equal(record.validation.r7c1, "PASS 24/24");
  assert.equal(record.validation.r7c2, "PASS 20/20");
  assert.match(record.validation.r7a, /primary 450, runtime merged 514/);
  assert.match(record.validation.r7d1, /Exhibition 514, missing 0, Oracle inactive/);
});
check("typecheck and lint evidence bounded", () => {
  assert.equal(record.validation.typecheck, "PASS");
  assert.equal(record.validation.scopedLint, "PASS 0 errors 0 warnings");
  assert.match(record.validation.rootLint, /2 existing warnings/);
});
check("analytics, payment and entitlement changes zero", () => {
  assert.equal(record.operations.analyticsAdditions, 0);
  assert.equal(record.operations.paymentEntitlementChanges, 0);
});
check("provider, deployment and push zero", () => {
  assert.equal(record.operations.providerCalls, 0);
  assert.equal(record.operations.deploys, 0);
  assert.equal(record.operations.pushes, 0);
});
check("readiness derived without converting unknown to missing", () => {
  assert.equal(record.environment.productionRequiredPairConfirmed, false);
  assert.equal(record.environment.productionRequiredPairMissingConfirmed, false);
  assert.equal(record.readiness, "BLOCKED_ENV_METADATA_UNVERIFIED");
  assert.match(record.readinessReason, /neither present nor missing/);
});
check("Production truth boundary and next Gate explicit", () => {
  assert.match(record.truthBoundary, /not Production Redis persistence/);
  assert.match(doc, /No Production Redis customer-data operation/);
  assert.match(record.nextGate, /names-and-targets-only/);
});

assert.equal(count, 28);
console.log(`CHAT_HISTORY_RUNTIME_SAFETY_REMEDIATION_VALIDATOR=PASS checks=${count} readiness=${record.readiness}`);
