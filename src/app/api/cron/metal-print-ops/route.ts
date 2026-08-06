import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { decideMetalPrintDailyAction, diagnoseChatInterest, summarizeMetalPrintPlacementPerformance, summarizeMetalPrintProfileIngress } from "@/lib/metal-print-daily-controller";
import { getOrSetMetalPrintSprintStartDate, saveMetalPrintOpsHealth, summarizeChatInterestFunnel, summarizeMetalPrintConsultations, summarizeMetalPrintFunnel, summarizeMetalPrintProofReviewCandidates, summarizeMetalPrintRevenue, summarizeMetalPrintVendorOrderQueue } from "@/lib/metal-print-redis.server";
import { SITE_CONFIG } from "@/lib/site-config";
import { getMetalPrintApprovedOfferCapacity } from "@/lib/metal-print-offers.server";
import accountRegistry from "../../../../../ops/audience-engine/abi-hakusyaku-account-registry.json";
import operationsPriorities from "@/lib/metal-print-operations-priorities.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

function tokyoCalendar() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const year = Number(values.year); const month = Number(values.month); const day = Number(values.day);
  return { date: `${values.year}-${values.month}-${values.day}`, month: `${values.year}-${values.month}`, day, daysInMonth: new Date(Date.UTC(year, month, 0)).getUTCDate() };
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  const dryRun = request.nextUrl.searchParams.get("dryRun") === "1";
  const calendar = tokyoCalendar();
  const [funnel, pipeline, revenue, chatInterest, proofReview, vendorOrders] = await Promise.all([
    summarizeMetalPrintFunnel(30),
    summarizeMetalPrintConsultations(),
    summarizeMetalPrintRevenue(calendar.month),
    summarizeChatInterestFunnel(30),
    summarizeMetalPrintProofReviewCandidates(),
    summarizeMetalPrintVendorOrderQueue(),
  ]);
  const hasRealTraffic = ["metal_dossier_view", "metal_chat_start", "metal_salon_open", "metal_first_message", "metal_duke", "metal_edition_selected", "metal_consultation_submitted"]
    .some((event) => Number(funnel.metrics[event]?.sessions ?? 0) > 0);
  const sprintStartDate = await getOrSetMetalPrintSprintStartDate(calendar.date, hasRealTraffic);
  const dayOfSprint = sprintStartDate ? Math.max(1, Math.floor((Date.parse(`${calendar.date}T00:00:00+09:00`) - Date.parse(`${sprintStartDate}T00:00:00+09:00`)) / 86_400_000) + 1) : 0;
  const placementPerformance = summarizeMetalPrintPlacementPerformance(funnel.byPlacement, pipeline.byPlacement);
  const profileIngress = summarizeMetalPrintProfileIngress(accountRegistry.accounts);
  const chatInterestDiagnosis = diagnoseChatInterest(chatInterest);
  const decision = decideMetalPrintDailyAction({ metrics: funnel.metrics, qualified: pipeline.qualified, dayOfSprint, sprintDays: 30, consultationNotificationFailures: pipeline.notificationFailures, hasAllocationCandidate: placementPerformance.allocationCandidate !== null, profileIngress, profileIngressDeferred: operationsPriorities.profileIngress.deferred });
  const offerCapacity = getMetalPrintApprovedOfferCapacity();
  const offerCapacityGate = {
    ...offerCapacity,
    requiredPaidUnits: 10,
    targetGrossYen: 3_000_000,
    passed: offerCapacity.approvedOfferUnits >= 10 && offerCapacity.maximumApprovedOfferGrossYen >= 3_000_000,
  };
  const baseHealth = {
    generatedAt: new Date().toISOString(), date: calendar.date, sprintStartDate, dayOfSprint, status: decision.status, action: decision.action,
    expectedQualifiedToDate: decision.expectedQualifiedToDate, qualified: pipeline.qualified, preflightRequested: pipeline.preflightRequested, preflightDemandByWork: pipeline.preflightDemandByWork, offerPreflightCandidates: pipeline.offerPreflightCandidates, pipelineCoverage: pipeline.coverageMultiple, consultationNotificationFailures: pipeline.notificationFailures,
    netNonRefundedYen: revenue.netNonRefundedYen, funnel: funnel.metrics, chatInterest, chatInterestDiagnosis, vendorOrders, proofReview, rates: decision.rates, placementPerformance, profileIngress: { ...profileIngress, deferred: operationsPriorities.profileIngress.deferred }, offerCapacityGate,
  };
  let notification: { attempted: boolean; ok: boolean; error?: string } = { attempted: false, ok: false };
  if (!dryRun) {
    const rows = Object.entries(funnel.metrics).map(([event, metric]) => `<li>${event}: ${metric.sessions}</li>`).join("");
    const alertRecipient = process.env.METAL_PRINT_OPS_ALERT_EMAIL || SITE_CONFIG.contactEmail;
    const allocation = placementPerformance.allocationCandidate;
    const placementLine = allocation
      ? `<p>増幅候補: ${allocation.campaign} / ${allocation.source} / ${allocation.content}（qualified ${allocation.qualified}/${allocation.dossier} Dossier）</p>`
      : `<p>増幅候補: なし（配置ごとに100 Dossierかつ3 qualifiedへ未到達）</p>`;
    const capacityLine = offerCapacityGate.passed
      ? `<p>販売可能Offer容量: ${offerCapacityGate.approvedOfferUnits}/${offerCapacityGate.requiredPaidUnits}点・最大¥${offerCapacityGate.maximumApprovedOfferGrossYen.toLocaleString()}</p>`
      : `<p><strong>BLOCKING:</strong> 販売可能Offer容量 ${offerCapacityGate.approvedOfferUnits}/${offerCapacityGate.requiredPaidUnits}点・最大¥${offerCapacityGate.maximumApprovedOfferGrossYen.toLocaleString()} / ¥${offerCapacityGate.targetGrossYen.toLocaleString()}</p>`;
    const profileIngressLine = profileIngress.passed
      ? `<p>プロフィール→伯爵Chat: ${profileIngress.verifiedGeneralChatLinks.length}/${profileIngress.activePlatforms.length} verified</p>`
      : `<p><strong>HUMAN GATE:</strong> プロフィール→伯爵Chat ${profileIngress.verifiedGeneralChatLinks.length}/${profileIngress.activePlatforms.length} verified。未確認: ${profileIngress.gaps.join(", ")}</p>`;
    const chatInterestLine = `<p>雑談→作品関心: ${chatInterestDiagnosis.status} — ${chatInterestDiagnosis.action}</p>`;
    const catalogDemandLine = `<p>全作品preflight需要: ${pipeline.preflightRequested}件（正式Offer承認まではqualified pipeline金額に含めない）</p>`;
    const offerExpansionLine = pipeline.offerPreflightCandidates.length > 0
      ? `<p><strong>OFFER PREFLIGHT:</strong> ${pipeline.offerPreflightCandidates.map((row) => `${escapeHtml(row.workTitle)} ${row.verifiedRequests}件`).join(" / ")}</p>`
      : `<p>Offer化候補: なし（同一作品の本人確認済み希望3件からpreflight開始）</p>`;
    const proofReviewLine = proofReview.awaitingReceiptReview > 0
      ? `<p><strong>PHYSICAL PROOF REVIEW:</strong> 顧客資金の納品済み候補 ${proofReview.awaitingReceiptReview}件。実物写真・同一工程・8項目採点を確認し、Human ACCEPTまたはREVISEを記録する。</p>`
      : `<p>Physical proof review候補: 0件（最初の顧客資金納品後に自動生成）</p>`;
    const vendorOrderLine = vendorOrders.awaitingVendorOrder > 0
      ? `<p><strong>PAID AWAITING VENDOR ORDER:</strong> ${vendorOrders.awaitingVendorOrder}件、24時間超 ${vendorOrders.staleOver24h}件、即時通知失敗 ${vendorOrders.notificationFailures}件。ロック済み発注packetと上限原価を確認して受注生産へ進める。</p>`
      : `<p>支払済み未発注queue: 0件。製造中 ${vendorOrders.productionInProgress}件、発送予定超過 ${vendorOrders.dispatchOverdue}件。</p>`;
    const result = await sendEmail({ to: alertRecipient, subject: `【Metal Print日次】${decision.status} — qualified ${pipeline.qualified}/100`, html: `<div style="font-family:sans-serif"><h2>${decision.status}</h2><p>${decision.action}</p>${capacityLine}${profileIngressLine}${chatInterestLine}${catalogDemandLine}${offerExpansionLine}${vendorOrderLine}${proofReviewLine}<p>Qualified: ${pipeline.qualified}/100（本日基準 ${decision.expectedQualifiedToDate}）</p><p>Pipeline: ${pipeline.coverageMultiple.toFixed(2)}x / Net revenue: ¥${revenue.netNonRefundedYen.toLocaleString()}</p>${placementLine}<ul>${rows}</ul><small>匿名集計のみ。会話本文・メール・IPは含みません。</small></div>` });
    notification = { attempted: true, ok: result.ok, ...(result.error ? { error: result.error.slice(0, 240) } : {}) };
    await saveMetalPrintOpsHealth(calendar.date, { ...baseHealth, notification });
  }
  return NextResponse.json({ ok: true, dryRun, ...baseHealth, notification });
}
