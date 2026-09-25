/* global console */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const record = JSON.parse(read("ops/product/chat-history-runtime-readiness-20260925.json"));
const doc = read("docs/AI/CHAT_HISTORY_RUNTIME_READINESS.md");
const api = read("src/pages/api/chat-history.ts");
const store = read("src/lib/chat-history.server.ts");
const recommendation = read("src/lib/chat-history-recommendation.ts");
const contract = read("src/lib/chat-ui-contract.ts");
const page = read("src/pages/chat.tsx");
const activeChat = read("src/pages/api/chat-experience-v3.ts");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const allowed = new Set([
  "docs/AI/CHAT_HISTORY_RUNTIME_READINESS.md",
  "ops/product/chat-history-runtime-readiness-20260925.json",
  "scripts/validate-chat-history-runtime-readiness.mjs",
]);
let checks = 0;
function check(name, fn) {
  fn();
  checks += 1;
  console.log(`PASS ${checks}: ${name.replace(/^\d+\s/, "")}`);
}

check("1 starting HEAD remains an ancestor and branch is locked", () => {
  assert.equal(record.startingHead, "e6b213a807d327d165db00b3d2f94fc6f3834e36");
  assert.equal(record.branch, git("branch", "--show-current"));
  execFileSync("git", ["merge-base", "--is-ancestor", record.startingHead, "HEAD"]);
});
check("2 application and configuration changes are zero", () => {
  const changed = [git("diff", "--name-only", record.startingHead, "HEAD"), git("diff", "--name-only"), git("diff", "--cached", "--name-only")].flatMap((s) => s.split("\n").filter(Boolean));
  assert.ok(changed.every((path) => allowed.has(path)), `out-of-scope tracked change: ${changed.filter((path) => !allowed.has(path)).join(", ")}`);
  assert.equal(record.operations.applicationChanges, 0);
  assert.equal(record.operations.configChanges, 0);
});
check("3 required environment alternatives are inventoried from source", () => {
  for (const name of record.environment.variables.map((entry) => entry.name)) assert.match(store, new RegExp(`process\\.env\\.${name}`));
  assert.deepEqual(record.environment.requiredAlternatives, [["UPSTASH_REDIS_REST_URL", "KV_REST_API_URL"], ["UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_TOKEN"]]);
});
check("4 secret values read count remains zero", () => assert.equal(record.operations.secretValuesRead, 0));
check("5 environment mutations remain zero", () => assert.equal(record.operations.envMutations, 0));
check("6 customer history reads remain zero", () => assert.equal(record.operations.customerHistoryReads, 0));
check("7 customer history writes remain zero", () => assert.equal(record.operations.customerHistoryWrites, 0));
check("8 customer history deletes remain zero", () => assert.equal(record.operations.customerHistoryDeletes, 0));
check("9 fixed key namespace is reviewed", () => {
  assert.match(store, /`chat-history:v1:\$\{conversationId\}`/);
  assert.equal(record.storage.key, "chat-history:v1:{conversationId}");
});
check("10 UUID conversation boundary is reviewed", () => {
  assert.match(api, /ConversationIdSchema = z\.string\(\)\.uuid\(\)/);
  assert.match(page, /isChatConversationId\(id\)/);
  assert.match(record.privacy.conversationIdCaveat, /bearer/);
});
check("11 persisted message allowlist is reviewed", () => {
  assert.deepEqual(record.privacy.persistedMessageAllowlist, ["role", "content", "persona", "recommendedWorkId"]);
  assert.match(api, /normalizeHistoryForCatalog\(parsed\.data\.messages, catalog\)/);
  assert.match(contract, /return \[\{[\s\S]*?role: raw\.role,[\s\S]*?content,[\s\S]*?recommendedWorkId/);
});
check("12 recommendation ID contract is reviewed", () => {
  assert.match(recommendation, /canonicalWorkIds\(catalog\)/);
  assert.match(contract, /raw\.role === "assistant"/);
  assert.match(contract, /rawWorkId\.length <= 180/);
  assert.match(api, /resolveRestoredRecommendation\(messages, catalog\)/);
  assert.match(record.privacy.recommendedWorkId, /exact merged Canonical Catalog ID/);
});
check("13 PUT refresh TTL semantics are reviewed", () => {
  assert.match(store, /CHAT_HISTORY_TTL_SECONDS = 60 \* 60 \* 24 \* 90/);
  assert.match(store, /\.set\(key\(input\.conversationId\), record, \{ ex: CHAT_HISTORY_TTL_SECONDS \}\)/);
  assert.equal(record.storage.ttlSeconds, 7776000);
});
check("14 message and payload bounds are reviewed", () => {
  assert.match(api, /content: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(2000\)/);
  assert.match(api, /\.max\(CHAT_HISTORY_MAX_MESSAGES\)/);
  assert.equal(record.storage.httpBodyLimitExplicitInHistoryRoute, false);
  assert.ok(record.findings.some((f) => f.code === "PAYLOAD_BOUNDING_GAP"));
});
check("15 GET PUT DELETE failure semantics are reviewed", () => {
  for (const method of ["GET", "PUT", "DELETE"]) assert.match(api, new RegExp(`req\\.method === "${method}"`));
  assert.match(api, /status\(503\)\.json\(\{ ok: false, error: "history_unavailable" \}\)/);
  assert.match(record.storage.storageUnavailable, /GET, PUT and DELETE/);
});
check("16 read-then-set concurrency risk is recorded", () => {
  assert.match(store, /existing = await readChatHistory/);
  assert.match(store, /await getRedis\(\)\.set/);
  assert.ok(record.findings.some((f) => f.code === "CONCURRENCY_RISK"));
});
check("17 exact DELETE and false-success boundary are recorded", () => {
  assert.match(store, /\.del\(key\(conversationId\)\)/);
  assert.match(page, /try \{ await fetch\(`\/api\/chat-history\?conversationId=/);
  assert.ok(record.findings.some((f) => f.code === "DELETE_FALSE_SUCCESS" && f.severity === "BLOCKER"));
});
check("18 raw-error logging boundary is recorded", () => {
  assert.match(api, /console\.error\("chat_history_failed", error\)/);
  assert.ok(record.findings.some((f) => f.code === "ERROR_LOG_PRIVACY_RISK"));
});
check("19 Production deployment parity is explicitly unverified", () => {
  assert.equal(record.deployment.currentLocalHistoryContractDeployed, "UNVERIFIED");
  assert.equal(record.deployment.currentActiveProductionDeployment, "UNVERIFIED");
});
check("20 Redis connectivity is explicitly unverified", () => assert.equal(record.deployment.redisConnectivity, "UNVERIFIED_WITHOUT_SECRET_ACCESS"));
check("21 Strengthening 02 local history fixtures passed", () => {
  assert.match(record.validation.strengthening02Deterministic, /^PASS 16\/16$/);
  assert.match(record.validation.strengthening02Browser, /^PASS 13\/13/);
});
check("22 R7-C1 and R7-C2 passed", () => {
  assert.equal(record.validation.r7c1, "PASS 24/24");
  assert.equal(record.validation.r7c2, "PASS 20/20");
});
check("23 analytics additions remain zero", () => {
  assert.equal(record.operations.analyticsAdditions, 0);
  assert.equal(record.validation.chatSales, "NOT_APPLICABLE_CURRENT_CHAT_PRODUCT_LANE");
});
check("24 payment and entitlement changes remain zero", () => {
  assert.equal(record.operations.paymentMutations, 0);
  assert.doesNotMatch(store, /entitlement|checkout|payment/i);
  assert.doesNotMatch(activeChat, /reserveCountAccess|checkout\.sessions/);
});
check("25 deployment and push remain zero", () => {
  assert.equal(record.operations.deploys, 0);
  assert.equal(record.operations.pushes, 0);
});
check("26 blocked readiness follows an observed runtime safety blocker", () => {
  assert.equal(record.readiness, "BLOCKED_RUNTIME_SAFETY");
  assert.ok(record.findings.some((f) => f.severity === "BLOCKER"));
  assert.equal(record.environment.metadataStatus, "UNVERIFIED_DUE_TO_SECRET_BOUNDARY");
});
check("27 truth boundary and no client credential path are recorded", () => {
  assert.match(record.truthBoundary, /Fixture PASS is not Production Redis reliability/);
  assert.match(doc, /REDIS_CONNECTIVITY = UNVERIFIED_WITHOUT_SECRET_ACCESS/);
  assert.equal(record.environment.clientSecretExposure, 0);
  assert.doesNotMatch(page + contract, /UPSTASH_REDIS_REST|KV_REST_API|NEXT_PUBLIC_.*REDIS/);
});

assert.equal(checks, 27);
console.log(`CHAT_HISTORY_RUNTIME_READINESS_VALIDATOR=PASS checks=${checks} verdict=${record.readiness} customer_redis_ops=0`);
