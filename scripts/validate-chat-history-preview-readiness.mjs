/* global console */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const record = JSON.parse(read("ops/product/chat-history-preview-readiness-20260925.json"));
const report = read("docs/AI/CHAT_HISTORY_PREVIEW_READINESS.md");
const ignore = read(".vercelignore");
const historyApi = read("src/pages/api/chat-history.ts");
const historyStore = read("src/lib/chat-history.server.ts");
const chatApi = read("src/pages/api/chat-experience-v3.ts");
const chatPage = read("src/pages/chat.tsx");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
let checks = 0;
function check(label, fn) { fn(); checks += 1; console.log(`PASS ${checks}: ${label}`); }

check("starting state and branch remain ancestors of this audit", () => {
  assert.equal(record.startingHead, "f69005533dac01e9d6fbd06bc1c630cdf34b565f");
  assert.equal(git("branch", "--show-current"), record.branch);
  execFileSync("git", ["merge-base", "--is-ancestor", record.startingHead, "HEAD"]);
  assert.equal(record.protectedUntracked, "ops/market-learning/daily-20260925/");
  const permitted = new Set([".vercelignore", "docs/AI/CHAT_HISTORY_PREVIEW_READINESS.md", "ops/product/chat-history-preview-readiness-20260925.json", "scripts/validate-chat-history-preview-readiness.mjs", record.protectedUntracked]);
  const status = execFileSync("git", ["status", "--porcelain=v1"], { encoding: "utf8" }).split("\n").filter(Boolean).map((line) => line.slice(3));
  assert.ok(status.every((path) => permitted.has(path)), status.join(", "));
});

check("Preview metadata and exact local ancestry agree", () => {
  assert.equal(record.preview.deploymentId, "dpl_9eB9h2AgwwyUZ5k7nmLEBkfZNKaT");
  assert.equal(record.preview.state, "READY");
  assert.equal(record.preview.target, null);
  assert.equal(record.preview.gitSha, "cad8c6c473612d12286868e541e4624545d1250b");
  assert.equal(git("merge-base", record.preview.gitSha, record.startingHead), record.preview.gitSha);
  assert.equal(Number(git("rev-list", "--count", `${record.preview.gitSha}..${record.startingHead}`)), record.preview.deltaToStartingHead.commits);
  const statuses = git("diff", "--name-status", `${record.preview.gitSha}..${record.startingHead}`).split("\n");
  assert.equal(statuses.filter((line) => line.startsWith("A\t")).length, record.preview.deltaToStartingHead.addedFiles);
  assert.equal(statuses.filter((line) => line.startsWith("M\t")).length, record.preview.deltaToStartingHead.modifiedFiles);
  assert.equal(record.preview.currentLocalHistoryContractDeployed, false);
  assert.equal(record.preview.parity, "STALE_CURRENT_LOCAL_NOT_DEPLOYED");
});

check("Production source provenance is retained without an invented Git SHA", () => {
  const historical = JSON.parse(read("ops/recovery/production-source-provenance-20260921.json"));
  assert.equal(record.production.deploymentId, historical.productionDeploymentId);
  assert.equal(historical.provenanceStatus, "EXACT_REPRODUCIBLE_SOURCE");
  assert.equal(historical.baseGitSha, null);
  assert.equal(record.production.gitSha, null);
  assert.equal(record.production.historicalOverallParity, "PARTIAL");
  assert.equal(record.production.fullSourceDiffRecomputed, false);
  assert.equal(record.production.currentLocalHistoryContractDeployed, false);
  assert.equal(record.production.parity, "STALE_CURRENT_LOCAL_NOT_DEPLOYED");
  assert.ok(Date.parse(record.production.createdAt) < Date.parse(record.preview.createdAt));
});

check("deploy-input exclusions match every named path", () => {
  const examples = [
    "docs/AI/CHAT_HISTORY_RUNTIME_READINESS.md",
    "ops/recovery/production-source-provenance-20260921.json",
    "ops/product/chat-strengthening-02-20260925.json",
    record.protectedUntracked,
    "scripts/fixture-chat-history-runtime-safety.mjs",
    "scripts/fixture-chat-strengthening-02.browser.mjs",
  ];
  assert.equal(record.deployInput.excludedPaths.length, examples.length);
  for (const pattern of record.deployInput.excludedPaths) assert.ok(ignore.split("\n").includes(pattern), pattern);
  for (const path of examples) {
    const result = git("-c", "core.excludesFile=.vercelignore", "check-ignore", "--no-index", "-v", path);
    assert.ok(result.startsWith(".vercelignore:"), `${path}: ${result}`);
  }
  assert.equal(record.deployInput.actualVercelDryRunInputManifest, "NEXT_GATE_REQUIRED");
  assert.equal(record.deployInput.privatePayloadInspected, false);
});

check("runtime imports keep the needed ops tree included", () => {
  const sources = [read("src/app/api/cron/metal-print-ops/route.ts"), read("src/lib/chat-recommendation-core.ts"), read("src/lib/metal-print-offers.server.ts")];
  assert.ok(sources.every((text) => text.includes("ops/")));
  assert.ok(!ignore.split("\n").includes("ops/"));
  assert.equal(record.deployInput.buildTimeOpsImportsPreserved, true);
});

check("history request rejection precedes every Redis operation", () => {
  assert.match(historyApi, /ConversationIdSchema\.safeParse\(req\.query\.conversationId\)/);
  assert.match(historyApi, /if \(!parsed\.success\) return res\.status\(400\)/);
  assert.match(historyApi, /sizeLimit: "512kb"/);
  assert.match(historyApi, /res\.status\(405\)/);
  assert.match(historyStore, /getRedis\(\)\.get/);
  assert.match(historyStore, /getRedis\(\)\.set/);
  assert.match(historyStore, /getRedis\(\)\.del/);
  assert.equal(record.prohibitedPreviewRequests.filter((item) => item.includes("REDIS_DATA_OPERATION_REQUIRED")).length, 3);
});

check("Chat route and client require controlled Preview validation", () => {
  assert.match(chatApi, /req\.method !== "POST"/);
  assert.match(chatApi, /BodySchema\.safeParse/);
  assert.match(chatApi, /llm = await callLlm/);
  assert.match(chatPage, /fetch\(`\/api\/chat-history\?conversationId=/);
  assert.match(chatPage, /fetch\("\/api\/chat-experience-v3"/);
  assert.ok(record.prohibitedPreviewRequests.some((item) => item.includes("PROVIDER_CALL_POSSIBLE")));
  assert.match(report, /without executing page JavaScript/);
});

check("environment and safety counters stay metadata-only and zero", () => {
  const prior = JSON.parse(read("ops/product/chat-history-env-metadata-verification-20260925.json"));
  assert.equal(prior.productionEnvContract, "PRESENT_METADATA_ONLY");
  assert.equal(prior.previewEnvContract, "PRESENT_METADATA_ONLY");
  assert.equal(record.environment.productionContract, prior.productionEnvContract);
  assert.equal(record.environment.previewContract, prior.previewEnvContract);
  assert.equal(record.environment.redisConnectivity, "UNVERIFIED_WITHOUT_SECRET_ACCESS");
  for (const key of ["customerHistoryReads", "customerHistoryWrites", "customerHistoryDeletes", "redisDataOperations", "providerCalls", "paymentOperations", "deploys", "pushes"]) assert.equal(record.operations[key], 0);
  assert.equal(record.environment.secretValuesRead, 0);
  assert.equal(record.environment.envMutations, 0);
});

check("verdict, source boundaries, and next Human Gate are explicit", () => {
  assert.equal(record.readiness, "READY_FOR_HUMAN_PREVIEW_DEPLOYMENT_GATE");
  assert.equal(record.nextGate, "CHAT_HISTORY_PREVIEW_DEPLOYMENT");
  assert.equal(record.operations.applicationChanges, 0);
  assert.equal(record.operations.configChanges, 1);
  assert.match(report, /actual Vercel CLI dry-run input manifest/);
  assert.match(report, /fonts\.googleapis\.com.*DNS/);
  assert.match(report, /PRODUCTION_PARITY = PARTIAL/);
  assert.match(report, /No deployment/);
});

console.log(`CHAT_HISTORY_PREVIEW_READINESS_VALIDATOR=PASS checks=${checks} readiness=${record.readiness}`);
