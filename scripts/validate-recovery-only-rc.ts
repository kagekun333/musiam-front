import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const baseHead = "a918b05fba988884d27efd5509e2a3eee6df1127";
const allowedChanges = new Set([
  "docs/AI/RECOVERY_ONLY_RC.md",
  "ops/recovery/recovery-only-rc-20260922.json",
  "scripts/validate-recovery-only-rc.ts",
  "docs/AI/RECOVERY_PLAN.md",
]);
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");
const json = <T>(relativePath: string): T => JSON.parse(read(relativePath)) as T;
const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
let checks = 0;

function check(condition: unknown, message: string): asserts condition {
  checks += 1;
  assert.ok(condition, message);
}

type RcRecord = {
  schemaVersion: string;
  rcId: string;
  baseHead: string;
  baseBranch: string;
  rcPath: string;
  ownerDecisions: Record<string, string>;
  applicationChanges: number;
  deployInput: { collector: string; framework: string; includedFileCount: number; totalBytes: number; ignoredEntryCount: number; manifestSha256: string; providerMutation: boolean };
  criticalInvariants: Record<string, string>;
  deferredEnhancements: Array<{ id: string; status: string }>;
  buildStatus: string;
  productionParity: string;
  assembledLocally: boolean;
  deployed: boolean;
  pushed: boolean;
  productionSourceCopied: boolean;
  productionProviderPaymentDataOperations: number;
  truthBoundary: string[];
};

function main() {
  const rc = json<RcRecord>("ops/recovery/recovery-only-rc-20260922.json");
  const record = read("docs/AI/RECOVERY_ONLY_RC.md");
  const plan = read("docs/AI/RECOVERY_PLAN.md");
  const review = read("docs/AI/RC_ASSEMBLY_REVIEW.md");
  const finalIntegration = read("docs/AI/RECOVERY_FINAL_INTEGRATION.md");
  const chat = read("src/pages/chat.tsx");
  const chatRoute = read("src/pages/api/chat-experience-v3.ts");
  const history = read("src/pages/api/chat-history.ts");
  const exhibition = read("src/pages/api/exhibition.ts");
  const oracle = read("src/app/oracle/page.tsx");
  const omikuji = read("src/app/oracle/omikuji/page.tsx");
  const statusPaths = execFileSync("git", ["status", "--porcelain=v1"], { cwd: root, encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3));

  check(git("rev-parse", "HEAD") === baseHead, "base HEAD must be exact during pre-commit RC validation");
  check(git("branch", "--show-current") === "recovery/musiam-clean-20260920", "RC branch must be exact");
  check(statusPaths.length === 4 && statusPaths.every((entry) => allowedChanges.has(entry)), "only the four allowed RC record files may be changed");
  check(rc.schemaVersion === "recovery-only-rc/v1" && rc.rcId === "MUSIAM-RECOVERY-ONLY-RC-20260922", "RC identity must be exact");
  check(rc.baseHead === baseHead && rc.baseBranch === "recovery/musiam-clean-20260920" && rc.rcPath === "RECOVERY_ONLY", "RC must freeze the named Recovery base");
  check(rc.applicationChanges === 0 && !statusPaths.some((entry) => entry.startsWith("src/") || entry.startsWith("public/works/")), "application changes must be zero");
  check(rc.ownerDecisions.OD1 === "KEEP_RECOVERY_FOR_THIS_RC" && rc.ownerDecisions.OD2 === "KEEP_DIGITAL_SHOP_DEFERRED" && rc.ownerDecisions.OD3 === "KEEP_CURRENT_LLM_ROUTER", "all owner decisions must be frozen");
  check(rc.deployInput.collector.includes("59.23.2") && rc.deployInput.framework === "nextjs" && rc.deployInput.includedFileCount === 3205 && rc.deployInput.totalBytes === 214340721 && rc.deployInput.ignoredEntryCount === 46 && rc.deployInput.manifestSha256 === "75db759db2d18348a53e56c90f0222f638ab675f88d3001875d12db7996ad260" && rc.deployInput.providerMutation === false, "deploy-input manifest must be exact and non-mutating");
  check(review.includes("KEEP_RECOVERY") && git("diff", "--quiet", baseHead, "--", "src/lib/llm-router.ts") === "", "current Recovery LLM router must be retained");
  check(rc.criticalInvariants.catalog.includes("RUNTIME_514") && finalIntegration.includes("514 unique stable work IDs") && /Title equality does not merge\s+identity/.test(finalIntegration), "catalog must remain canonical at runtime 514 without title-only identity");
  check(chat.includes('fetch("/api/chat-experience-v3"') && rc.criticalInvariants.chatRoute === "/api/chat-experience-v3", "Chat v3 route must remain active");
  check(rc.criticalInvariants.chat.includes("HISTORY_NOT_ENTITLEMENT") && !/entitlement/i.test(history), "history must remain separate from entitlement");
  check(rc.criticalInvariants.r7c2 === "BLOCKED_PRODUCT_CONTRACT / PAID_CONTINUATION_NOT_ACTIVATED" && chatRoute.includes("HARD_MAX_USER_TURNS = 20") && !/paid-continuation|entitlement/i.test(chatRoute), "R7-C2 must remain blocked and paid continuation inactive");
  check(exhibition.includes("loadExhibitionProjection") && rc.criticalInvariants.exhibition.includes("displayed=514") && rc.criticalInvariants.exhibition.includes("missingReleasedWorks=0"), "Exhibition must retain canonical 514 / missing 0 projection");
  check(oracle.includes('redirect("/")') && omikuji.includes('redirect("/")') && rc.criticalInvariants.oracle === "ORACLE_INACTIVE_BY_DESIGN", "Oracle must remain inactive by design");
  check(rc.criticalInvariants.secondarySurfaces.includes("HOME_REALM_LETTERS_BROADCAST_NOW_PLAYING_TODAYS_PICK"), "secondary Recovery surfaces must remain recorded");
  check(rc.criticalInvariants.r2 === "RECOVERED_PRESERVED_HOLD" && rc.criticalInvariants.r3 === "RECOVERED_PRESERVED_EXPERIMENT" && rc.criticalInvariants.r5.includes("SEPARATE_BUSINESS_SCOPE"), "R2, R3, and R5 boundaries must remain preserved");
  check(rc.deferredEnhancements.length === 3 && rc.deferredEnhancements.map((item) => item.id).join(",") === "E1,E2,E3" && rc.deferredEnhancements.every((item) => item.status === "POST_RC_DEFERRED"), "deferred enhancement registry must retain E1-E3");
  check(rc.productionSourceCopied === false, "production source must not be copied into Recovery");
  check(rc.productionProviderPaymentDataOperations === 0, "provider/payment/data operations must remain absent");
  check(rc.buildStatus.startsWith("BLOCKED_BY_FONT_DNS") && finalIntegration.includes("BLOCKED: `next/font`"), "build blocker truth must be carried forward");
  check(rc.productionParity.includes("PARTIAL / RC_SOURCE_PROVENANCE_INCOMPLETE") && rc.productionParity.includes("UNVERIFIED"), "production parity truth must remain bounded");
  check(rc.assembledLocally === true, "RC must be assembled locally");
  check(rc.deployed === false, "RC must not be deployed");
  check(rc.pushed === false, "RC must not be pushed");
  check(record.includes("## Truth Boundary") && rc.truthBoundary.length >= 6 && plan.includes("RECOVERY-ONLY-RC"), "human and Recovery Plan records must retain the RC truth boundary");

  console.log(JSON.stringify({
    status: "PASS",
    checksPassed: checks,
    rcId: rc.rcId,
    applicationChanges: rc.applicationChanges,
    deployInputFileCount: rc.deployInput.includedFileCount,
    deployInputManifestSha256: rc.deployInput.manifestSha256,
    deployed: rc.deployed,
    pushed: rc.pushed,
    productionProviderPaymentDataOperations: rc.productionProviderPaymentDataOperations,
  }, null, 2));
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.stack || error.message : "RECOVERY_ONLY_RC_VALIDATION_FAILED");
  process.exitCode = 1;
}
