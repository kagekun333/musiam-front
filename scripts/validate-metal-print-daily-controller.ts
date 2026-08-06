import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decideMetalPrintDailyAction, diagnoseChatInterest, summarizeMetalPrintPlacementPerformance, summarizeMetalPrintProfileIngress } from "../src/lib/metal-print-daily-controller";

const metric = (values: Record<string, number>) => Object.fromEntries(Object.entries(values).map(([event, sessions]) => [event, { sessions }]));
assert.equal(decideMetalPrintDailyAction({ metrics: {}, qualified: 0, dayOfSprint: 0, sprintDays: 30 }).expectedQualifiedToDate, 0);
assert.equal(decideMetalPrintDailyAction({ metrics: {}, qualified: 0, dayOfSprint: 0, sprintDays: 30 }).status, "NO_TRAFFIC");
assert.equal(decideMetalPrintDailyAction({ metrics: metric({ metal_home_view: 100 }), qualified: 0, dayOfSprint: 0, sprintDays: 30 }).status, "OWNED_TRAFFIC_LEARNING");
assert.equal(decideMetalPrintDailyAction({ metrics: metric({ metal_home_view: 1000, metal_home_cta_click: 9 }), qualified: 0, dayOfSprint: 0, sprintDays: 30 }).status, "FIX_HOME_CTA");
assert.equal(decideMetalPrintDailyAction({ metrics: metric({ metal_home_view: 999, metal_home_cta_click: 0 }), qualified: 0, dayOfSprint: 0, sprintDays: 30 }).status, "OWNED_TRAFFIC_LEARNING", "CTA must not change before the sample floor");
assert.equal(decideMetalPrintDailyAction({ metrics: metric({ metal_dossier_view: 2000, metal_chat_start: 100 }), qualified: 0, dayOfSprint: 10, sprintDays: 30 }).status, "FIX_LANDING");
assert.equal(decideMetalPrintDailyAction({ metrics: metric({ metal_dossier_view: 2000, metal_chat_start: 400, metal_salon_open: 500, metal_first_message: 100 }), qualified: 0, dayOfSprint: 10, sprintDays: 30 }).status, "FIX_STARTER");
assert.equal(decideMetalPrintDailyAction({ metrics: metric({ metal_dossier_view: 2000, metal_chat_start: 400, metal_salon_open: 500, metal_first_message: 250, metal_duke: 20 }), qualified: 0, dayOfSprint: 10, sprintDays: 30 }).status, "FIX_SELECTION");
assert.equal(decideMetalPrintDailyAction({ metrics: metric({ metal_dossier_view: 2000, metal_chat_start: 400, metal_salon_open: 500, metal_first_message: 250, metal_duke: 100, metal_edition_selected: 100, metal_consultation_submitted: 5 }), qualified: 0, dayOfSprint: 10, sprintDays: 30 }).status, "FIX_CONSULTATION");
assert.equal(decideMetalPrintDailyAction({ metrics: metric({ metal_dossier_view: 1 }), qualified: 1, dayOfSprint: 1, sprintDays: 30, consultationNotificationFailures: 1 }).status, "FIX_ALERTING");
const incompleteProfileIngress = summarizeMetalPrintProfileIngress([
  { platform: "threads", profileSetup: { website: "APPLIED_PUBLIC_NON_CHAT_TARGET" } },
]);
assert.equal(incompleteProfileIngress.verifiedGeneralChatLinks.length, 0);
assert.deepEqual(incompleteProfileIngress.gaps, ["instagram", "threads", "tiktok", "youtube"]);
assert.equal(decideMetalPrintDailyAction({ metrics: metric({ metal_dossier_view: 4 }), qualified: 0, dayOfSprint: 2, sprintDays: 30, profileIngress: incompleteProfileIngress }).status, "FIX_PROFILE_INGRESS");
assert.equal(decideMetalPrintDailyAction({ metrics: metric({ metal_dossier_view: 4 }), qualified: 0, dayOfSprint: 2, sprintDays: 30, profileIngress: incompleteProfileIngress, profileIngressDeferred: true }).status, "BEHIND_QUALIFIED_PACE", "deferred profile work must not block acquisition learning");
const completeProfileIngress = summarizeMetalPrintProfileIngress(["instagram", "threads", "tiktok", "youtube"].map((platform) => ({ platform, profileSetup: { website: "APPLIED_AND_PUBLICLY_VISIBLE" } })));
assert.equal(completeProfileIngress.passed, true);
assert.notEqual(decideMetalPrintDailyAction({ metrics: metric({ metal_dossier_view: 4 }), qualified: 0, dayOfSprint: 2, sprintDays: 30, profileIngress: completeProfileIngress }).status, "FIX_PROFILE_INGRESS");
assert.equal(decideMetalPrintDailyAction({ metrics: metric({ metal_dossier_view: 10 }), qualified: 34, dayOfSprint: 10, sprintDays: 30 }).status, "ON_PACE");
const behindWithoutWinner = decideMetalPrintDailyAction({ metrics: metric({ metal_dossier_view: 10 }), qualified: 0, dayOfSprint: 10, sprintDays: 30, hasAllocationCandidate: false });
assert.equal(behindWithoutWinner.status, "BEHIND_QUALIFIED_PACE");
assert.ok(behindWithoutWinner.action.includes("集中配信しない"), "small samples must not trigger campaign concentration");
const behindWithWinner = decideMetalPrintDailyAction({ metrics: metric({ metal_dossier_view: 200 }), qualified: 3, dayOfSprint: 10, sprintDays: 30, hasAllocationCandidate: true });
assert.ok(behindWithWinner.action.includes("最良campaignへ配信を集中"), "proven allocation candidate should be concentrated");
const placementKey = JSON.stringify(["metal_print_inbound_en", "instagram", "IGNITION-EN-01"]);
const placementSummary = summarizeMetalPrintPlacementPerformance({
  [placementKey]: { campaign: "metal_print_inbound_en", locale: "en", source: "instagram", content: "IGNITION-EN-01", metrics: { metal_dossier_view: 120, metal_chat_start: 20, metal_edition_selected: 8, metal_consultation_submitted: 5 } },
}, { [placementKey]: { qualified: 3, nurture: 2, pipelineValueJpy: 990_000 } });
assert.equal(placementSummary.allocationCandidate?.content, "IGNITION-EN-01");
assert.equal(placementSummary.allocationCandidate?.qualifiedPerDossier, 0.025);
const insufficientSummary = summarizeMetalPrintPlacementPerformance({
  [placementKey]: { campaign: "metal_print_inbound_en", locale: "en", source: "instagram", content: "IGNITION-EN-01", metrics: { metal_dossier_view: 99, metal_consultation_submitted: 3 } },
}, { [placementKey]: { qualified: 3, nurture: 0, pipelineValueJpy: 990_000 } });
assert.equal(insufficientSummary.allocationCandidate, null, "small samples must not be promoted as winners");
const stopSummary = summarizeMetalPrintPlacementPerformance({
  [placementKey]: { campaign: "metal_print_inbound_en", locale: "en", source: "instagram", content: "IGNITION-EN-01", metrics: { metal_dossier_view: 500, metal_chat_start: 0 } },
}, {});
assert.equal(stopSummary.stopCandidates[0]?.reason, "NO_CHAT_AFTER_500_DOSSIERS");
assert.equal(diagnoseChatInterest({}).status, "NO_SAMPLE");
assert.equal(diagnoseChatInterest({ metrics: metric({ chat_interest_bridge_show: 49, chat_interest_bridge_accept: 0 }) }).status, "LEARNING", "small samples must not rewrite the bridge");
assert.equal(diagnoseChatInterest({ metrics: metric({ chat_interest_bridge_show: 50, chat_interest_bridge_accept: 4 }) }).status, "REVISE_PERMISSION_BRIDGE");
assert.equal(diagnoseChatInterest({
  metrics: metric({ chat_interest_bridge_show: 80, chat_interest_bridge_accept: 20 }),
  byTheme: { focus: { chat_interest_bridge_show: 20, chat_interest_bridge_accept: 6 }, rest: { chat_interest_bridge_show: 20, chat_interest_bridge_accept: 1 } },
}).status, "SCALE_PROVEN_THEMES");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const measurementPolicy = JSON.parse(fs.readFileSync(path.join(root, "src/lib/metal-print-measurement-policy.json"), "utf8"));
assert.equal(measurementPolicy.allocation.dossierSessionsPerPlacementMin, 100);
assert.equal(measurementPolicy.allocation.qualifiedPerPlacementMin, 3);
assert.equal(measurementPolicy.conversionDiagnosis.dossierSessionsMin, 2000);
const route = fs.readFileSync(path.join(root, "src/app/api/cron/metal-print-ops/route.ts"), "utf8");
assert.ok(route.includes('authorization") !== `Bearer ${secret}`'));
assert.ok(route.includes("summarizeMetalPrintFunnel"));
assert.ok(route.includes("summarizeMetalPrintConsultations"));
assert.ok(route.includes("summarizeMetalPrintRevenue"));
assert.ok(route.includes("saveMetalPrintOpsHealth"));
assert.ok(route.includes("dryRun"));
assert.ok(route.includes("getOrSetMetalPrintSprintStartDate"));
assert.ok(route.includes('["metal_dossier_view", "metal_chat_start", "metal_salon_open"'), "passive home views must not start the qualified-acquisition sprint");
assert.ok(route.includes("notification = { attempted: true"), "notification delivery result is not persisted");
assert.ok(route.includes("METAL_PRINT_OPS_ALERT_EMAIL"), "dedicated operations alert recipient missing");
assert.ok(route.includes("consultationNotificationFailures"), "consultation alert failures are absent from daily health");
assert.ok(route.includes("summarizeMetalPrintPlacementPerformance"), "placement performance is not connected to daily operations");
assert.ok(route.includes("placementPerformance"), "placement recommendation is not persisted in daily health");
assert.ok(route.includes("getMetalPrintApprovedOfferCapacity"), "approved Offer capacity is absent from daily operations");
assert.ok(route.includes("offerCapacityGate"), "Offer capacity gate is not persisted in daily health");
assert.ok(route.includes("summarizeMetalPrintProfileIngress"), "external profile-link coverage is absent from daily operations");
assert.ok(route.includes("profileIngress"), "profile ingress gate is not persisted in daily health");
assert.ok(route.includes("operationsPriorities.profileIngress.deferred"), "owner-deferred profile priority is not connected to daily decisions");
assert.ok(route.includes("diagnoseChatInterest"), "chat-interest measurement is not converted into a daily diagnosis");
assert.ok(route.includes("chatInterestDiagnosis"), "chat-interest diagnosis is not persisted in daily health");
assert.ok(route.includes("preflightRequested: pipeline.preflightRequested"), "catalog preflight demand is not persisted in daily health");
assert.ok(route.includes("preflightDemandByWork: pipeline.preflightDemandByWork"), "work-level catalog demand is not persisted in daily health");
assert.ok(route.includes("offerPreflightCandidates: pipeline.offerPreflightCandidates"), "Offer preflight candidates are not persisted in daily health");
assert.ok(route.includes("本人確認済み希望3件からpreflight開始"), "Offer expansion has no conservative promotion floor");
assert.ok(route.includes("summarizeMetalPrintProofReviewCandidates"), "fulfilled customer-funded units are not connected to proof review operations");
assert.ok(route.includes("proofReview"), "proof review candidates are not persisted in daily health");
assert.ok(route.includes("Human ACCEPTまたはREVISE"), "daily proof action bypasses explicit Human review");
assert.ok(route.includes("summarizeMetalPrintVendorOrderQueue"), "paid-unfulfilled vendor queue is not connected to daily operations");
assert.ok(route.includes("PAID AWAITING VENDOR ORDER"), "daily operations do not escalate paid orders awaiting production");
assert.ok(route.includes("24時間超"), "stalled paid vendor orders are not visible in the daily alert");
assert.ok(route.includes("発送予定超過"), "overdue production orders are not visible in the daily alert");
assert.ok(route.includes("即時通知失敗"), "failed immediate vendor-order notifications are not visible in the daily alert");
assert.ok(route.includes("正式Offer承認まではqualified pipeline金額に含めない"), "catalog demand notification lacks the pipeline evidence boundary");
assert.ok(route.includes("HUMAN GATE:"), "profile ingress Human Gate is absent from the daily notification");
assert.ok(route.includes("BLOCKING:"), "insufficient sellable capacity is not visible in daily notification");
assert.ok(route.includes("配置ごとに100 Dossierかつ3 qualified"), "small-sample allocation guard is absent from the notification");
assert.ok(route.indexOf("await sendEmail") < route.indexOf("await saveMetalPrintOpsHealth"), "health must be stored after email result is known");
console.log("metal-print daily controller: PASS — funnel diagnosis, qualified pace, conservative placement allocation, revenue/pipeline summary, bearer gate, dry-run");
