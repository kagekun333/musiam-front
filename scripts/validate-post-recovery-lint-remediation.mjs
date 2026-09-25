import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";

const root = process.cwd();
const startingHead = "c5e0df7a234a45dffb22efeb66e1f1b8c55bba92";
const branch = "recovery/musiam-clean-20260920";
const candidate = "ops/simulation-refinement/phase6-three-lanes-20260913/lane-c/c1-initial-draft";
const r3File = `${candidate}/count-semantic-turn.ts`;
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const readJson = (file) => JSON.parse(read(file));
let checks = 0;

function check(condition, message) {
  checks += 1;
  assert.ok(condition, message);
}

function git(...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function walk(directory) {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) return walk(relative);
    return /\.(?:[cm]?[jt]sx?)$/u.test(entry.name) ? [relative] : [];
  });
}

async function main() {
  const record = readJson("ops/recovery/post-recovery-lint-remediation-20260925.json");
  const report = read("docs/AI/POST_RECOVERY_LINT_REMEDIATION.md");
  const plan = read("docs/AI/RECOVERY_PLAN.md");
  const manifest = readJson("ops/simulation-refinement/phase6-three-lanes-20260913/recovery-manifest.json");
  const r3Record = read("docs/AI/R3_PHASE6_RECOVERY.md");
  const tsconfig = readJson("tsconfig.json");
  const eslintConfig = read("eslint.config.mjs");

  const head = git("rev-parse", "HEAD");
  const parent = git("rev-parse", "HEAD^");
  check(head === startingHead || parent === startingHead, "starting canonical HEAD must be current HEAD or its direct parent");
  check(git("branch", "--show-current") === branch, "canonical recovery branch must remain selected");
  check(fs.existsSync(path.join(root, "node_modules/eslint/bin/eslint.js")), "restored dependencies must be present");
  check(git("diff", "--quiet", startingHead, "--", "package.json", "pnpm-lock.yaml") === "", "package and lockfile must have no drift from starting HEAD");

  check(record.originalLint.errors === 5 && record.originalLint.warnings === 5, "exact original lint totals must be recorded");
  check(record.originalLint.findings.filter((item) => item.severity === "error").length === 5, "all original error details must be present");
  check(record.originalLint.findings.filter((item) => item.severity === "warning").length === 5, "all original warning details must be present");
  check(record.r3.classification === "NON_RUNTIME_PRESERVATION_SCOPE", "R3 errors must be classified as preservation-only");
  check(manifest.status === "RECOVERED_PRESERVED_EXPERIMENT" && manifest.laneC?.status === "PRESERVED_CANDIDATE" && manifest.laneC?.appliedToRoot === false, "R3 manifest must preserve non-applied candidate semantics");
  check(r3Record.includes("not applied to the root runtime"), "R3 recovery record must say candidate was not applied");
  check(tsconfig.exclude?.includes(`${candidate}/**/*`), "root typecheck must retain the exact existing R3 exclusion");
  check(eslintConfig.includes(`"${candidate}/**"`) && !/"ops\/\*\*/u.test(eslintConfig), "ESLint must ignore only the exact R3 candidate path, not broad ops scope");
  check(git("diff", "--quiet", startingHead, "--", candidate) === "", "preserved R3 candidate source must remain unchanged");

  const srcFiles = walk("src");
  const candidateReferences = srcFiles.filter((file) => /count-semantic-turn|phase6-three-lanes-20260913\/lane-c\/c1-initial-draft/u.test(read(file)));
  check(candidateReferences.length === 0, "current src runtime must not import or reference the R3 candidate");

  const eslint = new ESLint();
  check(await eslint.isPathIgnored(path.join(root, r3File)), "R3 candidate file must be ignored by ESLint");
  for (const file of ["src/app/vip-metal-print/page.tsx", "src/pages/chat.tsx", "src/pages/api/chat-experience-v3.ts"]) {
    check(!(await eslint.isPathIgnored(path.join(root, file))), `${file} must remain in ESLint scope`);
  }

  const vip = read("src/app/vip-metal-print/page.tsx");
  check(vip.includes('import Link from "next/link"'), "VIP screen must use Next Link");
  check((vip.match(/<Link className="vip-metal-primary" href="\/works">/gu) ?? []).length === 2, "both VIP catalog links must use Link");
  check(!/<a\b[^>]*href="\/works"/u.test(vip), "VIP screen must have no plain /works anchors");
  check(record.changes.vipLinkFixes === 2 && record.changes.applicationBehaviorDrift === false, "VIP fix must be recorded as two navigation-only edits");

  const lintJson = execFileSync("pnpm", ["exec", "eslint", ".", "--ext", ".js,.jsx,.ts,.tsx", "--format", "json"], { cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  const lintResults = JSON.parse(lintJson);
  const lintErrors = lintResults.reduce((sum, item) => sum + item.errorCount, 0);
  const lintWarnings = lintResults.reduce((sum, item) => sum + item.warningCount, 0);
  check(lintErrors === 0 && record.lint.errors === 0, "final ESLint error count must be zero");
  check(lintWarnings === 2 && record.lint.warnings === lintWarnings, "remaining warning count must be accurately recorded");
  check(record.lint.exitCode === 1 && record.lint.exitReason === "MAX_WARNINGS_ZERO", "strict official lint exit must be attributed to its zero-warning threshold");
  check(record.typecheck.status === "PASS", "root typecheck must be recorded as PASS");
  check(record.validators.length === 8 && record.validators.every((validator) => validator.status === "PASS"), "all applicable Recovery validators must be recorded PASS");

  check(record.invariants.catalog.primaryWorks === 450 && record.invariants.catalog.runtimeWorks === 514, "catalog counts must remain 450 / 514");
  check(record.invariants.exhibition.displayedWorks === 514 && record.invariants.exhibition.missingReleasedWorks === 0, "exhibition coverage must remain 514 / 0");
  check(record.invariants.chat.activeRoute === "/api/chat-experience-v3" && record.invariants.chat.stableWorkIdCards && record.invariants.chat.historyIsEntitlement === false, "Chat route, identity, and history boundary must be recorded");
  check(record.invariants.paidContinuation === "BLOCKED_PRODUCT_CONTRACT / PAID_CONTINUATION_NOT_ACTIVATED", "paid continuation must remain blocked");
  check(record.invariants.oracle === "ORACLE_INACTIVE_BY_DESIGN", "Oracle must remain inactive");
  check(record.build.status === "BLOCKED_EXTERNAL_FONT_DNS" && record.build.hostname === "fonts.googleapis.com" && record.build.workaroundApplied === false, "build block must retain the known external font DNS classification");
  check(record.dependencyState.lockfileDrift === 0 && record.invariants.providerOperations === 0 && record.invariants.paymentOperations === 0 && record.invariants.customerDataOperations === 0 && record.invariants.deploys === 0 && record.invariants.pushes === 0, "lockfile and external-operation boundaries must remain clear");
  check(report.includes("POST_RECOVERY_DEVELOPMENT_BASELINE = READY") && report.includes("production parity remains unverified"), "human report must state baseline verdict and truth boundary");
  check(plan.includes("POST_RECOVERY_LINT_REMEDIATION = PASS") && plan.includes("PRODUCT-LANE-A 伯爵CHAT STRENGTHENING"), "Recovery Plan must record the completed gate and next product lane");
  check(record.nextGate === "PRODUCT-LANE-A 伯爵CHAT STRENGTHENING" && record.recommendedNextModel === "GPT-6 Luna", "next gate and model recommendation must be correct");

  console.log(JSON.stringify({ status: "PASS", checksPassed: checks, startingHead, branch, lintErrors, lintWarnings, r3: record.r3.classification, typecheck: record.typecheck.status, recoveryValidators: record.validators.length, catalog: "450/514", exhibition: "514/0", build: record.build.status, packageManifestDrift: 0, lockfileDrift: 0, providerPaymentCustomerDataDeployPush: 0, nextGate: record.nextGate }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : "POST_RECOVERY_LINT_REMEDIATION_VALIDATION_FAILED");
  process.exitCode = 1;
});
