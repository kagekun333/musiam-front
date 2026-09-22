import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const governanceHead = "a6bf8791b21559aaafa31e98c1c2ce022d2e26e3";
const applicationBaseHead = "a918b05fba988884d27efd5509e2a3eee6df1127";
const allowedChanges = new Set([
  "docs/AI/RECOVERY_ONLY_RC_PREVIEW_VALIDATION.md",
  "ops/recovery/recovery-only-rc-preview-validation-20260922.json",
  "scripts/validate-recovery-only-rc-preview.ts",
  "docs/AI/RECOVERY_PLAN.md",
]);
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
let checks = 0;

function check(ok: unknown, message: string): asserts ok {
  checks += 1;
  assert.ok(ok, message);
}
function main() {
  const record = JSON.parse(read("ops/recovery/recovery-only-rc-preview-validation-20260922.json")) as any;
  const doc = read("docs/AI/RECOVERY_ONLY_RC_PREVIEW_VALIDATION.md");
  const plan = read("docs/AI/RECOVERY_PLAN.md");
  const changed = execFileSync("git", ["status", "--porcelain=v1"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean).map((line) => line.slice(3));
  const appDelta = git("diff", "--name-only", applicationBaseHead + ".." + governanceHead, "--", "src", "public", "package.json", "pnpm-lock.yaml", "next.config.ts", "vercel.json", "tsconfig.json");

  check(git("rev-parse", "HEAD") === governanceHead, "governance HEAD must be exact");
  check(git("branch", "--show-current") === "recovery/musiam-clean-20260920", "Recovery branch must be exact");
  check(changed.length === 4 && changed.every((p) => allowedChanges.has(p)), "only four Preview record files may change");
  check(!fs.existsSync(path.join(root, ".env.local")), ".env.local must be absent");
  check(record.schemaVersion === "recovery-only-rc-preview-validation/v1" && record.governanceHead === governanceHead && record.applicationBaseHead === applicationBaseHead && record.applicationDrift === 0 && appDelta === "", "identity and application drift must be exact");
  check(record.linkage.existingProjectMetadataOnly && record.linkage.team === "hakusyakus-projects" && record.linkage.project === "musiam-front" && !record.linkage.relinkPerformed && !record.linkage.envPullPerformed, "existing linkage only");
  check(record.environmentMaterialization.envLocalAbsentBeforeDeploy && record.environmentMaterialization.envLocalAbsentAfterDeploy && !record.environmentMaterialization.envValuesRead && record.environmentMaterialization.envRotationReviewRequired && !record.environmentMaterialization.secretDisclosureConfirmed, "environment boundary retained");
  check(record.authorization.previewDeployAuthorized && !record.authorization.productionDeployAuthorized && record.authorization.maxPreviewDeployCount === 1 && record.authorization.deployCount === 1 && record.authorization.productionDeployCount === 0, "deploy guard exact");
  check(record.preview.deploymentId === "dpl_3HzCvSatWj4X3GpgNMiQjRbNHPJ1" && record.preview.url === "https://musiam-front-3p5e8c8xx-hakusyakus-projects.vercel.app" && record.preview.target === "preview" && record.preview.state === "READY" && record.preview.buildResult === "PASS" && record.preview.buildDuration === "2m 37s" && record.preview.framework.includes("15.5.12") && record.preview.nodeRuntime.includes("22"), "Preview build metadata exact");

  for (const route of ["/", "/chat", "/letters", "/letters/2026-06-30-junes-final-whistle", "/classic", "/works/apple-album-6797260493"]) {
    const value = record.routes[route];
    check(value?.httpStatus === 200 && value.redirects === 0 && value.fatalErrorPage === false, "expected clean Preview GET: " + route);
  }
  const exhibition = record.routes["/exhibition"];
  check(exhibition?.httpStatus === 200 && exhibition.redirects === 1 && exhibition.finalPath === "/works" && exhibition.status === "UNEXPECTED_REDIRECT_TO_WORKS", "Exhibition redirect must remain the blocker");
  check(record.exhibition.apiMethod === "GET" && record.exhibition.sourceSideEffectFree && record.exhibition.previewApiHttpStatus === 200 && record.exhibition.previewApiItems === 514 && record.exhibition.previewApiUniqueStableIds === 514 && record.exhibition.localCanonicalDisplayedWorks === 514 && record.exhibition.localCanonicalMissingReleasedWorks === 0, "canonical Exhibition API evidence exact");
  for (const route of ["/oracle", "/oracle/omikuji"]) {
    const value = record.routes[route];
    check(value?.httpStatus === 200 && value.redirects === 1 && value.finalPath === "/" && value.status === "ORACLE_INACTIVE_BY_DESIGN", "Oracle inactivity exact: " + route);
  }
  check(record.boundaries.chatProviderCalls === 0 && record.boundaries.paymentOperations === 0 && record.boundaries.dataWrites === 0 && record.boundaries.forcedPlayback === 0 && record.boundaries.r7c2 === "BLOCKED_PRODUCT_CONTRACT / PAID_CONTINUATION_NOT_ACTIVATED" && record.boundaries.oracle === "ORACLE_INACTIVE_BY_DESIGN", "provider/payment/data/playback boundaries retained");
  check(record.runtimeLogs.errorFatalResult === "NO_ERROR_OR_500_LOGS_RETURNED" && record.runtimeLogs.http500Result === "NO_ERROR_OR_500_LOGS_RETURNED", "bounded runtime logs classified");
  check(record.production.deploymentBefore === "dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX" && record.production.deploymentAfter === record.production.deploymentBefore && record.production.alias === "www.hakusyaku.xyz" && record.production.aliasUnchanged && !record.production.previewHasProductionAlias && record.production.mutation === 0, "production must remain unchanged");
  check(record.result === "BLOCKED_BY_RUNTIME" && record.blocker.includes("/exhibition") && record.nextGate === "SEPARATE_AUTHORIZED_EXHIBITION_PREVIEW_ROUTE_DIAGNOSIS", "cleanup must remain blocked");
  check(record.truthBoundary.length >= 6 && doc.includes("## Next Gate and truth boundary") && plan.includes("RECOVERY-ONLY-RC-PREVIEW") && plan.includes("BLOCKED_BY_RUNTIME"), "documentation must retain blocker and truth boundary");

  console.log(JSON.stringify({ status: "PASS", checksPassed: checks, recordedResult: record.result, previewDeploymentId: record.preview.deploymentId, deployCount: record.authorization.deployCount, productionMutation: record.production.mutation }, null, 2));
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.stack || error.message : "RECOVERY_ONLY_RC_PREVIEW_VALIDATION_FAILED");
  process.exitCode = 1;
}
