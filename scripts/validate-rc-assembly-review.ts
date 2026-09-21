import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");
const json = <T>(p: string) => JSON.parse(read(p)) as T;
let checks = 0;
function check(ok: unknown, message: string): asserts ok {
  checks += 1;
  assert.ok(ok, message);
}
const decisions = new Set(["ADOPT_IN_RC", "ADOPT_WITH_MODIFICATION", "KEEP_RECOVERY", "DEFER_SEPARATE_PRODUCT_GATE", "REJECT_PRODUCTION_VERSION", "NEEDS_OWNER_DECISION", "NEEDS_ASTRA_REVIEW"]);
type Entry = { path: string; decision: string; reason: string };
type Plan = { schemaVersion: string; baseHead: string; status: string; assemblyReady: boolean; applicationChangesPerformed: boolean; sourceCopiedIntoRecovery: boolean; mergePerformed: boolean; deployPerformed: boolean; pushPerformed: boolean; providerPaymentDataOperations: number; secretsAccessed: number; m1: { reviewedCount: number; paths: Entry[] }; m2: { reviewedCount: number; paths: Entry[] }; conflicts: Entry[]; adoptionUnits: { id: string; files: string[]; envNames: string[]; activeRoutes: string[]; migrationRisk: string }[]; ownerDecisions: unknown[]; migrationRequirements: Record<string, string>; truthBoundary: string[] };

function main() {
  const plan = json<Plan>("ops/recovery/rc-assembly-plan-20260921.json");
  const diff = json<{ differingPaths: { path: string; classification: string }[] }>("ops/recovery/production-vs-recovery-diff-20260921.json");
  const review = read("docs/AI/RC_ASSEMBLY_REVIEW.md");
  const recovery = read("docs/AI/RECOVERY_PLAN.md");
  check(plan.schemaVersion === "rc-assembly-review/v1", "exact RC assembly schema");
  check(plan.baseHead === "86356c80c84efb7f1650465f8b1ea35c6d064e86", "exact starting base HEAD");
  check(plan.status === "READY_WITH_OWNER_DECISIONS" && plan.assemblyReady === false, "must not claim assembled RC while owner decisions remain");
  const expectedM1 = new Set(diff.differingPaths.filter(x => x.classification === "PRODUCTION_ONLY_VALID").map(x => x.path));
  const m1 = new Set(plan.m1.paths.map(x => x.path)); const m2 = new Set(plan.m2.paths.map(x => x.path));
  check(plan.m1.reviewedCount === 13 && plan.m1.paths.length === 13, "all M1 paths reviewed");
  check(plan.m2.reviewedCount === 13 && plan.m2.paths.length === 13, "all M2 paths reviewed");
  check(m1.size === 13 && m2.size === 13 && ![...m1].some(x => m2.has(x)), "M1/M2 paths are unique");
  check([...m1, ...m2].every(x => expectedM1.has(x)) && m1.size + m2.size === expectedM1.size, "all 26 production-only valid paths are classified exactly once");
  check(plan.m1.paths.every(x => x.decision === "DEFER_SEPARATE_PRODUCT_GATE"), "M1 remains a separate product gate");
  check(plan.m2.paths.every(x => x.decision === "ADOPT_WITH_MODIFICATION"), "M2 preserves modification boundary");
  check(plan.conflicts.length === 9 && new Set(plan.conflicts.map(x => x.path)).size === 9, "all 9 conflicts reviewed exactly once");
  check(plan.conflicts.every(x => decisions.has(x.decision) && x.reason.length > 0), "conflicts need classified evidence");
  for (const required of ["src/lib/catalog-counts.ts", "src/lib/llm-router.ts", "src/lib/shop-config.ts"]) check(plan.conflicts.some(x => x.path === required && x.decision === "KEEP_RECOVERY"), `Recovery must retain ${required}`);
  check(plan.conflicts.some(x => x.path === "src/app/shop/BuyButton.tsx" && x.decision === "KEEP_RECOVERY"), "unverified checkout must stay fail-closed");
  check(plan.conflicts.some(x => x.path === "src/components/AnalyticsInit.tsx" && x.decision === "ADOPT_WITH_MODIFICATION"), "analytics initializer needs integrated adoption");
  check(plan.adoptionUnits.length >= 4 && plan.adoptionUnits.every(x => x.files.length && x.envNames && x.activeRoutes && x.migrationRisk), "adoption dependency graph is explicit");
  check(plan.ownerDecisions.length >= 3, "owner decisions must be explicit");
  for (const token of ["database", "redis", "environment", "route", "catalog", "paymentMetadata"]) check(Boolean(plan.migrationRequirements[token]), `migration decision missing: ${token}`);
  check(plan.applicationChangesPerformed === false && plan.sourceCopiedIntoRecovery === false && plan.mergePerformed === false, "no application/source copy/merge allowed");
  check(plan.deployPerformed === false && plan.pushPerformed === false && plan.providerPaymentDataOperations === 0 && plan.secretsAccessed === 0, "external operations must remain zero");
  check(review.includes("READY_WITH_OWNER_DECISIONS") && review.includes("## Truth Boundary"), "human review must state bounded status and truth boundary");
  check(recovery.includes("RC-ASSEMBLY-REVIEW") && recovery.includes("READY_WITH_OWNER_DECISIONS"), "Recovery Plan must record new sub-gate");
  const serialized = `${read("ops/recovery/rc-assembly-plan-20260921.json")}\n${review}`;
  check(!/\b(?:sk_(?:live|test)|whsec_)\S+|authorization:\s*bearer\s+\S+/i.test(serialized), "review artifacts must not contain secret values");
  console.log(JSON.stringify({ status: "PASS", checksPassed: checks, m1Reviewed: plan.m1.paths.length, m2Reviewed: plan.m2.paths.length, conflictsReviewed: plan.conflicts.length, assemblyStatus: plan.status, applicationChanges: 0, externalOperations: 0 }, null, 2));
}
try { main(); } catch (error: unknown) { console.error(error instanceof Error ? error.stack || error.message : "RC_ASSEMBLY_REVIEW_VALIDATION_FAILED"); process.exitCode = 1; }
