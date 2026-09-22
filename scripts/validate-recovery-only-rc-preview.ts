import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const expectedHead = "cad8c6c473612d12286868e541e4624545d1250b";
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
function routePass(route: { httpStatus?: number; redirects?: number; finalPath?: string; fatalErrorPage?: boolean } | undefined, finalPath: string) {
  return route?.httpStatus === 200 && route.redirects === 0 && route.finalPath === finalPath && route.fatalErrorPage === false;
}

function main() {
  const record = JSON.parse(read("ops/recovery/recovery-only-rc-preview-validation-20260922.json")) as any;
  const doc = read("docs/AI/RECOVERY_ONLY_RC_PREVIEW_VALIDATION.md");
  const plan = read("docs/AI/RECOVERY_PLAN.md");
  const nextConfig = read("next.config.js");
  const changed = execFileSync("git", ["status", "--porcelain=v1"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean).map((line) => line.slice(3));

  check(git("rev-parse", "HEAD") === expectedHead, "validation HEAD must be exact");
  check(git("branch", "--show-current") === "recovery/musiam-clean-20260920", "Recovery branch must be exact");
  check(changed.length === 4 && changed.every((p) => allowedChanges.has(p)), "only four Preview record files may change");
  check(!fs.existsSync(path.join(root, ".env.local")), ".env.local must be absent");
  check(record.schemaVersion === "recovery-only-rc-preview-validation/v2" && record.startingHead === expectedHead && record.applicationFilesChangedDuringValidation === 0, "identity and validation application-drift boundary exact");
  check(record.routeAuthority.path === "src/pages/exhibition.tsx" && record.routeAuthority.legacyRedirectRemoved && fs.existsSync(path.join(root, record.routeAuthority.path)), "Exhibition route authority exact");
  check(!/source:\s*["']\/exhibition["'][\s\S]{0,250}destination:\s*["']\/works["']/.test(nextConfig), "legacy Exhibition redirect must remain removed");
  check(record.linkage.existingProjectMetadataOnly && record.linkage.team === "hakusyakus-projects" && record.linkage.project === "musiam-front" && !record.linkage.relinkPerformed && !record.linkage.envPullPerformed, "existing linkage only");
  check(record.environmentMaterialization.envLocalAbsentBeforeDeploy && record.environmentMaterialization.envLocalAbsentAfterDeploy && !record.environmentMaterialization.envValuesRead, "environment boundary retained");
  check(record.authorization.previewDeployAuthorized && !record.authorization.productionDeployAuthorized && record.authorization.maxPreviewDeployCount === 1 && record.authorization.deployCount === 1 && record.authorization.productionDeployCount === 0 && !record.authorization.gitCommitAuthorized, "deploy and commit guards exact");
  check(record.preview.deploymentId === "dpl_9eB9h2AgwwyUZ5k7nmLEBkfZNKaT" && record.preview.url === "https://musiam-front-i505jvayn-hakusyakus-projects.vercel.app" && record.preview.target === "preview" && record.preview.state === "READY" && record.preview.buildResult === "PASS" && record.preview.buildDuration === "2m 51s" && record.preview.framework.includes("15.5.12") && record.preview.nodeRuntime.includes("22") && record.preview.productionAliases.length === 0, "Preview build metadata exact");
  for (const [route, finalPath] of [["/", "/"], ["/chat", "/chat"], ["/exhibition", "/exhibition"], ["/letters", "/letters"], ["/letters/2026-06-30-junes-final-whistle", "/letters/2026-06-30-junes-final-whistle"], ["/classic", "/classic"], ["/works/apple-album-6797260493", "/works/apple-album-6797260493"]] as const) check(routePass(record.routes[route], finalPath), `expected direct Preview GET: ${route}`);
  check(record.routes["/chat"].textareaRenderedHtml === true && record.routes["/chat"].clientInteraction === "NOT_EXECUTED", "Chat render-only boundary exact");
  check(record.exhibition.apiMethod === "GET" && record.exhibition.sourceSideEffectFree && record.exhibition.previewApiHttpStatus === 200 && record.exhibition.previewApiItems === 514 && record.exhibition.previewApiUniqueStableIds === 514 && record.exhibition.localCanonicalDisplayedWorks === 514 && record.exhibition.localCanonicalMissingReleasedWorks === 0 && record.exhibition.uiRouteStatus === "DIRECT_RENDER_PASS", "canonical Exhibition evidence exact");
  for (const route of ["/oracle", "/oracle/omikuji"]) { const value = record.routes[route]; check(value?.httpStatus === 200 && value.redirects === 1 && value.finalPath === "/" && value.status === "ORACLE_INACTIVE_BY_DESIGN", `Oracle inactivity exact: ${route}`); }
  check(record.boundaries.chatProviderCalls === 0 && record.boundaries.paymentOperations === 0 && record.boundaries.dataWrites === 0 && record.boundaries.forcedPlayback === 0 && record.boundaries.oracle === "ORACLE_INACTIVE_BY_DESIGN", "provider/payment/data/playback boundaries retained");
  check(record.runtimeLogs.errorFatalResult === "NO_ERROR_OR_500_LOGS_RETURNED" && record.runtimeLogs.http500Result === "NO_ERROR_OR_500_LOGS_RETURNED", "bounded runtime logs classified");
  check(record.production.deploymentBefore === "dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX" && record.production.deploymentAfter === record.production.deploymentBefore && record.production.alias === "www.hakusyaku.xyz" && record.production.aliasUnchanged && !record.production.previewHasProductionAlias && record.production.mutation === 0, "production must remain unchanged");
  check(record.result === "PASS_READY_FOR_CLEANUP" && record.nextGate === "SEPARATELY_AUTHORIZED_CLEANUP", "cleanup readiness must remain authorization-bounded");
  check(record.truthBoundary.length >= 5 && doc.includes("PASS_READY_FOR_CLEANUP") && plan.includes("RECOVERY-ONLY-RC-PREVIEW") && plan.includes("PASS_READY_FOR_CLEANUP"), "documentation must retain Preview pass and truth boundary");
  console.log(JSON.stringify({ status: "PASS", checksPassed: checks, recordedResult: record.result, previewDeploymentId: record.preview.deploymentId, deployCount: record.authorization.deployCount, productionMutation: record.production.mutation }, null, 2));
}
try { main(); } catch (error: unknown) { console.error(error instanceof Error ? error.stack || error.message : "RECOVERY_ONLY_RC_PREVIEW_VALIDATION_FAILED"); process.exitCode = 1; }
