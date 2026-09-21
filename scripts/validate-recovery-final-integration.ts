import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { loadMergedWorksServer } from "../src/lib/loadMergedWorksServer";
import { mergeWorksCatalog } from "../src/lib/mergeWorksCatalog";
import { projectExhibitionWorks } from "../src/lib/exhibition-projection";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");
const readJson = <T>(relativePath: string): T => JSON.parse(read(relativePath)) as T;
const sha256 = (relativePath: string) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex");
let checks = 0;

function check(condition: unknown, message: string): asserts condition {
  checks += 1;
  assert.ok(condition, message);
}

async function main() {
  const plan = read("docs/AI/RECOVERY_PLAN.md");
  const final = read("docs/AI/RECOVERY_FINAL_INTEGRATION.md");
  const r6 = read("docs/AI/R6_OPERATIONAL_TRUTH.md");
  const r3 = read("docs/AI/R3_PHASE6_RECOVERY.md");
  const r2 = read("docs/AI/R2_PHASE5_R8_RECOVERY.md");
  const r4 = read("docs/AI/R4_MUSIC_EVIDENCE_RECOVERY.md");
  const history = read("docs/AI/HISTORY_DELTA_AUDIT.md");
  const chat = read("src/pages/chat.tsx");
  const chatRoute = read("src/pages/api/chat-experience-v3.ts");
  const historyRoute = read("src/pages/api/chat-history.ts");
  const exhibitionRoute = read("src/pages/api/exhibition.ts");
  const exhibitionProjection = read("src/lib/exhibition-projection.ts");
  const todayPick = read("src/app/api/todays-pick/route.ts");
  const nowPlaying = read("src/app/api/now-playing/route.ts");
  const home = read("src/app/page.tsx");
  const broadcast = read("src/components/broadcast/BroadcastBar.tsx");
  const oracle = read("src/app/oracle/page.tsx");
  const omikuji = read("src/app/oracle/omikuji/page.tsx");
  const tsconfig = readJson<{ exclude?: string[] }>("tsconfig.json");
  const manifest = readJson<{ primaryMaster: { path: string; sha256: string } }>("public/works/catalog-foundation.manifest.json");
  const claims = readJson<{ fullTrackVerifiedCount?: number }>("ops/simulation-refinement/phase5-generalization-20260913/music/batch-r3/claims-matrix.json");
  const r3Manifest = readJson<{ laneC?: { appliedToRoot?: boolean; status?: string } }>("ops/simulation-refinement/phase6-three-lanes-20260913/recovery-manifest.json");

  for (const routePath of [
    "src/app/page.tsx", "src/pages/exhibition.tsx", "src/pages/chat.tsx", "src/app/works/[id]/page.tsx",
    "src/app/letters/page.tsx", "src/app/classic/page.tsx", "src/pages/api/chat-experience-v3.ts",
    "src/pages/api/chat-history.ts", "src/pages/api/exhibition.ts", "src/app/api/todays-pick/route.ts",
    "src/app/api/now-playing/route.ts",
  ]) check(fs.existsSync(path.join(root, routePath)), `local route source must exist: ${routePath}`);
  check(fs.existsSync(path.join(root, "src/lib/loadMergedWorksServer.ts")), "canonical server loader must exist");
  check(sha256(manifest.primaryMaster.path) === manifest.primaryMaster.sha256, "primary works master must match its recovery manifest hash");
  const titleOnly = mergeWorksCatalog(
    [{ id: "primary", title: "same", type: "music" }],
    [{ id: "secondary", title: "same", type: "music" }],
  );
  check(titleOnly.length === 2, "title-only catalog equality must not merge identity");

  const canonical = await loadMergedWorksServer();
  const ids = canonical.map((work) => String(work.id ?? "").trim());
  check(canonical.length === 514, "recovered local canonical runtime count must remain 514");
  check(ids.every(Boolean) && new Set(ids).size === ids.length, "canonical runtime IDs must be present and unique");
  const exhibition = projectExhibitionWorks(canonical, undefined, "2026-09-21");
  check(exhibition.coverage.missingFromExhibitionReleasedWorks === 0, "all explicitly released canonical works must reach the exhibition projection");
  check(exhibition.coverage.displayedWorks === 514, "exhibition projection must display 514 released works");
  check(exhibitionRoute.includes("loadExhibitionProjection") && exhibitionProjection.includes("loadMergedWorksServer"), "Exhibition API must use the canonical server projection");

  check(chat.includes('fetch("/api/chat-experience-v3"'), "Chat UI must keep the active v3 route");
  check(chatRoute.includes("HARD_MAX_USER_TURNS = 20"), "active chat guard must remain the 20-turn abuse/cost limit");
  check(!/count-access|paid-continuation|entitlement/i.test(chatRoute), "active chat route must not activate paid continuation");
  check(!/entitlement/i.test(historyRoute), "history endpoint must remain separate from entitlement");
  check(!fs.existsSync(path.join(root, "src/pages/api/chat-analysis.ts")), "preservation-only chat-analysis must not be adopted into current clean");

  check(oracle.includes('redirect("/")') && omikuji.includes('redirect("/")'), "Oracle and Omikuji must remain inactive redirects");
  check(todayPick.includes("loadMergedWorksServer") && nowPlaying.includes("loadMergedWorksServer") && home.includes("loadMergedWorksServer"), "TodaysPick, Now Playing, and Home must retain canonical server projection wiring");
  check(broadcast.includes("playback_update") && !broadcast.includes(".play("), "Broadcast must distinguish actual playback and avoid autoplay");

  check(claims.fullTrackVerifiedCount === 0 && r4.includes("full-track verified countは推測してはならず、ここでは0"), "R4 must retain zero full-track verified records and its semantic boundary");
  check(r2.includes("HOLD remains HOLD"), "R2 preservation HOLD must remain in force");
  check(r3Manifest.laneC?.status === "PRESERVED_CANDIDATE" && r3Manifest.laneC?.appliedToRoot === false && r3.includes("not applied to the root runtime"), "R3 Lane C must remain a non-active preserved candidate");
  check(tsconfig.exclude?.includes("ops/simulation-refinement/phase6-three-lanes-20260913/lane-c/c1-initial-draft/**/*"), "only the preserved R3 candidate directory must be excluded from root typecheck");
  check(r6.includes("`PRODUCTION_PARITY = UNVERIFIED`"), "R6 truth record must retain unverified production parity");
  check(history.includes("PRESENT_IN_PRESERVATION_ONLY"), "History Delta must retain preservation-only chat-analysis classification");

  for (const state of [
    "VERIFIED_PRESERVATION", "VERIFIED_HISTORY_COPY", "RECOVERED_PRESERVED_HOLD", "RECOVERED_PRESERVED_EXPERIMENT",
    "RECOVERED_EVIDENCE_BOUNDARY", "SEPARATE_BUSINESS_SCOPE", "BLOCKED_PRODUCT_CONTRACT", "PAID_CONTINUATION_NOT_ACTIVATED",
    "AUDITED_HANDOFF_CONSUMED",
  ]) check(plan.includes(state), `Recovery Plan must record ${state}`);
  check(final.includes("RECOVERY_FINAL_INTEGRATION = LOCAL_RECOVERY_INTEGRATED"), "final record must declare only local recovery integration");
  check(!/RECOVERY_FINAL_INTEGRATION\s*=\s*(DEPLOYED|PRODUCTION_READY)/.test(final), "final record must not add a deploy or production-ready marker");
  check(final.includes("PRODUCTION_PARITY = UNVERIFIED"), "final record must retain production parity boundary");

  console.log(JSON.stringify({
    status: "PASS",
    checksPassed: checks,
    canonicalRuntimeWorks: canonical.length,
    exhibitionDisplayedWorks: exhibition.coverage.displayedWorks,
    exhibitionMissingReleasedWorks: exhibition.coverage.missingFromExhibitionReleasedWorks,
    activeChatRoute: "/api/chat-experience-v3",
    paidContinuation: "BLOCKED_PRODUCT_CONTRACT / PAID_CONTINUATION_NOT_ACTIVATED",
    oracle: "ORACLE_INACTIVE_BY_DESIGN",
    r2: "RECOVERED_PRESERVED_HOLD",
    r3: "RECOVERED_PRESERVED_EXPERIMENT",
    productionParity: "UNVERIFIED",
    networkRequests: 0,
    productionOperations: 0,
  }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack || error.message : "RECOVERY_FINAL_INTEGRATION_VALIDATION_FAILED");
  process.exitCode = 1;
});
