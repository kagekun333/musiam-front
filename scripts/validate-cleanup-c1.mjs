import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const root = "/Users/kagekun/Desktop/musiam-front-clean";
const dirty = "/Users/kagekun/Desktop/musiam-front";
const record = JSON.parse(fs.readFileSync(`${root}/ops/recovery/cleanup-c1-20260922.json`, "utf8"));
const targets = [
  `${root}/node_modules`, `${root}/.next`, `${root}/tsconfig.tsbuildinfo`,
  `${root}/tsconfig.r7b.tsbuildinfo`, `${root}/tsconfig.r7c1.tsbuildinfo`,
  `${dirty}/node_modules`, `${dirty}/.next`,
];
const allowed = new Set([
  "docs/AI/CLEANUP_C1_EXECUTION.md", "ops/recovery/cleanup-c1-20260922.json",
  "scripts/validate-cleanup-c1.mjs", "docs/AI/RECOVERY_PLAN.md",
]);
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
const statusRows = (cwd) => execFileSync("git", ["status", "--porcelain=v1"], { cwd, encoding: "utf8" }).split("\n").filter(Boolean);
const absent = (path) => {
  try { fs.lstatSync(path); return false; }
  catch (error) { return error?.code === "ENOENT"; }
};
const counts = (cwd) => {
  const rows = statusRows(cwd);
  let tracked = 0, staged = 0, untracked = 0;
  for (const row of rows) {
    if (row.startsWith("??")) { untracked++; continue; }
    const x = row.slice(0, 2);
    if (/[MADRCU]/.test(x)) tracked++;
    if (x[0] !== " ") staged++;
  }
  return { tracked, staged, untracked };
};
let checks = 0;
const check = (condition, message) => { checks++; assert.ok(condition, message); };

check(record.authorized === "APPROVE_C1_SAFE_TO_DELETE_CLEANUP", "C1 authorization must be recorded");
check(git(root, "rev-parse", "HEAD") === record.canonicalHead && git(root, "branch", "--show-current") === record.canonicalBranch, "canonical repo identity must remain unchanged");
check(JSON.stringify(record.targets.map((item) => item.path)) === JSON.stringify(targets), "exact C1 target list must match");
check(record.deletedTargets.length === targets.length && record.deletedTargets.every((path) => targets.includes(path)), "deleted targets must match the authorized list");
check(record.deletedFileCount === record.targets.reduce((sum, item) => sum + item.fileCount, 0), "deleted file count must reconcile");
check(record.actualReclaimedBytes > 0 && record.actualReclaimedBytes <= record.estimatedBytes, "reclaimed bytes must be recorded within the audited estimate");
check(targets.every(absent), "all exact targets must be absent");
for (const path of [`${root}/.git`, `${root}/.vercel`, `${root}/src`, `${root}/public`, `${root}/docs`, `${root}/ops`, `${dirty}/.git`, `${dirty}/src`, `${dirty}/public`, `${dirty}/ops`]) check(fs.existsSync(path), `protected path must remain: ${path}`);
for (const path of [
  "/Users/kagekun/Library/Application Support/MUSIAM/recovery/20260920T-r0-completion-01a0beba",
  "/Users/kagekun/Library/Application Support/MUSIAM/recovery/20260920T-r0-history-recovery-01a0beba",
  `${root}/ops/simulation-refinement/phase5-generalization-20260913`,
  `${root}/ops/simulation-refinement/phase6-three-lanes-20260913`,
  `${root}/ops/simulation-refinement/phase5-generalization-20260913/music/batch-r3`,
  `${dirty}/SHA_collection_999_unique`, `${root}/アウトプット`, `${dirty}/_archive`,
  `${root}/ops/recovery/cleanup-audit-20260922.json`, `${root}/ops/recovery/production-vs-recovery-diff-20260921.json`,
]) check(fs.existsSync(path), `held or archived evidence must remain: ${path}`);
check(record.evidenceHoldTouched === false && record.archiveTouched === false && record.unknownTouched === false && record.r5Touched === false && record.productionCommittedEvidenceTouched === false, "protected categories must be untouched");
check(git(dirty, "rev-parse", "HEAD") === record.dirtyHead && git(dirty, "branch", "--show-current") === record.dirtyBranch, "dirty repo identity must remain unchanged");
const dirtyCounts = counts(dirty);
check(dirtyCounts.tracked === record.dirtyTrackedModifiedBefore && dirtyCounts.tracked === record.dirtyTrackedModifiedAfter, "dirty tracked changes must remain unchanged");
check(dirtyCounts.staged === record.dirtyStagedBefore && dirtyCounts.staged === record.dirtyStagedAfter, "dirty staged changes must remain unchanged");
check(dirtyCounts.untracked === record.dirtyUntrackedBefore && dirtyCounts.untracked === record.dirtyUntrackedAfter, "dirty untracked paths must remain unchanged");
const changed = git(root, "diff", "--name-only").split("\n").filter(Boolean);
const untracked = git(root, "ls-files", "--others", "--exclude-standard").split("\n").filter(Boolean);
check([...changed, ...untracked].every((path) => allowed.has(path)), "only four C1 record files may be pending");
check(record.canonicalApplicationChanges === 0 && record.applicationFilesChanged === 0, "canonical application changes must be zero");
check(record.actualReclaimedBytes === record.targets.reduce((sum, item) => sum + item.allocatedBytes, 0), "allocated-byte reclaim must match target snapshots");
check(record.canonicalDependenciesPresentAfter === false && record.dependencyRestoreRequired === true, "dependency restore boundary must be explicit");
check(record.postDeleteAppValidators === "NOT_RUN_DEPENDENCIES_REMOVED_BY_AUTHORIZED_C1", "post-delete app validators must respect dependency boundary");
check(record.providerOperations === 0 && record.deployOperations === 0 && record.pushOperations === 0, "provider, deploy, and push operations must be zero");
check(record.destructiveOperationsPerformed === true && record.scopeViolation === false, "C1 execution status must be internally consistent");
check(record.actualReclaimedBytes > 0 && record.after?.canonicalRepoAllocatedBytes >= 0 && record.after?.dirtyRepoAllocatedBytes >= 0, "after metrics must be recorded");
console.log(JSON.stringify({ status: "PASS", checksPassed: checks, targetCount: targets.length, deletedFileCount: record.deletedFileCount, actualReclaimedBytes: record.actualReclaimedBytes, applicationFilesChanged: 0 }, null, 2));
