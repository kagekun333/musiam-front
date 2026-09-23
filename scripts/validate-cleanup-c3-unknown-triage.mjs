import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const recordPath = "ops/recovery/cleanup-c3-unknown-triage-20260923.json";
const auditPath = "ops/recovery/cleanup-audit-20260922.json";
const reportPath = "docs/AI/CLEANUP_C3_UNKNOWN_TRIAGE.md";
const planPath = "docs/AI/RECOVERY_PLAN.md";
const expectedHead = "4e1f8c491acfa9ffaf8fa3f7f6a40518839d071c";
const expectedBranch = "recovery/musiam-clean-20260920";
const allowed = new Set([
  "docs/AI/CLEANUP_C3_UNKNOWN_TRIAGE.md",
  "ops/recovery/cleanup-c3-unknown-triage-20260923.json",
  "scripts/validate-cleanup-c3-unknown-triage.mjs",
  "docs/AI/RECOVERY_PLAN.md",
]);
const buckets = [
  "ORIGINAL_GIT_HOLD",
  "SECRET_OR_ENV_HOLD",
  "LOCAL_CONFIG_HOLD",
  "RECOVERY_ALREADY_CAPTURED",
  "RECOVERY_SUPERSEDES_DIRTY",
  "HISTORICAL_CANDIDATE",
  "FUTURE_PRODUCT_SCOPE",
  "GENERATED_REGENERABLE_CANDIDATE",
  "DIRTY_HAS_UNRECOVERED_DELTA",
  "SEMANTIC_REVIEW_REQUIRED",
];
const nonGitBuckets = new Set(buckets.filter((item) => item !== "ORIGINAL_GIT_HOLD"));
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
let checks = 0;
function check(condition, message) {
  checks += 1;
  assert.ok(condition, message);
}
function isCount(value) {
  return Number.isInteger(value) && value >= 0;
}

function main() {
  const record = readJson(recordPath);
  const audit = readJson(auditPath);
  const report = fs.readFileSync(path.join(root, reportPath), "utf8");
  const plan = fs.readFileSync(path.join(root, planPath), "utf8");

  check(record.schemaVersion === "cleanup-c3-unknown-triage/v1", "schema version must match");
  check(record.status === "C3A_UNKNOWN_TRIAGE=COMPLETE_COMMITTED", "C3-A completion status must be explicit");
  check(record.startingHead === expectedHead && record.canonicalBranch === expectedBranch, "canonical starting identity must match");
  check(git("rev-parse", "HEAD") === expectedHead && git("branch", "--show-current") === expectedBranch, "validator must run at the locked canonical state");
  check(record.stateLock.canonicalWorkingTree === "CLEAN" && record.stateLock.originalHead === "117379b6c61ab3fc072b6cd4b80ce1d406b0e175", "State Lock evidence must match");
  check(record.stateLock.originalBranch === "codex/fix/stripe-metal-print-webhook-20260914", "Original branch evidence must match");

  check(audit.countsByCategory.UNKNOWN === 22238 && audit.bytesByCategory.UNKNOWN === 3463835648, "committed Cleanup Audit UNKNOWN aggregate must match");
  check(record.unknownAuthority.files === audit.countsByCategory.UNKNOWN && record.unknownAuthority.allocatedBytes === audit.bytesByCategory.UNKNOWN, "recorded UNKNOWN authority must match the audit");
  check(record.unknownAuthority.source === "ops/recovery/cleanup-audit-20260922.json#dirty-unresolved-core", "authority source must be exact");

  const opaque = record.originalGitOpaqueBoundary;
  check(opaque.classification === "ORIGINAL_GIT_HOLD" && opaque.recursiveInspection === false, "Original Git must remain opaque");
  check(opaque.enumerated === false && opaque.perFileStat === false && opaque.opened === false && opaque.hashed === false, "Original Git filesystem operations must remain zero");
  check(opaque.gitObjectsInspected === false && opaque.refsInspected === false && opaque.packInspected === false && opaque.indexInspected === false, "Original Git internals must remain uninspected");
  check(opaque.fileCountMethod === "DERIVED" && opaque.formula === "22238 - NON_GIT_UNKNOWN_FILES", "Original Git file count must be derived");
  check(opaque.files === 17801 && opaque.files === 22238 - record.nonGitUnknownFiles && isCount(opaque.files), "derived Original Git file count must match");
  check(opaque.allocatedBytes === 3136348160 && opaque.allocatedBytesAuthority.includes("committed Cleanup Audit"), "Original Git bytes must reuse committed authority");

  check(record.nonGitUnknownFiles === 4437 && record.nonGitUnknownAllocatedBytes === 327487488, "non-Git UNKNOWN aggregate must match");
  check(opaque.files + record.nonGitUnknownFiles === 22238, "UNKNOWN file counts must reconcile");
  check(opaque.allocatedBytes + record.nonGitUnknownAllocatedBytes === 3463835648, "UNKNOWN allocated bytes must reconcile");
  check(record.fileManifest.length === 4437, "file manifest must contain every non-Git UNKNOWN file");
  const filePaths = record.fileManifest.map((item) => item.path);
  check(new Set(filePaths).size === filePaths.length, "file manifest paths must be unique");
  check(filePaths.every((item) => typeof item === "string" && item.length > 0 && !item.startsWith(".git/")), "manifest must contain relative non-Git paths only");
  check(record.fileManifest.every((item) => nonGitBuckets.has(item.disposition) && isCount(item.logicalBytes) && isCount(item.allocatedBytes)), "every non-Git file must have one valid disposition and metadata");

  for (const bucket of buckets) {
    const files = bucket === "ORIGINAL_GIT_HOLD" ? opaque.files : record.fileManifest.filter((item) => item.disposition === bucket).length;
    const bytes = bucket === "ORIGINAL_GIT_HOLD" ? opaque.allocatedBytes : record.fileManifest.filter((item) => item.disposition === bucket).reduce((sum, item) => sum + item.allocatedBytes, 0);
    check(record.classificationBuckets[bucket]?.files === files, `file count must match for ${bucket}`);
    check(record.classificationBuckets[bucket]?.allocatedBytes === bytes, `allocated bytes must match for ${bucket}`);
  }
  check(Object.keys(record.classificationBuckets).length === buckets.length, "taxonomy must be exact");
  check(Object.values(record.classificationBuckets).reduce((sum, item) => sum + item.files, 0) === 22238, "classification total must equal UNKNOWN files");
  check(Object.values(record.classificationBuckets).reduce((sum, item) => sum + item.allocatedBytes, 0) === 3463835648, "classification bytes must equal UNKNOWN bytes");
  check(record.classificationOverlap === 0 && record.classificationRemainder === 0, "classification overlap and remainder must be zero");

  const secretRows = record.fileManifest.filter((item) => item.disposition === "SECRET_OR_ENV_HOLD");
  const localRows = record.fileManifest.filter((item) => item.disposition === "LOCAL_CONFIG_HOLD");
  check(record.sensitiveZeroRead.detectionMethod === "PATH_METADATA_ONLY" && record.sensitiveZeroRead.filterAppliedBeforeAnyContentOrHashComparison === true, "sensitive discovery must be path-first");
  for (const [name, group] of [["SECRET_OR_ENV_HOLD", record.sensitiveZeroRead.secretOrEnvHold], ["LOCAL_CONFIG_HOLD", record.sensitiveZeroRead.localConfigHold]]) {
    check(group.contentRead === false && group.hashProduced === false && group.grepPerformed === false && group.previewPerformed === false, `${name} zero-read boundary must hold`);
  }
  check(secretRows.length === record.sensitiveZeroRead.sensitivePathCandidateCount && localRows.length === record.sensitiveZeroRead.localConfigPathCandidateCount, "path-based hold counts must match the manifest");
  check([...secretRows, ...localRows].every((item) => item.canonicalComparison === "NOT_PERFORMED_PATH_ONLY_HOLD"), "held paths must not have content comparisons");
  check(secretRows.every((item) => item.contentRead === undefined && item.hash === undefined && item.sha256 === undefined), "secret rows must not store content or hash");
  check(localRows.every((item) => item.contentRead === undefined && item.hash === undefined && item.sha256 === undefined), "local config rows must not store content or hash");
  check(record.sensitiveZeroRead.envContentRead === false && record.sensitiveZeroRead.credentialKeyTokenCertificatePrivateConfigContentOrHashRead === false, "environment and credential-like content must remain unread");
  check(record.sensitiveZeroRead.sensitiveContentReadCount === 0 && record.sensitiveZeroRead.sensitiveHashCount === 0 && record.sensitiveZeroRead.sensitiveGrepCount === 0 && record.sensitiveZeroRead.sensitivePreviewCount === 0, "sensitive operation counters must be zero");
  check(record.contentComparison.sensitivePairsHashed === 0 && record.contentComparison.originalGitAccessForComparison === false && record.contentComparison.hashesStoredInRecord === false, "comparison evidence must exclude sensitive paths and Original Git");
  check(record.fileManifest.filter((item) => item.envPattern).every((item) => item.disposition === "SECRET_OR_ENV_HOLD"), ".env paths must remain held");

  check(record.priorAttempts.PRIOR_ATTEMPT_1_INVALIDATED === true && record.priorAttempts.PRIOR_ATTEMPT_2_INVALIDATED === true, "both earlier C3-A attempts must be invalidated");
  check(record.priorAttempts.PRIOR_RESULTS_REUSED === false && record.priorAttempts.priorScratchOpened === false && record.priorAttempts.priorScratchDeleted === false && record.priorAttempts.priorScratchReferencedAsAuthority === false, "prior attempt artifacts must not be reused or touched");

  check(record.modifiedTrackedStatusEntryCount === 102 && record.modifiedTrackedStatusEntriesAccounted === 102 && record.modifiedTrackedStatusEntries.length === 102, "all 102 modified entries must be accounted");
  check(new Set(record.modifiedTrackedStatusEntries.map((item) => item.path)).size === 102, "modified status paths must be unique");
  check(record.stagedStatusEntries === 0 && record.stateLock.staged === 0, "staged status count must be zero");
  const modifiedTaxonomy = new Set(["SECRET_OR_ENV_HOLD", "LOCAL_CONFIG_HOLD", "RECOVERY_SUPERSEDES_DIRTY", "DIRTY_HAS_UNRECOVERED_DELTA", "HISTORICAL_ONLY", "FUTURE_PRODUCT_SCOPE", "SEMANTIC_REVIEW_REQUIRED"]);
  check(record.modifiedTrackedStatusEntries.every((item) => modifiedTaxonomy.has(item.disposition)), "modified entries must use the requested dispositions");
  check(record.untrackedStatusEntryCount === 433 && record.untrackedStatusEntriesAccounted === 433 && record.untrackedStatusEntries.length === 433, "all 433 NUL-safe untracked entries must be accounted");
  check(new Set(record.untrackedStatusEntries.map((item) => item.path)).size === 433, "untracked status paths must be unique");
  const untrackedTaxonomy = new Set(["RECOVERY_ALREADY_CAPTURED", "ALREADY_PRESERVED", "HISTORICAL_CANDIDATE", "FUTURE_PRODUCT_SCOPE", "GENERATED_REGENERABLE_CANDIDATE", "SECRET_OR_ENV_HOLD", "LOCAL_CONFIG_HOLD", "SEMANTIC_REVIEW_REQUIRED"]);
  check(record.untrackedStatusEntries.every((item) => untrackedTaxonomy.has(item.disposition)), "untracked entries must use the requested dispositions");
  check(record.nonGitStatusAccounting.ignoredNonGitFiles === 53 && record.nonGitStatusAccounting.ignoredNonGitAllocatedBytes === 729088, "ignored non-Git UNKNOWN files must be accounted");
  check(record.fileManifest.filter((item) => item.sourceType === "ignored").length === record.nonGitStatusAccounting.ignoredNonGitFiles, "ignored manifest count must match");

  const handoff = record.solHandoff;
  check(handoff.model === "GPT-6 Sol" && handoff.status === "PREPARED_FOR_C3_B_ONLY", "Sol handoff target must be explicit");
  check(handoff.items.length === handoff.itemCount && handoff.itemCount > 0, "Sol handoff item count must match");
  const unknownTargets = new Set(record.fileManifest.filter((item) => ["DIRTY_HAS_UNRECOVERED_DELTA", "SEMANTIC_REVIEW_REQUIRED"].includes(item.disposition)).map((item) => item.path));
  const handoffUnknown = handoff.items.flatMap((item) => item.files.filter((file) => file.scope === "NON_GIT_UNKNOWN_FILE").map((file) => file.path));
  check(handoffUnknown.length === unknownTargets.size && new Set(handoffUnknown).size === unknownTargets.size && handoffUnknown.every((item) => unknownTargets.has(item)), "all and only dirty-delta and semantic UNKNOWN files must be handed off");
  check(handoff.items.every((item) => item.pathRoot && isCount(item.fileCount) && isCount(item.allocatedBytes) && item.subsystem && item.safeMetadata && item.knownEvidence.length > 0 && item.ambiguityReason && item.exactDecisionRequired), "each handoff item must contain required safe metadata and decision context");
  check(handoff.items.flatMap((item) => item.files).every((file) => file.sensitive === false || (file.path && isCount(file.logicalBytes) && isCount(file.allocatedBytes) && file.comparison === "NOT_READ_R6_EVIDENCE_SCOPE")), "sensitive handoff rows may include path and metadata only");
  check(handoff.sensitiveItemsContainOnlyPathAndMetadata === true && handoff.semanticDecisionsMade === false, "handoff must preserve sensitive and semantic boundaries");
  check(handoff.fileCount === handoff.items.reduce((sum, item) => sum + item.fileCount, 0), "Sol handoff file count must reconcile");
  check(record.c4Readiness === (handoff.fileCount > 0 ? "NOT_READY_SOL_REVIEW_REQUIRED" : "TRIAGE_COMPLETE"), "C4 readiness must follow Sol handoff count");

  check(record.operations.destructiveOperations === 0 && record.operations.originalWrites === 0 && record.operations.fileDeletions === 0 && record.operations.fileMoves === 0 && record.operations.archiveCreation === 0, "destructive and Original operations must be zero");
  check(record.operations.providerOperations === 0 && record.operations.deployOperations === 0 && record.operations.pushOperations === 0 && record.operations.dependencyInstallation === 0, "external and dependency operations must be zero");
  check(record.operations.canonicalApplicationChanges === 0 && record.operations.canonicalRuntimeChanges === 0, "application and runtime changes must be zero");
  check(record.operations.c3bStarted === false && record.operations.c4Started === false, "later gates must not have started");
  check(record.commitAuthorization.authorizedByCurrentUserRequest === true && record.commitAuthorization.message === "recovery: classify C3 unknown cleanup set" && record.commitAuthorization.push === false, "local commit authorization must match the request and prohibit push");
  check(record.protection.r0ThroughR5Changed === false && record.protection.r5ShamanScopeDeletionCandidate === false, "R0-R5 and R5 Shaman scope must remain protected");
  check(record.protection.futureProductScopesProtected.length === 7 && record.protection.runtimeReferencedSourceDeletionCandidateCount === 0, "future product and runtime-referenced sources must be protected");
  check(record.protection.recoveryAlreadyCapturedMeansDeletionAuthorized === false && record.protection.generatedCandidateDeleted === false && record.protection.unknownDeletionCandidateProduced === false && record.protection.fileDeletionCount === 0, "classification must not authorize or perform deletion");
  check(record.untrackedStatusEntries.find((item) => item.path === "SHA_collection_999_unique")?.disposition === "FUTURE_PRODUCT_SCOPE", "R5 Shaman root must remain future-product protected");
  check(record.governance.recoveryPlanCurrentResultRecorded === true && record.governance.c2HistoricalFactsModified === false && record.governance.c2HistoricalNextGatePreserved === true, "Recovery Plan must append current governance without rewriting C2 history");
  check(record.truthBoundary.length >= 5 && plan.includes("C3-A UNKNOWN TRIAGE — current governance") && report.includes("UNKNOWN"), "truth boundary and reports must exist");

  const changed = git("diff", "--name-only").split("\n").filter(Boolean);
  const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard", "-z"], { cwd: root }).toString("utf8").split("\0").filter(Boolean);
  check([...changed, ...untracked].every((file) => allowed.has(file)), "only the four allowed C3-A files may be changed");
  check(record.governance.allowedCanonicalChanges.every((file) => allowed.has(file)) && record.governance.allowedCanonicalChanges.length === 4, "allowlist must be exact");
  check(!changed.includes("ops/recovery/cleanup-c2-20260923.json"), "C2 historical record must remain unchanged");

  console.log(JSON.stringify({ status: "PASS", checksPassed: checks, unknownFiles: 22238, unknownAllocatedBytes: 3463835648, originalGitFilesDerived: opaque.files, nonGitUnknownFiles: record.nonGitUnknownFiles, modifiedStatusEntries: record.modifiedTrackedStatusEntriesAccounted, untrackedStatusEntries: record.untrackedStatusEntriesAccounted, ignoredNonGitFiles: record.nonGitStatusAccounting.ignoredNonGitFiles, solHandoffItems: handoff.itemCount, solHandoffFiles: handoff.fileCount, c4Readiness: record.c4Readiness, originalGitRecursiveInspection: false, sensitiveContentOrHashReads: 0 }, null, 2));
}

try { main(); } catch (error) {
  console.error(error instanceof Error ? error.stack || error.message : "CLEANUP_C3_UNKNOWN_TRIAGE_VALIDATION_FAILED");
  process.exitCode = 1;
}
