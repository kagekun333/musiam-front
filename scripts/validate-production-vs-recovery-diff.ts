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

const classifications = new Set([
  "RECOVERY_ONLY_EXPECTED",
  "PRODUCTION_ONLY_VALID",
  "SUPERSEDED_BY_RECOVERY",
  "IDENTICAL_SEMANTICS_DIFFERENT_BYTES",
  "GENERATED_OR_NON_RUNTIME",
  "HISTORICAL_ONLY",
  "CONFLICT",
  "UNKNOWN",
]);

const rcDecisions = new Set([
  "RECOVERY_IS_RC_BASE",
  "RECOVERY_IS_RC_BASE_NO_PRODUCTION_ADOPTION",
  "RECOVERY_IS_RC_BASE_WITH_MERGE_UNITS",
  "PRODUCTION_REQUIRES_PRESERVATION_FIRST",
  "ARCHITECTURE_CONFLICT",
]);

type DiffRecord = {
  path: string;
  productionExists: boolean;
  recoveryExists: boolean;
  productionHash: string | null;
  recoveryHash: string | null;
  productionMode: number | null;
  recoveryMode: number | null;
  classification: string;
  subsystem: string;
  runtimeRelevance: string;
  reviewStatus: string;
  decision: string;
  evidence: string;
};

type DiffManifest = {
  schemaVersion: string;
  observedAt: string;
  production: { deploymentId: string; manifestSha256: string; fileCount: number };
  recovery: { head: string; manifestSha256: string; fileCount: number };
  deployInput: { cliDryRunStatus: string; offlineCollectorStatus: string; providerMutation: boolean };
  counts: Record<string, number>;
  subsystemSummary: Record<string, { differingPaths: number; applicationPaths: number }>;
  applicationReview: { differingApplicationFileCount: number; reviewedApplicationFileCount: number };
  classificationSummary: Record<string, number>;
  differingPaths: DiffRecord[];
  highRisk: Record<string, Array<Record<string, unknown>>>;
  productionOnlyValidUnits: Array<Record<string, unknown>>;
  recoveryAuthoritativeUnits: Array<Record<string, unknown>>;
  conflicts: Array<Record<string, unknown>>;
  unknowns: Array<Record<string, unknown>>;
  migrationAssessment: Record<string, string>;
  terraDecisionAudit: {
    status: string;
    classificationArithmetic: { reviewedRecords: number; productionOnlyValidReviewed: number; conflictsReviewed: number; conflictsRemaining: number; unknownReviewed: number; unknownRemaining: number };
    reclassifications: Array<{ from: string; to: string; paths: string[] }>;
    collectorMethodology: { status: string };
    rcBaseDecision: string;
  };
  rcBaseDecision: string;
  flags: Record<string, unknown>;
  truthBoundary: string[];
  nextGate: string;
};

function main() {
  const manifest = json<DiffManifest>("ops/recovery/production-vs-recovery-diff-20260921.json");
  const plan = read("docs/AI/PRODUCTION_VS_RECOVERY_DIFF_MERGE_PLAN.md");
  const recoveryPlan = read("docs/AI/RECOVERY_PLAN.md");
  const serialized = `${read("ops/recovery/production-vs-recovery-diff-20260921.json")}\n${plan}`;

  check(manifest.schemaVersion === "production-vs-recovery-diff/v1", "schema version must be exact");
  check(manifest.production.deploymentId === "dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX", "production deployment ID must be exact");
  check(manifest.production.manifestSha256 === "1a4ee637d55be29b4f7307daa10e9d9fc0ac7b36348337300ed34aa0c126af0b", "production manifest hash must retain provenance authority");
  check(manifest.recovery.head === "c76c138f7258096e1a606235e89107782eb1ebc0", "Recovery HEAD must be exact");
  check(/^[a-f0-9]{64}$/.test(manifest.recovery.manifestSha256), "Recovery manifest hash must be a SHA-256");
  check(manifest.production.fileCount === 3150 && manifest.recovery.fileCount === 3199, "source file counts must be recorded");
  check(manifest.deployInput.cliDryRunStatus === "BLOCKED_PROJECT_NOT_LINKED", "CLI dry-run limitation must remain explicit");
  check(manifest.deployInput.offlineCollectorStatus === "PASS_CALIBRATED_AGAINST_PRODUCTION_DRY_RUN", "offline collector evidence must be explicit");
  check(manifest.deployInput.providerMutation === false, "provider mutation must remain false");

  const counts = manifest.counts;
  check(counts.modified + counts.modeOnly + counts.productionOnly + counts.recoveryOnly === counts.totalDifferingPaths, "diff counts must sum");
  check(counts.productionFileCount === manifest.production.fileCount && counts.recoveryFileCount === manifest.recovery.fileCount, "count roots must match source manifests");
  check(counts.totalDifferingPaths === manifest.differingPaths.length, "inventory length must match total differences");
  check(counts.identical === 2987 && counts.modified === 40 && counts.modeOnly === 1 && counts.productionOnly === 122 && counts.recoveryOnly === 171, "exact diff counts must be retained");

  const paths = new Set<string>();
  for (const item of manifest.differingPaths) {
    check(!paths.has(item.path), `duplicate differing path: ${item.path}`);
    paths.add(item.path);
    check(classifications.has(item.classification), `invalid classification: ${item.path}`);
    check(item.productionExists || item.recoveryExists, `path must exist on one side: ${item.path}`);
    check(item.reviewStatus === "REVIEWED" || item.reviewStatus === "MACHINE_CLASSIFIED", `review status missing: ${item.path}`);
    check(item.evidence.length > 0 && item.decision.length > 0, `evidence/decision missing: ${item.path}`);
  }
  check(Object.values(manifest.classificationSummary).reduce((sum, value) => sum + value, 0) === counts.totalDifferingPaths, "classification counts must sum");
  for (const classification of classifications) {
    check(Object.hasOwn(manifest.classificationSummary, classification), `classification summary missing: ${classification}`);
  }

  check(manifest.applicationReview.differingApplicationFileCount === 156, "application diff count must be 156");
  check(manifest.applicationReview.reviewedApplicationFileCount === 156, "every differing application path must be reviewed");
  check(manifest.subsystemSummary.CATALOG?.differingPaths !== undefined, "catalog subsystem must be recorded");
  check(manifest.subsystemSummary.CHAT?.differingPaths !== undefined, "Chat subsystem must be recorded");
  check(manifest.subsystemSummary.PAYMENT?.differingPaths !== undefined, "payment subsystem must be recorded");
  check(manifest.subsystemSummary.METAL_PRINT?.differingPaths !== undefined, "Metal Print subsystem must be recorded");
  check(manifest.subsystemSummary.EXHIBITION?.differingPaths !== undefined, "Exhibition subsystem must be recorded");
  check(manifest.subsystemSummary.ORACLE?.differingPaths !== undefined, "Oracle subsystem must be recorded");
  check(manifest.subsystemSummary.TODAYS_PICK?.differingPaths !== undefined, "TodaysPick subsystem must be recorded");
  check(manifest.subsystemSummary.HOME_REALM?.differingPaths !== undefined, "Home/Realm subsystem must be recorded");
  check(manifest.subsystemSummary.LETTERS?.differingPaths !== undefined, "Letters subsystem must be recorded");
  check(manifest.subsystemSummary.BROADCAST?.differingPaths !== undefined, "Broadcast subsystem must be recorded");
  check(manifest.subsystemSummary.NOW_PLAYING?.differingPaths !== undefined, "Now Playing subsystem must be recorded");
  check(manifest.subsystemSummary.CONFIG?.differingPaths !== undefined, "config subsystem must be recorded");

  for (const [name, entries] of Object.entries(manifest.highRisk)) {
    check(entries.length > 0, `high-risk group must not be empty: ${name}`);
    for (const entry of entries) check(typeof entry.path === "string" && typeof entry.status === "string", `high-risk status missing: ${name}`);
  }
  check(manifest.highRisk.CATALOG.some((entry) => entry.path === "public/works/works.json"), "catalog master status must be recorded");
  check(manifest.highRisk.CHAT.some((entry) => entry.path === "src/pages/api/chat-experience-v3.ts"), "active Chat v3 status must be recorded");
  check(manifest.highRisk.METAL_PRINT.some((entry) => entry.path === "src/app/api/metal-print/webhook/route.ts"), "Metal Print webhook status must be recorded");
  check(manifest.highRisk.EXHIBITION.some((entry) => entry.path === "src/pages/api/exhibition.ts"), "Exhibition adapter status must be recorded");
  check(manifest.highRisk.ORACLE.some((entry) => entry.decision === "ORACLE_INACTIVE_BY_DESIGN"), "Oracle inactive decision must be retained");

  check(manifest.productionOnlyValidUnits.length === 2, "production-only valid merge units must be explicit");
  check(manifest.productionOnlyValidUnits.every((unit) => Array.isArray(unit.files) && (unit.files as unknown[]).length > 0), "merge units must list exact files");
  check(manifest.recoveryAuthoritativeUnits.length >= 6, "Recovery-authoritative units must be explicit");
  check(manifest.conflicts.length === manifest.classificationSummary.CONFLICT, "conflict inventory must match classification count");
  check(manifest.unknowns.length === manifest.classificationSummary.UNKNOWN, "unknown inventory must match classification count");
  check(manifest.conflicts.some((item) => item.area === "provider-routing"), "provider-routing conflict must be visible");
  check(manifest.conflicts.some((item) => item.area === "digital-commerce"), "digital-commerce conflict must be visible");
  check(manifest.unknowns.some((item) => item.area === "ops-state"), "OPS unknown state must be visible");

  const terra = manifest.terraDecisionAudit;
  check(terra.status === "REVISED", "Terra semantic audit status must record the revision");
  check(terra.classificationArithmetic.reviewedRecords === 334, "Terra audit must retain the full record count");
  check(terra.classificationArithmetic.productionOnlyValidReviewed === 26, "Terra audit must review all production-only valid paths");
  check(terra.classificationArithmetic.conflictsReviewed === 12 && terra.classificationArithmetic.conflictsRemaining === 9, "Terra audit must record conflict review and reduction");
  check(terra.classificationArithmetic.unknownReviewed === 8 && terra.classificationArithmetic.unknownRemaining === 8, "Terra audit must retain every UNKNOWN state record");
  check(terra.reclassifications.length === 1 && terra.reclassifications[0].from === "CONFLICT" && terra.reclassifications[0].to === "SUPERSEDED_BY_RECOVERY" && terra.reclassifications[0].paths.length === 3, "Metal Print helper reclassification must remain bounded");
  check(!manifest.conflicts.some((item) => (item.files as unknown[]).some((file) => typeof file === "string" && file.startsWith("src/lib/metal-print-"))), "superseded Metal Print helper files must not remain conflicts");
  check(terra.collectorMethodology.status === "ACCEPT_FOR_SNAPSHOT_DIFF", "collector method must be accepted only for the fixed snapshot");
  check(terra.rcBaseDecision === "RC_BASE_READY_WITH_MERGE_UNITS", "Terra audit must retain the RC base decision");

  const migrationValues = new Set(["NONE", "REQUIRED", "POSSIBLE", "UNKNOWN"]);
  for (const [name, value] of Object.entries(manifest.migrationAssessment)) check(migrationValues.has(value), `invalid migration classification: ${name}`);
  check(manifest.migrationAssessment.database === "UNKNOWN", "database migration must remain unknown");
  check(manifest.migrationAssessment.redis === "POSSIBLE", "Redis migration risk must be recorded");
  check(manifest.migrationAssessment.environment === "UNKNOWN", "environment migration must remain unknown without env access");
  check(rcDecisions.has(manifest.rcBaseDecision), "RC base decision must be valid");
  check(manifest.rcBaseDecision === "RECOVERY_IS_RC_BASE_WITH_MERGE_UNITS", "Recovery must remain RC base with bounded units");

  check(manifest.flags.applicationChangesPerformed === false, "application changes must be false");
  check(manifest.flags.productionMutations === false, "production mutations must be false");
  check(manifest.flags.mergePerformed === false && manifest.flags.rcAssemblyPerformed === false, "merge and RC assembly must be false");
  check(manifest.flags.deployPerformed === false && manifest.flags.pushPerformed === false, "deploy and push must be false");
  check(manifest.flags.providerPaymentDataOperations === 0, "provider/payment/data operations must remain zero");
  check(manifest.flags.secretsAccessed === 0, "secret access must remain zero");
  check(Array.isArray(manifest.truthBoundary) && manifest.truthBoundary.length >= 18, "truth boundary must be complete");
  check(manifest.truthBoundary.some((line) => line.includes("exact source diff != authorization to merge")), "truth boundary must reject automatic merge authorization");
  check(manifest.nextGate.includes("RC Assembly") && manifest.nextGate.includes("not started"), "next Gate must remain unstarted");
  check(plan.includes("## Truth Boundary") && plan.includes("RC_BASE_READY_WITH_MERGE_UNITS"), "human-readable plan must be complete");
  check(plan.includes("TERRA_DECISION_AUDIT = REVISED") && plan.includes("9 remaining conflicts"), "human-readable Terra audit must be complete");
  check(recoveryPlan.includes("Exact Production vs Recovery Diff / Merge Plan"), "Recovery Plan must record the diff Gate");
  check(recoveryPlan.includes("TERRA_DECISION_AUDIT = REVISED") && recoveryPlan.includes("9 conflicts"), "Recovery Plan must record the revised semantic decision audit");
  check(recoveryPlan.includes("R7-C2") && recoveryPlan.includes("ORACLE_INACTIVE_BY_DESIGN"), "existing Recovery holds must remain");
  check(!/eyJ2Ijo|\b(?:sk_(?:live|test)|whsec_)\S+|authorization:\s*bearer\s+\S+/i.test(serialized), "manifest and plan must not contain secret values");

  console.log(JSON.stringify({
    status: "PASS",
    checksPassed: checks,
    productionDeploymentId: manifest.production.deploymentId,
    recoveryHead: manifest.recovery.head,
    totalDifferingPaths: counts.totalDifferingPaths,
    applicationFilesReviewed: manifest.applicationReview.reviewedApplicationFileCount,
    rcBaseDecision: manifest.rcBaseDecision,
    productionMutations: false,
    providerPaymentDataOperations: 0,
  }, null, 2));
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.stack || error.message : "PRODUCTION_VS_RECOVERY_DIFF_VALIDATION_FAILED");
  process.exitCode = 1;
}
