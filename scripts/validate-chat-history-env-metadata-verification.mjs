/* global console */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const record = JSON.parse(readFileSync("ops/product/chat-history-env-metadata-verification-20260925.json", "utf8"));
const doc = readFileSync("docs/AI/CHAT_HISTORY_ENV_METADATA_VERIFICATION.md", "utf8");
const store = readFileSync("src/lib/chat-history.server.ts", "utf8");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const expectedHead = "270385671b2cccf0029baa2a55d17f6bb03d2a12";
const expectedFinalizationHead = "449203ca106af04a526da238b332100ea649ff68";
const expectedBranch = "recovery/musiam-clean-20260920";
const urlNames = ["UPSTASH_REDIS_REST_URL", "KV_REST_API_URL"];
const tokenNames = ["UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_TOKEN"];
const allowedChanges = new Set([
  "docs/AI/CHAT_HISTORY_ENV_METADATA_VERIFICATION.md",
  "ops/product/chat-history-env-metadata-verification-20260925.json",
  "scripts/validate-chat-history-env-metadata-verification.mjs",
]);
let count = 0;

function check(name, fn) {
  fn();
  count += 1;
  console.log(`PASS ${count}: ${name}`);
}

function deriveContract(matrix) {
  const statusOf = (name) => typeof matrix[name] === "string" ? matrix[name] : matrix[name]?.status;
  const familyStatus = (names) => {
    if (names.some((name) => statusOf(name) === "PRESENT")) return "PRESENT";
    if (names.every((name) => statusOf(name) === "ABSENT")) return "ABSENT";
    return "UNVERIFIED";
  };
  const url = familyStatus(urlNames);
  const token = familyStatus(tokenNames);
  if (url === "PRESENT" && token === "PRESENT") return "PRESENT_METADATA_ONLY";
  if (url === "ABSENT" || token === "ABSENT") return "MISSING";
  return "UNVERIFIED_SECRET_BOUNDARY";
}

check("starting HEAD and branch are locked", () => {
  assert.equal(record.startingHead, expectedHead);
  assert.equal(record.branch, expectedBranch);
  assert.equal(git("branch", "--show-current"), expectedBranch);
  execFileSync("git", ["merge-base", "--is-ancestor", expectedHead, "HEAD"]);
  assert.equal(record.finalization.startingHead, expectedFinalizationHead);
  assert.equal(record.finalization.branch, expectedBranch);
  execFileSync("git", ["merge-base", "--is-ancestor", expectedFinalizationHead, "HEAD"]);
  assert.equal(record.status, "COMPLETE_COMMITTED");
});

check("scope is records and validator only; protected untracked path is preserved", () => {
  assert.equal(record.protectedUntracked, "ops/market-learning/daily-20260925/");
  assert.equal(record.startingState.trackedWorkingTreeClean, true);
  assert.equal(record.startingState.protectedUntrackedUntouched, true);
  assert.equal(record.applicationChanges, 0);
  assert.equal(record.configChanges, 0);
  const status = execFileSync("git", ["status", "--porcelain=v1"], { encoding: "utf8" })
    .split("\n").filter(Boolean).map((line) => line.slice(3));
  assert.ok(status.every((path) => allowedChanges.has(path) || path === record.protectedUntracked), status.join(", "));
});

check("project identity and linkage metadata are recorded", () => {
  assert.equal(record.projectIdentity.projectId, "prj_OU4nbZIO3n3ieS99cMXY7eWigHAl");
  assert.equal(record.projectIdentity.projectName, "musiam-front");
  assert.equal(record.projectIdentity.teamId, "team_Hj7QBy2lnfpsuHXgOWKfFdZg");
  assert.match(record.projectIdentity.linkageEvidence, /\.vercel\/project\.json/);
  assert.equal(record.projectIdentity.privateVercelPayloadRead, false);
});

check("metadata method was reviewed and unsafe or unavailable routes were not executed", () => {
  assert.equal(record.metadataMethodSafe, true);
  assert.equal(record.metadataMethod.metadataMethodSafe, true);
  assert.equal(record.metadataMethod.safeMethodUsed, true);
  assert.equal(record.metadataMethod.availableMetadataOnlyInterface, true);
  assert.equal(record.metadataMethod.evidenceSource, "USER_REPORTED_HUMAN_DASHBOARD_REVIEW");
  assert.equal(record.metadataMethod.humanDashboardListReviewed, true);
  assert.equal(record.finalization.evidenceSource, "USER_REPORTED_HUMAN_DASHBOARD_REVIEW");
  assert.equal(record.finalization.humanReviewed, true);
  assert.equal(record.finalization.reviewLocation, "Vercel Dashboard > musiam-front > Settings > Environment Variables");
  assert.equal(record.finalization.allEnvironmentsInterpretedAsIncludingProductionAndPreview, true);
  assert.equal(record.metadataMethod.environmentListRequested, false);
  assert.equal(record.metadataMethod.environmentResponseRequested, false);
  assert.equal(record.metadataMethod.valueFieldsConsumed, 0);
  assert.equal(record.metadataMethod.verdict, "HUMAN_REVIEWED_METADATA_ONLY");
  assert.ok(record.metadataMethod.documentationReferences.includes("https://vercel.com/docs/rest-api/sdk/projects/retrieve-the-environment-variables-of-a-project-by-id-or-name"));
  assert.ok(record.metadataMethod.documentationReferences.includes("https://vercel.com/docs/cli/env"));
  const api = record.metadataMethod.candidateMethods.find((item) => item.name.includes("filterProjectEnvs"));
  const cli = record.metadataMethod.candidateMethods.find((item) => item.name === "vercel env ls");
  const connector = record.metadataMethod.candidateMethods.find((item) => item.name.includes("connector"));
  const dashboard = record.metadataMethod.candidateMethods.find((item) => item.name.includes("Dashboard"));
  assert.ok(dashboard);
  assert.equal(dashboard.targetObserved, "All Environments");
  assert.equal(dashboard.executedByAgent, false);
  assert.equal(dashboard.secretValuesInspectedCopiedOrShared, false);
  assert.equal(dashboard.safeForThisGate, true);
  assert.ok(api);
  assert.ok(api.documentedResponseFields.includes("value"));
  assert.equal(api.executed, false);
  assert.ok(cli);
  assert.equal(cli.availability, "CLI_NOT_INSTALLED");
  assert.equal(cli.executed, false);
  assert.ok(connector);
  assert.equal(connector.dedicatedNameAndTargetOnlyOperation, false);
});

check("environment aliases and independent nullish precedence match source", () => {
  assert.deepEqual(record.requiredEnvContract.urlFamily, urlNames);
  assert.deepEqual(record.requiredEnvContract.tokenFamily, tokenNames);
  assert.equal(record.requiredEnvContract.oneOrMoreFromEachFamilyRequired, true);
  assert.equal(record.aliasPrecedence.url, "process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL");
  assert.equal(record.aliasPrecedence.token, "process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN");
  assert.equal(record.aliasPrecedence.familiesSelectedIndependently, true);
  assert.equal(record.aliasPrecedence.emptyPrimaryFallsBack, false);
  assert.match(store, /process\.env\.UPSTASH_REDIS_REST_URL \?\? process\.env\.KV_REST_API_URL/);
  assert.match(store, /process\.env\.UPSTASH_REDIS_REST_TOKEN \?\? process\.env\.KV_REST_API_TOKEN/);
});

check("Production and Preview targets account for every required alias", () => {
  for (const matrix of [record.productionMatrix, record.previewMatrix]) {
    for (const name of ["KV_REST_API_URL", "KV_REST_API_TOKEN"]) {
      assert.equal(matrix[name].status, "PRESENT");
      assert.equal(matrix[name].dashboardTarget, "All Environments");
      assert.equal(matrix[name].evidenceSource, "USER_REPORTED_HUMAN_DASHBOARD_REVIEW");
    }
    for (const name of ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]) {
      assert.equal(matrix[name].status, "NOT_CHECKED_NOT_REQUIRED");
    }
    assert.equal(matrix.urlFamily, "PRESENT");
    assert.equal(matrix.tokenFamily, "PRESENT");
  }
  assert.equal(record.developmentMatrix, null);
  assert.equal(record.customEnvironmentMetadata, "NOT_OBSERVED");
});

check("Production and Preview contracts derive from the confirmed KV aliases", () => {
  assert.equal(deriveContract(record.productionMatrix), "PRESENT_METADATA_ONLY");
  assert.equal(deriveContract(record.previewMatrix), "PRESENT_METADATA_ONLY");
  assert.equal(record.productionEnvContract, "PRESENT_METADATA_ONLY");
  assert.equal(record.previewEnvContract, "PRESENT_METADATA_ONLY");
});

check("secret and environment safety counters are zero", () => {
  for (const key of ["secretValuesRead", "secretValuesCopied", "secretValuesPrinted", "secretValuesPersisted"]) {
    assert.equal(record[key], 0);
    assert.equal(record.privacy[key], 0);
    assert.equal(record.finalization[key], 0);
    assert.equal(record.operations[key], 0);
  }
  assert.equal(record.envMutations, 0);
  assert.equal(record.privacy.envMutations, 0);
  assert.equal(record.finalization.envMutations, 0);
  assert.equal(record.operations.envMutations, 0);
  assert.equal(record.localEnvFilesGenerated, 0);
  assert.equal(record.privacy.localEnvFilesGenerated, 0);
  assert.equal(record.finalization.localEnvFilesGenerated, 0);
  assert.equal(record.operations.localEnvFilesGenerated, 0);
  assert.equal(record.responseValueFieldsConsumed, 0);
  assert.equal(record.privacy.responseValueFieldsConsumed, 0);
});

check("Redis connectivity and customer-data operations remain explicit and untouched", () => {
  assert.equal(record.redisConnectivity, "UNVERIFIED_WITHOUT_SECRET_ACCESS");
  for (const key of ["customerDataReads", "customerDataWrites", "customerDataDeletes"]) assert.equal(record[key], 0);
  for (const key of ["customerDataReads", "customerDataWrites", "customerDataDeletes"]) assert.equal(record.operations[key], 0);
  assert.equal(record.productionCustomerHistoryGetPutDelete, "UNVERIFIED_NOT_TESTED");
});

check("deployment parity, deferred risks, and truth boundary remain explicit", () => {
  assert.equal(record.currentLocalContractDeployed, "UNVERIFIED");
  assert.ok(record.deferredRisks.some((risk) => risk.includes("last-write-wins")));
  assert.ok(record.deferredRisks.some((risk) => risk.includes("bearer UUID")));
  assert.ok(record.deferredRisks.some((risk) => risk.includes("connectivity")));
  assert.ok(record.deferredRisks.some((risk) => risk.includes("deployment parity")));
  assert.equal(record.currentLocalContractDeployed, "UNVERIFIED");
  assert.ok(record.truthBoundary.length > 0);
  assert.match(doc, /Dashboard was not independently reopened during this finalization/);
  assert.match(doc, /Name\/target evidence does not establish any variable's value or effective runtime behavior/);
});

check("runtime readiness derives from Production env metadata and preserves connectivity boundary", () => {
  const expectedReadiness = record.productionEnvContract === "PRESENT_METADATA_ONLY"
    ? "READY_WITH_CONNECTIVITY_UNVERIFIED"
    : record.productionEnvContract === "MISSING"
      ? "BLOCKED_ENV_CONFIGURATION"
      : "BLOCKED_ENV_METADATA_UNVERIFIED";
  assert.equal(record.runtimeReadiness, expectedReadiness);
  assert.match(record.readinessReason, /human-reviewed Dashboard metadata/);
  assert.equal(record.redisConnectivity, "UNVERIFIED_WITHOUT_SECRET_ACCESS");
  assert.match(doc, /CHAT_HISTORY_RUNTIME_READINESS = READY_WITH_CONNECTIVITY_UNVERIFIED/);
  assert.ok(record.nextGate.length > 0);
});

check("deploy and push remain zero", () => {
  assert.equal(record.operations.deploys, 0);
  assert.equal(record.operations.pushes, 0);
});

console.log(`RESULT PASS ${count}/${count}`);
