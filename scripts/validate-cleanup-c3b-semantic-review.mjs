import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const startingHead = "ce25a6f80d552f9689e7c1b2707d3bcd3d501152";
const c3aPath = "ops/recovery/cleanup-c3-unknown-triage-20260923.json";
const recordPath = "ops/recovery/cleanup-c3b-semantic-review-20260923.json";
const reportPath = "docs/AI/CLEANUP_C3B_SEMANTIC_REVIEW.md";
const planPath = "docs/AI/RECOVERY_PLAN.md";
const allowed = new Set([recordPath, reportPath, planPath, "scripts/validate-cleanup-c3b-semantic-review.mjs"]);
const decisions = [
  "PRESERVE_REQUIRED_BEFORE_C4",
  "ALREADY_PRESERVED_NO_EXTRA_ACTION",
  "RECOVERY_SUPERSEDES_CONFIRMED",
  "HISTORICAL_ONLY_CONFIRMED",
  "FUTURE_PRODUCT_PRESERVE",
  "REGENERABLE_NO_PRESERVATION_REQUIRED",
  "OWNER_DECISION_REQUIRED",
];
const categoryFields = {
  PRESERVE_REQUIRED_BEFORE_C4: "preserveRequiredFiles",
  ALREADY_PRESERVED_NO_EXTRA_ACTION: "alreadyPreservedFiles",
  RECOVERY_SUPERSEDES_CONFIRMED: "recoverySupersedesFiles",
  HISTORICAL_ONLY_CONFIRMED: "historicalOnlyFiles",
  FUTURE_PRODUCT_PRESERVE: "futureProductPreserveDecisionFiles",
  REGENERABLE_NO_PRESERVATION_REQUIRED: "regenerableFiles",
  OWNER_DECISION_REQUIRED: "ownerDecisionFiles",
};
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const sameSet = (a, b) => a.length === b.length && new Set(a).size === a.length && a.every((item) => b.includes(item));
const bytes = (rows) => rows.reduce((sum, item) => sum + item.allocatedBytes, 0);
let checks = 0;
function check(value, message) {
  checks += 1;
  assert.ok(value, message);
}

const record = readJson(recordPath);
const c3a = readJson(c3aPath);
const audit = readJson("ops/recovery/cleanup-audit-20260922.json");
const plan = fs.readFileSync(path.join(root, planPath), "utf8");
const report = fs.readFileSync(path.join(root, reportPath), "utf8");
const currentHead = git("rev-parse", "HEAD");
const isPreCommit = currentHead === startingHead;
check(isPreCommit || git("rev-parse", "HEAD^") === startingHead, "HEAD must be the locked start or its one-commit C3-B child");
if (!isPreCommit) check(git("log", "-1", "--format=%s") === "recovery: resolve C3 semantic cleanup review", "committed message must match");
check(git("branch", "--show-current") === "recovery/musiam-clean-20260920", "branch must remain locked");
check(record.schemaVersion === "cleanup-c3b-semantic-review/v1" && record.status === "C3B_SEMANTIC_REVIEW=COMPLETE_COMMITTED", "C3-B schema/status must match");
check(record.startingHead === startingHead && record.c3aCommit === startingHead, "starting/C3-A commit must match");
check(c3a.status === "C3A_UNKNOWN_TRIAGE=COMPLETE_COMMITTED" && record.c3aValidatorStatus === "C3A_COMMITTED_AUTHORITY_PRESERVED", "C3-A authority/validator status must remain preserved");
for (const file of [c3aPath, "docs/AI/CLEANUP_C3_UNKNOWN_TRIAGE.md", "scripts/validate-cleanup-c3-unknown-triage.mjs"]) {
  check(git("diff", startingHead, "--", file) === "", `C3-A authority changed: ${file}`);
}
check(record.handoffGroupedItems === 300 && c3a.solHandoff.itemCount === 300, "300 handoff groups required");
check(record.reportedHandoffFiles === 2381 && c3a.solHandoff.fileCount === 2381, "2,381 handoff files required");
const handoff = c3a.solHandoff.items.flatMap((group) => group.files);
const handoffPaths = handoff.map((file) => file.path);
check(handoff.length === 2381 && new Set(handoffPaths).size === 2381, "handoff paths must be unique");
const manifestTargets = c3a.fileManifest.filter((file) => ["DIRTY_HAS_UNRECOVERED_DELTA", "SEMANTIC_REVIEW_REQUIRED"].includes(file.disposition));
check(manifestTargets.every((file) => file.sensitive === false && file.localConfig === false && file.envPattern === false), "decision targets must exclude protected sensitive paths");
const decisionHandoff = handoff.filter((file) => file.scope === "NON_GIT_UNKNOWN_FILE");
const contextHandoff = handoff.filter((file) => file.scope !== "NON_GIT_UNKNOWN_FILE");
check(manifestTargets.length === 1091 && decisionHandoff.length === 1091 && contextHandoff.length === 1290, "decision/context cardinalities must reconcile");
check(sameSet(record.decisionTargetFiles, manifestTargets.map((file) => file.path)) && sameSet(record.decisionTargetFiles, decisionHandoff.map((file) => file.path)), "decision targets must be exactly the UNKNOWN target set");
check(sameSet(record.contextOnlyFiles, contextHandoff.map((file) => file.path)), "context-only set must be exact");
check(record.contextOnlyFiles.every((file) => file.startsWith("ops/")) && audit.entries.find((item) => item.id === "dirty-ops")?.category === "EVIDENCE_HOLD", "context rows must be the independently held ops root");
check(record.duplicates.length === 0 && new Set([...record.decisionTargetFiles, ...record.contextOnlyFiles]).size === 2381, "no target/context duplicate or overlap allowed");
check(record.accountingExplanation.includes("1,290") && record.accountingExplanation.includes("EVIDENCE_HOLD"), "accounting explanation must distinguish held context");
check(record.handoffGroupAccounting.length === 300 && record.handoffGroupAccounting.reduce((n, g) => n + g.decisionTargetCount, 0) === 1091 && record.handoffGroupAccounting.reduce((n, g) => n + g.contextOnlyCount, 0) === 1290, "per-handoff-group accounting must reconcile");
const final = record.finalDecisions;
check(final.length === 1091 && sameSet(final.map((file) => file.path), record.decisionTargetFiles), "all targets must be decided exactly once");
check(final.every((file) => decisions.includes(file.decision) && typeof file.rationale === "string" && file.rationale.length > 80 && Array.isArray(file.preservationEvidence) && file.preservationEvidence.length > 0), "every decision needs a semantic rationale and evidence");
const manifestByPath = new Map(manifestTargets.map((file) => [file.path, file]));
check(final.every((file) => file.c3aDisposition === manifestByPath.get(file.path)?.disposition && file.allocatedBytes === manifestByPath.get(file.path)?.allocatedBytes), "every decision must retain C3-A disposition and bytes");
check(final.filter((file) => file.c3aDisposition === "DIRTY_HAS_UNRECOVERED_DELTA").length === 69, "all 69 dirty deltas required");
check(final.filter((file) => file.c3aDisposition === "DIRTY_HAS_UNRECOVERED_DELTA").every((file) => typeof file.deltaObservation === "string" && file.deltaObservation.length > 40 && file.rationale.includes(file.deltaObservation)), "all 69 dirty deltas require file-specific semantic observations");
check(final.filter((file) => file.c3aDisposition === "SEMANTIC_REVIEW_REQUIRED").length === 1022, "all 1,022 semantic targets required");
check(bytes(final) === 71077888, "target allocated bytes must reconcile");
check(record.semanticGroups.every((group) => group.groupId && group.subsystem && group.decision && group.rationale && group.preservationEvidence?.length && group.c4Implication), "semantic groups need complete fields");
check(sameSet(record.semanticGroups.flatMap((group) => group.decisionTargetFiles), record.decisionTargetFiles), "semantic groups must cover targets exactly once");
check(sameSet(record.semanticGroups.flatMap((group) => group.contextOnlyFiles), record.contextOnlyFiles), "semantic groups must cover context exactly once");
check(final.every((file) => record.semanticGroups.some((group) => group.groupId === file.groupId && group.decision === file.decision && group.decisionTargetFiles.includes(file.path))), "file-to-group decisions must agree");
for (const category of decisions) {
  const rows = final.filter((file) => file.decision === category);
  const summary = record[categoryFields[category]];
  check(summary.files === rows.length && summary.allocatedBytes === bytes(rows) && sameSet(summary.paths, rows.map((file) => file.path)), `${category} summary must reconcile`);
  check(record.decisionCounts[category].files === rows.length && record.decisionCounts[category].allocatedBytes === bytes(rows), `${category} count must reconcile`);
}
check(Object.values(record.decisionCounts).reduce((n, entry) => n + entry.files, 0) === 1091, "final decision totals must equal target total");
check(final.filter((file) => file.decision === "ALREADY_PRESERVED_NO_EXTRA_ACTION").every((file) => file.sourceType === "tracked_clean" && file.preservationEvidence.some((item) => item.includes("R0 verified HEAD bundle"))), "already-preserved proof must be explicit and applicable");
check(final.filter((file) => file.decision === "PRESERVE_REQUIRED_BEFORE_C4").every((file) => file.preservationEvidence.length > 0), "preserve-required evidence must be explicit");
check(final.filter((file) => file.decision === "OWNER_DECISION_REQUIRED").every((file) => typeof file.preciseOwnerQuestion === "string" && file.preciseOwnerQuestion.length > 20), "owner decisions require precise questions");
check(record.futureProductFiles.files > 0 && sameSet(record.futureProductFiles.paths, final.filter((file) => file.futureProductRelation).map((file) => file.path)), "future-product relation must be tracked");
check(final.filter((file) => file.path.startsWith("public/omikuji-cards/") || file.path.startsWith("public/works/covers")).every((file) => file.futureProductRelation && ["PRESERVE_REQUIRED_BEFORE_C4", "ALREADY_PRESERVED_NO_EXTRA_ACTION"].includes(file.decision)), "future visual assets must remain protected");
check(record.originalGitInspected === false && record.sensitiveContentRead === false, "Original Git/sensitive zero-read boundary required");
check(c3a.originalGitOpaqueBoundary.recursiveInspection === false && c3a.sensitiveZeroRead.sensitiveContentReadCount === 0, "C3-A opaque boundary must remain preserved");
check(record.originalWrites === 0 && record.applicationChanges === 0 && record.destructiveOperations === 0, "Original/application/destructive operations must be zero");
check(record.providerOperations === 0 && record.deployOperations === 0 && record.pushOperations === 0 && record.c4Started === false, "external operations and C4 must remain zero");
check(record.c4Readiness === "NOT_READY_PRESERVATION_REQUIRED" && record.nextGate === "C3-C PRESERVATION EXECUTION" && record.preserveRequiredFiles.files > 0, "C4 readiness must follow preservation requirements");
check(plan.includes("C3-B SEMANTIC REVIEW — current governance") && report.includes("C3B_SEMANTIC_REVIEW=COMPLETE_COMMITTED") && record.truthBoundary.length >= 5, "Recovery Plan/report/truth boundary required");
const modified = git("diff", "--name-only").split("\n").filter(Boolean);
const staged = git("diff", "--cached", "--name-only").split("\n").filter(Boolean);
const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard", "-z"], { cwd: root }).toString("utf8").split("\0").filter(Boolean);
check([...modified, ...staged, ...untracked].every((file) => allowed.has(file)), "only four C3-B record paths may differ");
console.log(JSON.stringify({ status: "PASS", checksPassed: checks, startingHead, handoffGroups: 300, handoffFiles: 2381, decisionTargets: 1091, contextOnly: 1290, duplicates: 0, preserveRequired: record.preserveRequiredFiles.files, c4Readiness: record.c4Readiness, originalGitInspected: false, sensitiveContentRead: false }, null, 2));
