import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const governanceHead = "a5a374def2ad5b11a6878518cd9ec5f71344c832";
const applicationBaseHead = "a918b05fba988884d27efd5509e2a3eee6df1127";
const allowedChanges = new Set([
  "docs/AI/RECOVERY_ONLY_RC_VALIDATION.md",
  "ops/recovery/recovery-only-rc-validation-20260922.json",
  "scripts/validate-recovery-only-rc-validation.ts",
  "docs/AI/RECOVERY_PLAN.md",
]);
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");
const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
let checks = 0;

function check(condition: unknown, message: string): asserts condition {
  checks += 1;
  assert.ok(condition, message);
}

type ValidationRecord = {
  governanceHead: string;
  applicationBaseHead: string;
  applicationDrift: { count: number; classification: string };
  ownerDecisions: Record<string, string>;
  criticalInvariants: Record<string, string>;
  validatorMatrix: Array<{ name: string; status: string }>;
  typecheck: string;
  lint: string;
  diffCheck: string;
  secretScan: { status: string; secretValueExposure: boolean };
  build: { status: string; applicationFailure: boolean };
  deployInput: { fileCount: number; manifestSha256: string; driftClassification: string; applicationDrift: number; providerMutation: boolean };
  routeContract: { status: string; routes: string[]; oracleRedirectRetained: boolean; externalProviderCallsPerformed: number };
  previewSmokePlan: { exists: boolean; publicPages: string[] };
  previewAuthorized: boolean;
  productionMutation: boolean;
  deploy: boolean;
  push: boolean;
  providerPaymentDataOperations: number;
  localValidationState: string;
  truthBoundary: string[];
};

function main() {
  const record = JSON.parse(read("ops/recovery/recovery-only-rc-validation-20260922.json")) as ValidationRecord;
  const ownerRecord = read("ops/recovery/recovery-only-rc-20260922.json");
  const validationDoc = read("docs/AI/RECOVERY_ONLY_RC_VALIDATION.md");
  const recoveryPlan = read("docs/AI/RECOVERY_PLAN.md");
  const chat = read("src/pages/chat.tsx");
  const chatRoute = read("src/pages/api/chat-experience-v3.ts");
  const history = read("src/pages/api/chat-history.ts");
  const exhibition = read("src/pages/api/exhibition.ts");
  const oracle = read("src/app/oracle/page.tsx");
  const omikuji = read("src/app/oracle/omikuji/page.tsx");
  const webhook = read("src/app/api/metal-print/webhook/route.ts");
  const statusPaths = execFileSync("git", ["status", "--porcelain=v1"], { cwd: root, encoding: "utf8" })
    .split("\n").filter(Boolean).map((line) => line.slice(3));
  const runtimeChanges = git("diff", "--name-only", `${applicationBaseHead}..${governanceHead}`, "--", "src/**", "public/**", "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "next.config.js", "next.config.mjs", "next.config.ts", "vercel.json", "tsconfig.json");

  check(git("rev-parse", "HEAD") === governanceHead, "governance HEAD must remain exact during validation");
  check(git("branch", "--show-current") === "recovery/musiam-clean-20260920", "Recovery branch must remain exact");
  check(record.governanceHead === governanceHead && record.applicationBaseHead === applicationBaseHead, "governance and application identities must be exact");
  check(runtimeChanges === "" && record.applicationDrift.count === 0 && record.applicationDrift.classification === "ZERO", "application drift must be zero");
  check(statusPaths.length === 4 && statusPaths.every((entry) => allowedChanges.has(entry)), "only the four validation record files may be changed");
  check(record.ownerDecisions.OD1 === "KEEP_RECOVERY_FOR_THIS_RC" && record.ownerDecisions.OD2 === "KEEP_DIGITAL_SHOP_DEFERRED" && record.ownerDecisions.OD3 === "KEEP_CURRENT_LLM_ROUTER", "owner decisions must remain frozen");
  check(record.ownerDecisions.rcPath === "RECOVERY_ONLY" && ownerRecord.includes('"rcPath": "RECOVERY_ONLY"'), "RC path must remain Recovery-only");
  check(record.criticalInvariants.catalog.includes("514") && read("src/lib/loadMergedWorksServer.ts").includes("loadMergedWorksServer"), "catalog must retain canonical stable-ID runtime evidence");
  check(chat.includes('fetch("/api/chat-experience-v3"') && !/entitlement/i.test(history) && record.criticalInvariants.chat.includes("history != entitlement"), "Chat v3 and history boundary must remain active");
  check(chatRoute.includes("HARD_MAX_USER_TURNS = 20") && record.criticalInvariants.r7c2 === "BLOCKED_PRODUCT_CONTRACT / PAID_CONTINUATION_NOT_ACTIVATED", "R7-C2 must remain blocked");
  check(exhibition.includes("loadExhibitionProjection") && record.criticalInvariants.exhibition === "displayed=514; missingReleasedWorks=0", "Exhibition must retain 514 / missing 0");
  check(oracle.includes('redirect("/")') && omikuji.includes('redirect("/")') && record.criticalInvariants.oracle === "ORACLE_INACTIVE_BY_DESIGN", "Oracle must remain inactive");
  check(webhook.includes("routeMetalPrintCheckoutWebhook") && record.criticalInvariants.r1 === "METAL_PRINT_WEBHOOK_IDENTITY_BOUNDARY_RETAINED", "R1 webhook identity boundary must remain retained");
  check(record.validatorMatrix.length === 13 && record.validatorMatrix.every((item) => item.status === "PASS" || item.status === "PASS_AT_APPLICATION_BASE"), "validator matrix must be complete and contextually passing");
  check(record.typecheck.startsWith("PASS") && record.lint.startsWith("PASS") && record.diffCheck === "PASS", "typecheck, lint, and diff check must pass");
  check(record.secretScan.status === "PASS" && !record.secretScan.secretValueExposure, "secret scan must pass without value exposure");
  check(record.build.status === "BLOCKED_BY_FONT_DNS" && !record.build.applicationFailure, "build must be classified as the known DNS blocker only");
  check(record.deployInput.fileCount === 3208 && /^[a-f0-9]{64}$/.test(record.deployInput.manifestSha256) && record.deployInput.providerMutation === false, "current governance deploy-input manifest must be recorded and offline");
  check(record.deployInput.driftClassification === "NON_RUNTIME_GOVERNANCE_MANIFEST_DRIFT" && record.deployInput.applicationDrift === 0, "governance manifest drift must remain separate from application drift");
  check(record.routeContract.status === "SOURCE_INSPECTION_PASS" && record.routeContract.routes.length === 11 && record.routeContract.oracleRedirectRetained && record.routeContract.externalProviderCallsPerformed === 0, "safe route contract must be recorded without provider calls");
  check(record.previewSmokePlan.exists && record.previewSmokePlan.publicPages.includes("/works/<stable-id>"), "Preview smoke plan must exist");
  check(record.previewAuthorized === false && record.productionMutation === false, "Preview and production mutation must remain false");
  check(record.deploy === false && record.push === false && record.providerPaymentDataOperations === 0, "deploy, push, and provider/payment/data operations must remain absent");
  check(record.truthBoundary.length >= 6 && validationDoc.includes("## Truth Boundary") && recoveryPlan.includes("RECOVERY-ONLY-RC-VALIDATION"), "truth boundary and Recovery Plan update must be present");
  check(record.localValidationState === "LOCAL_VALIDATION_PASS_PREVIEW_GATE_REQUIRED", "local validation must stop at the Preview Human Gate");

  console.log(JSON.stringify({ status: "PASS", checksPassed: checks, governanceHead, applicationBaseHead, applicationDrift: record.applicationDrift.count, build: record.build.status, previewAuthorized: record.previewAuthorized, deploy: record.deploy, push: record.push }, null, 2));
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.stack || error.message : "RECOVERY_ONLY_RC_VALIDATION_GATE_FAILED");
  process.exitCode = 1;
}
