import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const root = "/Users/kagekun/Desktop/musiam-front-clean";
const start = "4099f96a671f02fbba853a98254b4c807f72bac6";
const branch = "recovery/musiam-clean-20260920";
const recordPath = "ops/recovery/post-recovery-development-baseline-20260925.json";
const reportPath = "docs/AI/POST_RECOVERY_DEVELOPMENT_BASELINE.md";
const planPath = "docs/AI/RECOVERY_PLAN.md";
const validatorPath = "scripts/validate-post-recovery-development-baseline.mjs";
const allowed = new Set([recordPath, reportPath, planPath, validatorPath]);
const read = (path) => fs.readFileSync(`${root}/${path}`, "utf8");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const run = (...args) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
let checks = 0;
function check(condition, message) {
  checks += 1;
  assert.ok(condition, message);
}
function names(bytes) {
  return bytes.toString("utf8").split("\0").filter(Boolean).map((entry) => entry.slice(3));
}
function pathNames(bytes) {
  return bytes.toString("utf8").split("\0").filter(Boolean);
}

const record = JSON.parse(read(recordPath));
const report = read(reportPath);
const plan = read(planPath);
check(git("rev-parse", "--show-toplevel") === root, "Canonical repository root");
check(git("rev-parse", "--is-shallow-repository") === "false", "repository history remains complete");
check(git("branch", "--show-current") === branch, "Recovery branch unchanged");
check(record.startingHead === start && record.branch === branch && record.initialWorkingTree === "CLEAN", "recorded starting State Lock");
check(record.originalRepository.present === false && record.originalRepository.classification === "NOT_APPLICABLE_POST_DELETION", "deleted Original remains absent and classified N/A");
check(!fs.existsSync("/Users/kagekun/Desktop/musiam-front"), "Original path remains absent");
check(plan.includes("MUSIAM_RECOVERY_CLEANUP = COMPLETE") && plan.includes("DEPENDENCY_RESTORE_REQUIRED_BEFORE_APP_DEVELOPMENT = true"), "Recovery closure markers remain in Recovery Plan");
check(record.recoveryCleanup === "COMPLETE" && record.dependencyRestoreRequiredBeforeGate === true, "machine record preserves closure state");

const pkg = JSON.parse(read("package.json"));
check(fs.existsSync(`${root}/pnpm-lock.yaml`) && !fs.existsSync(`${root}/package-lock.json`), "pnpm lockfile remains package authority");
check(pkg.packageManager === undefined && record.packageManager.packageManagerField === null, "packageManager field remains absent");
check(record.packageManager.name === "pnpm" && record.dependencyRestore.command === "pnpm install --frozen-lockfile", "reproducible pnpm restore recorded");
check(record.dependencyRestore.status === "PASS_NO_LOCKFILE_DRIFT" && record.dependencyRestore.packagesDownloaded === 0, "dependency restore and package source counts");
check(record.drift.packageManifest === 0 && record.drift.lockfile === 0 && record.drift.trackedApplicationAndRuntime === 0, "all application/package drift counts are zero");
run("diff", "--quiet", start, "HEAD", "--", "src", "public", "package.json", "pnpm-lock.yaml", "tsconfig.json", "next.config.js", "next.config.mjs", "next.config.ts", "vercel.json");
run("diff", "--quiet", "--", "src", "public", "package.json", "pnpm-lock.yaml", "tsconfig.json", "next.config.js", "next.config.mjs", "next.config.ts", "vercel.json");
run("diff", "--cached", "--quiet", "--", "src", "public", "package.json", "pnpm-lock.yaml", "tsconfig.json", "next.config.js", "next.config.mjs", "next.config.ts", "vercel.json");

check(record.typecheck.status === "PASS", "root typecheck PASS recorded");
check(record.lint.status === "FAIL_EXISTING_FINDINGS" && record.lint.errors === 5 && record.lint.repairPerformed === false, "lint failures recorded without out-of-scope repair");
check(record.build.status === "BLOCKED_EXTERNAL_FONT_DNS" && record.build.hostname === "fonts.googleapis.com" && record.build.applicationBuildError === false, "font DNS blocker is classified accurately");
check(record.validators.currentlyApplicable.length === 8 && record.validators.currentlyApplicable.every((item) => item.status === "PASS"), "all required applicable validators passed");
check(record.validators.originalDependent.classification === "NOT_APPLICABLE_POST_DELETION" && record.validators.originalDependent.executed === false, "Original-dependent validators remain unrun and N/A");
check(record.invariants.catalog.primaryWorks === 450 && record.invariants.catalog.runtimeMergedWorks === 514 && record.invariants.catalog.stableIdIdentity && record.invariants.catalog.titleOnlyMerge === false, "catalog invariants");
check(record.invariants.exhibition.displayedWorks === 514 && record.invariants.exhibition.missingReleasedWorks === 0, "Exhibition invariants");
check(record.invariants.chat.activeRoute === "/api/chat-experience-v3" && record.invariants.chat.historyIsEntitlement === false, "Chat route and history boundary");
check(record.invariants.paidContinuation === "BLOCKED_PRODUCT_CONTRACT / PAID_CONTINUATION_NOT_ACTIVATED", "paid continuation remains blocked");
check(record.invariants.oracle === "ORACLE_INACTIVE_BY_DESIGN", "Oracle remains inactive");
check(Object.values(record.operations).every((count) => count === 0), "provider/payment/data/deploy/push operations all zero");
check(record.nextGateStatus === "BLOCKED_PENDING_SCOPED_LINT_REMEDIATION", "Chat implementation remains behind lint precondition");
for (const phrase of ["POST_RECOVERY_DEVELOPMENT_BASELINE = BLOCKED_EXISTING_LINT_ERRORS", "BLOCKED_EXTERNAL_FONT_DNS", "PRODUCT-LANE-A 伯爵CHAT STRENGTHENING", "history != entitlement", "Truth Boundary"]) {
  check(report.includes(phrase), `human baseline report contains ${phrase}`);
}

const head = git("rev-parse", "HEAD");
if (head === start) {
  const paths = names(execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all"], { cwd: root }));
  check(paths.length === allowed.size && paths.every((path) => allowed.has(path)), "only the four authorized baseline files are modified/untracked");
} else {
  check(git("rev-parse", "HEAD^") === start, "baseline commit is a direct child of starting HEAD");
  check(git("log", "-1", "--format=%s") === "recovery: establish post-recovery development baseline", "baseline commit message");
  const committed = pathNames(execFileSync("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", "-z", "HEAD"], { cwd: root }));
  check(committed.length === allowed.size && committed.every((path) => allowed.has(path)), "baseline commit contains only the four authorized files");
  check(git("status", "--porcelain=v1", "-z", "--untracked-files=all") === "", "committed baseline working tree clean");
}
run("diff", "--check", "HEAD");

console.log(JSON.stringify({ status: "PASS", checksPassed: checks, verdict: record.verdict, currentValidators: record.validators.currentlyApplicable.length, applicationDrift: 0, providerPaymentDataDeployPush: 0 }, null, 2));
