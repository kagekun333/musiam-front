import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");
const json = <T>(relativePath: string): T => JSON.parse(read(relativePath)) as T;
let checks = 0;

function check(condition: unknown, message: string): asserts condition {
  checks += 1;
  assert.ok(condition, message);
}

type Provenance = {
  recoveryHead?: string;
  productionDeploymentId?: string;
  productionAlias?: string;
  deploymentCreatedAt?: string;
  provenanceStatus?: string;
  originalDeployDirectory?: string | null;
  deployDirectoryExists?: boolean;
  deploymentCommandEvidence?: { classification?: string; exactWorkingDirectory?: string | null };
  workingDirectoryEvidence?: string;
  baseSourceType?: string;
  baseGitSha?: string | null;
  candidate?: { classification?: string; exists?: boolean; envFilePresent?: boolean };
  candidateManifest?: { fileCount?: number; ignoredCount?: number; sha256?: string; sourceCopiedIntoRecovery?: boolean };
  currentDeploymentInputManifest?: { fileCount?: number; sha256?: string; match?: { pathMatches?: number; modeAndContentIdMatches?: number; missingCandidatePaths?: number; mismatchedCandidatePaths?: number } };
  dryRun?: { supported?: boolean; includedFileCount?: number; contentHashesAvailable?: boolean; deploymentCreated?: boolean };
  buildFingerprint?: { match?: boolean };
  hotfixDelta?: { classification?: string; runtimeFilesWithEstablishedBytes?: Array<{ path?: string; deployedSha256?: string; recoveryHeadSha256?: string }>; exactFullHotfixFileListEstablished?: boolean };
  unknownInputs?: string[];
  exactnessCriteria?: Record<string, unknown>;
  sourceReadyForExactDiff?: boolean;
  envRotationReviewRequired?: boolean;
  envFilesInspected?: boolean;
  secretValuesAccessed?: number;
  productionMutationPerformed?: boolean;
  deployPerformed?: boolean;
  pushPerformed?: boolean;
  mergePerformed?: boolean;
  providerPaymentDataOperations?: number;
  truthBoundary?: string[];
  nextGate?: string;
};

function main() {
  const manifestPath = "ops/recovery/production-source-provenance-20260921.json";
  const reportPath = "docs/AI/PRODUCTION_SOURCE_PROVENANCE.md";
  const manifest = json<Provenance>(manifestPath);
  const report = read(reportPath);
  const plan = read("docs/AI/RECOVERY_PLAN.md");
  const finalIntegration = read("docs/AI/RECOVERY_FINAL_INTEGRATION.md");
  const serialized = `${read(manifestPath)}\n${report}`;

  check(manifest.recoveryHead === "9b710384cbcb321bb0dd462c7c104bc18f93f54c", "recorded Recovery HEAD must be exact");
  check(manifest.productionDeploymentId === "dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX", "current deployment ID must be exact");
  check(manifest.provenanceStatus === "EXACT_REPRODUCIBLE_SOURCE", "provenance status must be valid and exact");
  check(Boolean(manifest.deploymentCreatedAt), "deployment timestamp must be recorded");
  check(manifest.deploymentCommandEvidence?.classification === "COMMAND_FOUND_CWD_UNAVAILABLE", "command evidence must retain its limit");
  check(manifest.workingDirectoryEvidence === "NOT_PROVEN" && manifest.originalDeployDirectory === null && manifest.deployDirectoryExists === false, "original cwd must not be invented");
  check(manifest.baseSourceType === "VERCEL_CURRENT_DEPLOYMENT_INPUT_MANIFEST_MATCHED_LOCAL_TREE" && manifest.baseGitSha === null, "base source classification must not invent Git provenance");
  check(manifest.candidate?.classification === "EXACT_SOURCE_ARTIFACT_NOT_PROVEN_ORIGINAL_CWD" && manifest.candidate.exists === true, "candidate status must distinguish source identity from cwd identity");
  check(manifest.candidateManifest?.fileCount === 3150 && manifest.currentDeploymentInputManifest?.fileCount === 3150, "both source manifests must record 3,150 files");
  check(manifest.candidateManifest?.sha256 === manifest.currentDeploymentInputManifest?.sha256, "candidate and deployment manifest hashes must match");
  check(manifest.currentDeploymentInputManifest?.match?.pathMatches === 3150 && manifest.currentDeploymentInputManifest?.match?.modeAndContentIdMatches === 3150, "all input path, mode, and content IDs must match");
  check(manifest.currentDeploymentInputManifest?.match?.missingCandidatePaths === 0 && manifest.currentDeploymentInputManifest?.match?.mismatchedCandidatePaths === 0, "no source input mismatch may be hidden");
  check(manifest.dryRun?.supported === true && manifest.dryRun?.includedFileCount === 3150 && manifest.dryRun?.contentHashesAvailable === true && manifest.dryRun?.deploymentCreated === false, "dry-run must be non-mutating and complete");
  check(manifest.buildFingerprint?.match === true, "build fingerprint corroboration must be recorded");
  check(manifest.hotfixDelta?.classification === "FULL_CURRENT_VS_PRIOR_HOTFIX_DELTA_NOT_ESTABLISHED" && manifest.hotfixDelta?.exactFullHotfixFileListEstablished === false, "historical small-hotfix claim must remain unpromoted");
  check(manifest.hotfixDelta?.runtimeFilesWithEstablishedBytes?.length === 2 && manifest.hotfixDelta.runtimeFilesWithEstablishedBytes.every((file) => file.path && file.deployedSha256 && file.deployedSha256 === file.recoveryHeadSha256), "only established runtime byte matches may be recorded");
  check(Array.isArray(manifest.unknownInputs) && manifest.unknownInputs.length === 0, "included source inputs must be explicit");
  check(manifest.sourceReadyForExactDiff === true && Boolean(manifest.exactnessCriteria?.completeLocalTreeMatchesProviderManifest), "exact-diff readiness must follow the manifest evidence");
  check(manifest.envRotationReviewRequired === true && manifest.envFilesInspected === false && manifest.candidate?.envFilePresent === false, "environment inspection boundary must be retained");
  check(manifest.secretValuesAccessed === 0 && !/eyJ2Ijo|\b(?:sk_(?:live|test)|whsec_)\S+|authorization:\s*bearer\s+\S+/i.test(serialized), "reports must contain no secret or encrypted environment value");
  check(manifest.productionMutationPerformed === false && manifest.deployPerformed === false && manifest.pushPerformed === false && manifest.mergePerformed === false, "no production mutation, deploy, push, or merge may be recorded");
  check(manifest.providerPaymentDataOperations === 0, "provider/payment/data operations must remain zero");
  check(manifest.candidateManifest?.sourceCopiedIntoRecovery === false, "production source copy into Recovery is forbidden");
  check(Array.isArray(manifest.truthBoundary) && manifest.truthBoundary.length >= 6 && report.includes("## Truth Boundary"), "truth boundary must be explicit");
  check(manifest.nextGate === "Exact Production vs Recovery Diff / Merge Plan (separate Unit; not started)", "only the next Gate may be named");
  check(report.includes("No production-vs-Recovery diff was performed."), "report must state that no source diff was performed");
  check(plan.includes("RC_SOURCE_PROVENANCE_INCOMPLETE") && finalIntegration.includes("BLOCKED_PRODUCT_CONTRACT") && finalIntegration.includes("ORACLE_INACTIVE_BY_DESIGN"), "existing recovery and product holds must remain intact");

  console.log(JSON.stringify({
    status: "PASS",
    checksPassed: checks,
    recoveryHead: manifest.recoveryHead,
    deploymentId: manifest.productionDeploymentId,
    provenanceStatus: manifest.provenanceStatus,
    sourceManifestFileCount: manifest.candidateManifest?.fileCount,
    sourceReadyForExactDiff: manifest.sourceReadyForExactDiff,
    networkRequests: 0,
    productionOperations: 0,
  }, null, 2));
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.stack || error.message : "PRODUCTION_SOURCE_PROVENANCE_VALIDATION_FAILED");
  process.exitCode = 1;
}
