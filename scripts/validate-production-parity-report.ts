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

type Manifest = {
  recovery?: { head?: string };
  production?: { deploymentId?: string; sourceProvenance?: { classification?: string } };
  sourceParity?: string;
  diff?: { available?: boolean; changedFileCount?: number | null; classificationCounts?: Record<string, string> };
  environmentContract?: { classification?: string; requiredNameCount?: number; missingRequiredGroupCount?: number };
  buildCompatibility?: { classification?: string };
  runtimeSmoke?: { classification?: string };
  migration?: { classification?: string };
  releaseCandidateDecision?: string;
  productionParity?: string;
  operations?: { deployPerformed?: boolean; pushPerformed?: boolean; productionMutations?: number; providerPaymentDataOperations?: number };
  truthBoundary?: string[];
};

const allowed = {
  provenance: new Set(["EXACT_GIT_SOURCE", "DIRECT_DEPLOY_SOURCE", "PARTIAL_SOURCE_PROVENANCE", "SOURCE_UNKNOWN"]),
  sourceParity: new Set(["EXACT_MATCH", "VERIFIED_DIFFERENT", "PARTIAL", "UNKNOWN"]),
  env: new Set(["ENV_CONTRACT_COMPATIBLE_NAMES_ONLY", "ENV_CONTRACT_MISSING_REQUIRED", "ENV_CONTRACT_PARTIAL", "ENV_CONTRACT_UNKNOWN"]),
  build: new Set(["LOCAL_PASS", "BLOCKED_BY_FONT_DNS", "APPLICATION_FAILURE", "NOT_RUN"]),
  smoke: new Set(["PASS_READ_ONLY", "PARTIAL", "FAILED", "NOT_RUN"]),
  migration: new Set(["NONE", "REQUIRED", "POSSIBLE", "UNKNOWN"]),
  decision: new Set(["RC_READY_TO_ASSEMBLE", "RC_REQUIRES_MERGE_PLAN", "RC_BLOCKED_BY_CONFLICT", "RC_BLOCKED_BY_ENV", "RC_BLOCKED_BY_BUILD", "RC_SOURCE_PROVENANCE_INCOMPLETE"]),
  parity: new Set(["VERIFIED_MATCH", "VERIFIED_DIFFERENT", "PARTIAL", "UNVERIFIED"]),
};

function main() {
  const manifestPath = "ops/recovery/production-parity-20260921.json";
  const reportPath = "docs/AI/PRODUCTION_PARITY_RELEASE_CANDIDATE.md";
  const manifest = json<Manifest>(manifestPath);
  const report = read(reportPath);
  const finalIntegration = read("docs/AI/RECOVERY_FINAL_INTEGRATION.md");
  const recoveryPlan = read("docs/AI/RECOVERY_PLAN.md");
  const serialized = `${read(manifestPath)}\n${report}`;

  check(manifest.recovery?.head === "3f34aac3cae09ca0fd46d2d29d99728d77bba167", "recovery HEAD must be recorded exactly");
  check(Boolean(manifest.production?.deploymentId) || report.includes("deployment ID unavailable"), "production deployment ID must be present or explicitly unavailable");
  check(allowed.provenance.has(manifest.production?.sourceProvenance?.classification ?? ""), "production provenance must be classified");
  check(allowed.sourceParity.has(manifest.sourceParity ?? ""), "source parity must be classified");
  check(Boolean(manifest.diff?.classificationCounts) && Object.hasOwn(manifest.diff!.classificationCounts!, "UNKNOWN"), "diff counts or explicit source-unavailable classification must be recorded");
  check(allowed.env.has(manifest.environmentContract?.classification ?? ""), "environment contract must be classified");
  check(allowed.build.has(manifest.buildCompatibility?.classification ?? ""), "build compatibility must be classified");
  check(allowed.smoke.has(manifest.runtimeSmoke?.classification ?? ""), "runtime smoke must be classified");
  check(allowed.migration.has(manifest.migration?.classification ?? ""), "migration classification must be recorded");
  check(allowed.decision.has(manifest.releaseCandidateDecision ?? ""), "release candidate decision must be classified");
  check(allowed.parity.has(manifest.productionParity ?? ""), "overall production parity must be classified");
  check(!/eyJ2Ijo|\b(?:sk_(?:live|test)|whsec_)\S+|authorization:\s*bearer\s+\S+/i.test(serialized), "report and manifest must not contain secret values or encrypted environment blobs");
  check(finalIntegration.includes("BLOCKED_PRODUCT_CONTRACT") && finalIntegration.includes("PAID_CONTINUATION_NOT_ACTIVATED"), "R7-C2 must remain blocked");
  check(finalIntegration.includes("ORACLE_INACTIVE_BY_DESIGN"), "Oracle must remain inactive");
  check(recoveryPlan.includes("RECOVERED_PRESERVED_HOLD"), "R2 HOLD must remain recorded");
  check(recoveryPlan.includes("RECOVERED_PRESERVED_EXPERIMENT"), "R3 must remain preserved");
  check(recoveryPlan.includes("PRESERVE_HOLD / SEPARATE_BUSINESS_SCOPE"), "R5 must remain separate");
  check(manifest.operations?.deployPerformed === false && manifest.operations?.productionMutations === 0, "no production deploy or mutation may be recorded");
  check(manifest.operations?.pushPerformed === false && manifest.operations?.providerPaymentDataOperations === 0, "no push or provider/payment/data operation may be recorded");
  check(Array.isArray(manifest.truthBoundary) && manifest.truthBoundary.length >= 12 && report.includes("## Truth Boundary"), "truth boundary must be complete in manifest and report");
  check(manifest.production?.sourceProvenance?.classification !== "EXACT_GIT_SOURCE" || Boolean(manifest.diff?.available), "exact Git provenance requires an available source diff");

  console.log(JSON.stringify({
    status: "PASS",
    checksPassed: checks,
    recoveryHead: manifest.recovery?.head,
    productionDeploymentId: manifest.production?.deploymentId,
    productionProvenance: manifest.production?.sourceProvenance?.classification,
    productionParity: manifest.productionParity,
    releaseCandidateDecision: manifest.releaseCandidateDecision,
    networkRequests: 0,
    productionOperations: 0,
  }, null, 2));
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.stack || error.message : "PRODUCTION_PARITY_VALIDATION_FAILED");
  process.exitCode = 1;
}
