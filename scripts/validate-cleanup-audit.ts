import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const expectedHead = "9b0f265b764eec4373842ae1676cbe734286784f";
const allowed = new Set([
  "docs/AI/CLEANUP_AUDIT.md",
  "ops/recovery/cleanup-audit-20260922.json",
  "scripts/validate-cleanup-audit.ts",
  "docs/AI/RECOVERY_PLAN.md",
]);
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const gitStatus = () => execFileSync("git", ["status", "--porcelain=v1"], { cwd: root, encoding: "utf8" });
let checks = 0;

function check(ok: unknown, message: string): asserts ok {
  checks += 1;
  assert.ok(ok, message);
}

function main() {
  const record = JSON.parse(read("ops/recovery/cleanup-audit-20260922.json")) as any;
  const report = read("docs/AI/CLEANUP_AUDIT.md");
  const plan = read("docs/AI/RECOVERY_PLAN.md");
  const currentHead = git("rev-parse", "HEAD");
  const changed = gitStatus().split("\n").filter(Boolean).map((line) => line.slice(3));
  const committedAudit = currentHead !== expectedHead && git("rev-parse", "HEAD^") === expectedHead;
  const auditDiff = committedAudit ? git("diff", "--name-only", "HEAD^", "HEAD").split("\n").filter(Boolean) : changed;
  const accounted = record.entries.filter((entry: any) => entry.accounted);
  const categories = ["KEEP_ACTIVE", "ARCHIVE", "EVIDENCE_HOLD", "SAFE_TO_DELETE", "UNKNOWN"];

  check(record.schemaVersion === "cleanup-audit/v1" && record.canonicalHead === expectedHead, "canonical starting HEAD must be exact");
  check(record.result === "AUDITED_PARTIAL_READY_FOR_C1_HUMAN_GATE", "cleanup inventory must be ready for the C1 human gate");
  check(record.productionForensicStatus === "UNKNOWN_REFERENCE_ONLY", "missing forensic paths must remain unknown reference-only");
  check(record.historicalFixedHeadValidator === "NOT_APPLICABLE_TO_CURRENT_GOVERNANCE_HEAD", "historical fixed-HEAD validators must not be treated as current failures");
  check(record.canonicalBranch === "recovery/musiam-clean-20260920", "canonical branch must be exact");
  check(record.stateLock.canonicalWorkingTree === "CLEAN" && record.stateLock.originalDirtyRepoAccess === "READ_ONLY" && record.stateLock.applicationFilesChanged === 0, "canonical State Lock and original read-only boundary must be explicit");
  check(currentHead === expectedHead || committedAudit, "validator must run before the audit commit or immediately after it");
  check(auditDiff.length === 4 && auditDiff.every((file) => allowed.has(file)), "only the four cleanup-audit files may change");
  check(record.roots.length === 7 && record.roots.every((entry: any) => typeof entry.path === "string" && typeof entry.exists === "boolean"), "all scoped roots must be inventoried");
  check(accounted.length > 0 && accounted.every((entry: any) => categories.includes(entry.category)), "every accountable entry must be classified");
  for (const category of categories) {
    const group = accounted.filter((entry: any) => entry.category === category);
    check(group.length > 0, `category must be explicit: ${category}`);
    check(group.reduce((sum: number, entry: any) => sum + entry.fileCount, 0) === record.countsByCategory[category], `count must match for ${category}`);
    check(group.reduce((sum: number, entry: any) => sum + entry.bytes, 0) === record.bytesByCategory[category], `bytes must match for ${category}`);
  }
  check(record.entries.filter((entry: any) => entry.evidenceReferenced).every((entry: any) => entry.category !== "SAFE_TO_DELETE"), "evidence paths must never be SAFE_TO_DELETE");
  for (const id of ["r0-completion", "r0-history", "r2", "r3", "r4", "r5-shaman"]) check(record.entries.find((entry: any) => entry.id === id)?.category === "EVIDENCE_HOLD", `${id} must be held`);
  check(record.entries.filter((entry: any) => entry.id.startsWith("production-forensic")).every((entry: any) => entry.category !== "SAFE_TO_DELETE"), "production forensic evidence must not be safe deletion");
  check(record.duplicateGroups.length === 1 && record.duplicateGroups[0].authoritativeCopy && record.duplicateGroups[0].reclaimableBytesNow === 0, "duplicate authority and non-destructive boundary must be explicit");
  check(record.safeToDeleteCount === record.countsByCategory.SAFE_TO_DELETE && record.safeToDeleteBytes === record.bytesByCategory.SAFE_TO_DELETE, "safe-delete totals must be consistent");
  check(record.archiveCount === record.countsByCategory.ARCHIVE && record.archiveBytes === record.bytesByCategory.ARCHIVE, "archive totals must be consistent");
  check(record.evidenceHoldCount === record.countsByCategory.EVIDENCE_HOLD && record.evidenceHoldBytes === record.bytesByCategory.EVIDENCE_HOLD, "evidence totals must be consistent");
  check(record.decommissionStatus === "NOT_READY" && record.dirtyRepoStatus.trackedModifiedCount === 102 && record.dirtyRepoStatus.stagedCount === 0, "dirty repository status must be classified exactly");
  check(record.operations.destructiveOperationsPerformed === false && Object.entries(record.operations).filter(([key]) => key !== "destructiveOperationsPerformed").every(([, value]) => value === 0), "all destructive/provider operations must be zero");
  check(record.validation.cleanupAudit === "PASS" && record.validation.finalIntegration === "PASS" && record.validation.rootTypecheck === "PASS" && record.validation.targetedLint === "PASS" && record.validation.diffCheck === "PASS", "completed validation results must be recorded");
  check(record.validation.r7d1Exhibition === "PASS" && record.validation.r7aCatalog === "PASS", "current R7-D1 and R7-A validators must pass");
  check(record.validation.rcPreviewValidator.startsWith("NOT_APPLICABLE_CURRENT_HEAD") && record.validation.rcValidationValidator.startsWith("NOT_APPLICABLE_CURRENT_HEAD"), "fixed-HEAD validators must be excluded from current applicability");
  check(record.validation.applicationChanges === 0 && record.validation.destructiveOperations === 0, "application drift and destructive operations must be zero");
  check(record.truthBoundary.length >= 5 && report.includes("CLEANUP_AUDIT = AUDITED_PARTIAL_READY_FOR_C1_HUMAN_GATE") && report.includes("HISTORICAL_FIXED_HEAD_VALIDATOR = NOT_APPLICABLE_TO_CURRENT_GOVERNANCE_HEAD") && plan.includes("CLEANUP-AUDIT"), "report, plan and truth boundary must be present");
  console.log(JSON.stringify({ status: "PASS", checksPassed: checks, result: record.result, safeToDeleteBytes: record.safeToDeleteBytes, decommissionStatus: record.decommissionStatus, destructiveOperations: 0 }, null, 2));
}

try { main(); } catch (error: unknown) { console.error(error instanceof Error ? error.stack || error.message : "CLEANUP_AUDIT_VALIDATION_FAILED"); process.exitCode = 1; }
