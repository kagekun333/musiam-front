import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const assurance = readJson("ops/metal-print-vip/assurance.json");
const pipeline = readJson("ops/metal-print-vip/pipeline-evidence-snapshot.json");
const revenue = readJson("ops/metal-print-vip/revenue-evidence-snapshot.json");
const proof = readJson("ops/metal-print-vip/proof-evidence-ledger.json");
const wave = readJson("ops/audience-engine/abi-hakusyaku-launch-wave-01-native.json");
const mission = readJson("ops/metal-print-vip/mission.json");
const selloutGoal = readJson("ops/metal-print-vip/all-works-sellout-goal.json");
const canonicalWorksRaw = readJson(selloutGoal.catalogSource);
const canonicalWorks = Array.isArray(canonicalWorksRaw) ? canonicalWorksRaw : canonicalWorksRaw.items ?? canonicalWorksRaw.works ?? [];
const offerApproval = readJson("ops/metal-print-vip/made-to-order-sales-approval-2026-07-24.json");
const economicsActuals = readJson("ops/metal-print-vip/economics-actuals-evidence.json");
const funnel = readJson("ops/metal-print-vip/first-party-funnel-snapshot.json");
const profileChatActivation = readJson("ops/metal-print-vip/production-profile-chat-activation-evidence-2026-07-26.json");
const accountRegistry = readJson("ops/audience-engine/abi-hakusyaku-account-registry.json");
const profilePacket = readJson("ops/audience-engine/abi-hakusyaku-profile-packet.json");
const measurementPolicy = readJson("src/lib/metal-print-measurement-policy.json");
const offerCapacityReadiness = readJson("ops/metal-print-vip/offer-capacity-expansion-readiness-2026-07-26.json");
const maturityQueue = readJson("ops/audience-engine/abi-hakusyaku-launch-wave-01-maturity-queue.json");
const publicationSchedule = readJson("ops/audience-engine/abi-hakusyaku-launch-wave-01-schedule.json");
const dailyMusicReadinessPath = "ops/audience-engine/daily-music-release-readiness-2026-08-03.json";
const dailyMusicReadiness = fs.existsSync(path.join(root, dailyMusicReadinessPath))
  ? readJson(dailyMusicReadinessPath)
  : null;
const dailyMusicManifestPath = "ops/audience-engine/daily-music-release-candidates/DMW-20260805-7D--manifest.json";
const dailyMusicManifest = fs.existsSync(path.join(root, dailyMusicManifestPath))
  ? readJson(dailyMusicManifestPath)
  : null;
const ledgerPath = path.join(root, "ops/audience-engine/abi-hakusyaku-launch-wave-01-ledger.csv");
const outputPath = path.join(root, "ops/metal-print-vip/goal-controller-state.json");

const parseCsvLine = (line) => line.slice(1, -1).split('\",\"');
const ledgerRows = fs.readFileSync(ledgerPath, "utf8").trim().split("\n").slice(1).map((line) => {
  const values = parseCsvLine(line);
  return {
    placementId: values[0],
    postId: values[1],
    platform: values[2],
    status: values[3],
    publishedAt: values[5],
    publicUrl: values[6],
  };
});
const pipelineAvailable = pipeline.evidenceClass !== "EVIDENCE_UNAVAILABLE" && Number.isFinite(pipeline.qualified);
const revenueAvailable = revenue.evidenceClass !== "EVIDENCE_UNAVAILABLE" && Number.isFinite(revenue.netNonRefundedYen);
const qualified = pipelineAvailable ? pipeline.qualified : 0;
const consultationTotal = pipelineAvailable ? pipeline.total : 0;
const pipelineValueJpy = pipelineAvailable ? pipeline.pipelineValueJpy : 0;
const dossierAccepted = pipelineAvailable ? Number(pipeline.dossierAccepted ?? 0) : 0;
const purchaseIntent = pipelineAvailable ? Number(pipeline.purchaseIntent ?? 0) : 0;
const unverifiedConsultations = pipelineAvailable ? Number(pipeline.unverified ?? 0) : 0;
const contactVerificationFailures = pipelineAvailable ? Number(pipeline.contactVerificationFailures ?? 0) : 0;
const netNonRefundedYen = revenueAvailable ? revenue.netNonRefundedYen : 0;
const approvedOfferUnits = offerApproval.approvedEditionIds.length * offerApproval.offer.editionSize;
const maximumApprovedOfferGrossYen = approvedOfferUnits * offerApproval.offer.amountJpy;
const canonicalWorkCount = canonicalWorks.length;
const terminalEditionUnits = canonicalWorkCount * selloutGoal.offer.editionSizePerWork;
const terminalGrossYen = terminalEditionUnits * selloutGoal.offer.unitPriceYen;
const approvedCatalogCoverage = canonicalWorkCount > 0 ? offerApproval.approvedEditionIds.length / canonicalWorkCount : 0;
const dossierSessions = Number(funnel.metrics?.metal_dossier_view?.sessions ?? 0);
const minimumDossierSample = measurementPolicy.allocation.dossierSessionsPerPlacementMin;
const landingDiagnosisSample = measurementPolicy.conversionDiagnosis.dossierSessionsMin;
const profileChatActivationVerified = profileChatActivation.result === "PASS"
  && profileChatActivation.deployment?.readyState === "READY"
  && profileChatActivation.assetAssertions?.conversationActivationMarkerPresent === true;
const activeAudiencePlatforms = ["instagram", "threads", "tiktok", "youtube"];
const directProfileLinksVerified = activeAudiencePlatforms.filter((platform) => {
  const account = accountRegistry.accounts.find((item) => item.platform === platform);
  return account?.profileSetup?.website === "APPLIED_AND_PUBLICLY_VISIBLE";
});
const profileLinkGaps = activeAudiencePlatforms.filter((platform) => !directProfileLinksVerified.includes(platform));
const profileLinkCoverageComplete = profileLinkGaps.length === 0;
const placementProgress = Object.entries(funnel.byPlacement ?? {}).map(([key, placement]) => ({
  key,
  dossier: Number(placement.metrics?.metal_dossier_view ?? 0),
  qualified: Number(pipeline.byPlacement?.[key]?.qualified ?? 0),
}));
const bestPlacementDossier = Math.max(0, ...placementProgress.map((item) => item.dossier));
const bestPlacementQualified = Math.max(0, ...placementProgress.map((item) => item.qualified));
const allocationCandidateVerified = placementProgress.some((item) => item.dossier >= minimumDossierSample && item.qualified >= measurementPolicy.allocation.qualifiedPerPlacementMin);
const approvedPhysicalProofs = proof.proofs.filter((entry) => entry.approved === true).length;

const now = new Date();
const nowJst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
const launchDateJst = Date.UTC(2026, 6, 25);
const todayJst = Date.UTC(nowJst.getUTCFullYear(), nowJst.getUTCMonth(), nowJst.getUTCDate());
const waveDay = Math.max(1, Math.min(7, Math.floor((todayJst - launchDateJst) / 86_400_000) + 1));
const scheduleByPostId = new Map(publicationSchedule.schedule.map((item) => [item.postId, item]));
const duePostIds = new Set(publicationSchedule.schedule.filter((item) => Date.parse(item.scheduledAt) <= now.getTime()).map((item) => item.postId));
const approvedWaiting = ledgerRows.filter((row) => row.status === "APPROVED_WAITING_SCHEDULE");
const dueUnpublished = approvedWaiting.filter((row) => duePostIds.has(row.postId));
const futureApprovedSchedule = approvedWaiting
  .map((row) => ({ row, schedule: scheduleByPostId.get(row.postId) }))
  .filter((item) => item.schedule && Date.parse(item.schedule.scheduledAt) > now.getTime())
  .sort((a, b) => Date.parse(a.schedule.scheduledAt) - Date.parse(b.schedule.scheduledAt));
const nextPublicationAt = futureApprovedSchedule[0]?.schedule.scheduledAt ?? null;
const published = ledgerRows.filter((row) => row.status === "PUBLISHED");
const launchWaveComplete = published.length === ledgerRows.length;
const dailyReleaseBuilderReady = fs.existsSync(path.join(root, "scripts/build-daily-music-release-pack.mjs"))
  && fs.existsSync(path.join(root, "scripts/validate-daily-music-release-pack.mjs"));
const reviewPending = ledgerRows.filter((row) => row.status === "REVIEW_PENDING");
const due24hCount = Number(maturityQueue.summary?.due24h ?? 0);
const due72hCount = Number(maturityQueue.summary?.due72h ?? 0);
const resolved24hCount = Number(maturityQueue.summary?.resolved24h ?? 0);
const resolved72hCount = Number(maturityQueue.summary?.resolved72h ?? 0);
const maturityActionDue = due24hCount > 0 || due72hCount > 0;

const lanes = [
  {
    id: "distribution",
    status: published.length === ledgerRows.length ? "COMPLETE" : reviewPending.length > 0 ? "ACTION_DUE" : dueUnpublished.length > 0 ? "ACTION_DUE" : "SCHEDULED",
    evidence: `${published.length}/${ledgerRows.length} placements published; ${approvedWaiting.length} approved waiting schedule; ${reviewPending.length} review pending; next scheduled publication ${nextPublicationAt ?? "none"}`,
    nextAction: reviewPending.length > 0
      ? `Repair and mechanically validate REVIEW_PENDING canonical media before publication: ${reviewPending.map((row) => row.placementId).join(", ")}. Preserve the existing approval tokens but do not publish or return a row to schedule until validate:abi-launch-wave-media-preflight passes.`
      : dueUnpublished.length > 0
      ? `Publish only due approved placements: ${dueUnpublished.map((row) => row.placementId).join(", ")}`
      : `Preserve spacing; do not publish before ${nextPublicationAt ?? "the next approved schedule"}.`,
    humanGate: false,
  },
  {
    id: "measurement",
    status: maturityActionDue ? "ACTION_DUE" : "WAITING_FOR_MATURITY",
    evidence: `${due24hCount} due at 24h; ${due72hCount} due at 72h; ${resolved24hCount} resolved at 24h; ${resolved72hCount} resolved at 72h; next maturity ${maturityQueue.summary?.nextMaturityAt ?? "none"}`,
    nextAction: "Capture only matured 24h/72h audience metrics and first-party Chat events; never write premature zeroes.",
    humanGate: false,
  },
  {
    id: "chat_conversion",
    status: !pipelineAvailable
      ? "EVIDENCE_UNAVAILABLE"
      : contactVerificationFailures > 0
        ? "ACTION_DUE"
        : unverifiedConsultations > 0 && consultationTotal === 0
          ? "WAITING_FOR_CONTACT_VERIFICATION"
      : consultationTotal > 0
        ? "LEARNING"
        : profileChatActivationVerified && !allocationCandidateVerified
          ? profileLinkCoverageComplete ? "ACQUIRING_MINIMUM_SAMPLE" : "ACQUIRING_MINIMUM_SAMPLE_WITH_PROFILE_GAP"
          : "NO_REAL_CONSULTATION",
    evidence: pipelineAvailable
      ? `${consultationTotal} verified durable consultations; ${qualified} qualified; ${unverifiedConsultations} awaiting contact verification; ${contactVerificationFailures} verification delivery failures; site conversation activation ${profileChatActivationVerified ? "verified" : "unverified"}; direct social profile links ${directProfileLinksVerified.length}/${activeAudiencePlatforms.length} verified (${directProfileLinksVerified.join(", ") || "none"}); ${dossierSessions}/${minimumDossierSample} Dossier sessions before conversion diagnosis`
      : `Production consultation evidence unavailable: ${pipeline.reason}`,
    nextAction: contactVerificationFailures > 0
      ? "Inspect consented contact-verification delivery failures and restore transactional email delivery; never promote the affected submissions manually."
      : profileChatActivationVerified && !allocationCandidateVerified
      ? launchWaveComplete
        ? `Ingest the next real canonical music release with build:daily-music-release-pack, preserve its workId and exact platform UTM, and move only Human-approved placements to publication. Continue until a placement reaches ${minimumDossierSample} Dossier sessions and ${measurementPolicy.allocation.qualifiedPerPlacementMin} qualified consultations (current best ${bestPlacementDossier}/${minimumDossierSample} Dossier, ${bestPlacementQualified}/${measurementPolicy.allocation.qualifiedPerPlacementMin} qualified). Direct profile-link gaps remain on ${profileLinkGaps.join(", ")} and require the exact profile-update Human Gate; keep profile ingress deferred. Do not change Landing conversion before the ${landingDiagnosisSample}-Dossier diagnosis floor.`
        : `Continue the approved spaced Launch Wave until a placement reaches ${minimumDossierSample} Dossier sessions and ${measurementPolicy.allocation.qualifiedPerPlacementMin} qualified consultations (current best ${bestPlacementDossier}/${minimumDossierSample} Dossier, ${bestPlacementQualified}/${measurementPolicy.allocation.qualifiedPerPlacementMin} qualified); preserve source UTM. Direct profile-link gaps remain on ${profileLinkGaps.join(", ")} and require the exact profile-update Human Gate. Do not change Landing conversion before the ${landingDiagnosisSample}-Dossier diagnosis floor.`
      : "Verify profile-to-Chat links and production funnel telemetry, then optimize the first proven drop-off only after minimum sample thresholds.",
    humanGate: false,
  },
  {
    id: "sellable_capacity",
    status: offerApproval.approvedEditionIds.length >= canonicalWorkCount
      ? "PASS"
      : approvedOfferUnits >= mission.objective.monthlyPaidUnitMin && maximumApprovedOfferGrossYen >= mission.objective.monthlyGrossPaidMinYen
        ? "MONTHLY_QUOTA_READY_CATALOG_EXPANSION_REQUIRED"
      : offerCapacityReadiness.status === "HUMAN_APPROVAL_REQUIRED"
        ? "HUMAN_APPROVAL_REQUIRED"
        : offerCapacityReadiness.status === "MASTER_GENERATION_REQUIRED"
          ? "MASTER_GENERATION_REQUIRED"
          : "SOURCE_MOUNT_REQUIRED",
    evidence: `${offerApproval.approvedEditionIds.length}/${canonicalWorkCount} canonical works have approved Offers (${(approvedCatalogCoverage * 100).toFixed(2)}%); ${approvedOfferUnits}/${mission.objective.monthlyPaidUnitMin} units cover the recurring monthly quota; approved gross ¥${maximumApprovedOfferGrossYen.toLocaleString("en-US")}; terminal scope ${terminalEditionUnits.toLocaleString("en-US")} units / ¥${terminalGrossYen.toLocaleString("en-US")}`,
    nextAction: approvedOfferUnits >= mission.objective.monthlyPaidUnitMin && offerApproval.approvedEditionIds.length < canonicalWorkCount
      ? "Preserve the live monthly quota capacity while promoting catalog works in measured batches: require work-level demand, printable-master preflight and exact Human Offer approval before each work becomes directly sellable."
      : offerCapacityReadiness.status === "HUMAN_APPROVAL_REQUIRED"
      ? "Request the three exact per-Edition Offer approval tokens from offer-expansion-approval-candidate.json; do not activate without them."
      : offerCapacityReadiness.status === "MASTER_GENERATION_REQUIRED"
        ? "Run prepare:metal-print-expansion-masters, rebuild capacity readiness, and validate all three TIFF candidates."
        : "Connect PortableSSD; the next automation run will hash-check the three sources, generate TIFF candidates and build the exact approval packet.",
    humanGate: offerCapacityReadiness.status !== "MASTER_GENERATION_REQUIRED",
  },
  {
    id: "qualified_pipeline",
    status: !pipelineAvailable ? "EVIDENCE_UNAVAILABLE" : qualified >= assurance.goThresholds.qualifiedProspectsMinFallback ? "PASS" : "CRITICAL_GAP",
    evidence: pipelineAvailable ? `${qualified}/${assurance.goThresholds.qualifiedProspectsMinFallback} qualified; ¥${pipelineValueJpy.toLocaleString("en-US")}/¥33,000,000` : `Production pipeline evidence unavailable: ${pipeline.reason}`,
    nextAction: "Convert consented Chat consultations into durable qualification records; do not fabricate or import unconsented leads.",
    humanGate: false,
  },
  {
    id: "dossier_and_intent",
    status: dossierAccepted >= assurance.goThresholds.dossierAcceptedMin && purchaseIntent >= assurance.goThresholds.purchaseIntentMin ? "PASS" : "CRITICAL_GAP",
    evidence: `${dossierAccepted}/${assurance.goThresholds.dossierAcceptedMin} Dossier accepted; ${purchaseIntent}/${assurance.goThresholds.purchaseIntentMin} purchase intent`,
    nextAction: "Generate the matched one-work Dossier after real selection and capture explicit acceptance and purchase timing.",
    humanGate: false,
  },
  {
    id: "proof_and_fulfillment",
    status: approvedPhysicalProofs >= assurance.goThresholds.proofsApprovedMin ? "PASS" : "CUSTOMER_FUNDED_OR_HUMAN_GATE",
    evidence: `${approvedPhysicalProofs}/${assurance.goThresholds.proofsApprovedMin} Human-approved physical proofs; ${proof.proofs.length - approvedPhysicalProofs} non-approved records excluded`,
    nextAction: "Use the first customer-funded production unit as the physical proof unless the owner separately approves a paid proof order.",
    humanGate: true,
  },
  {
    id: "observed_economics",
    status: Object.values(economicsActuals.gates).every((value) => value === true) ? "PASS" : netNonRefundedYen > 0 ? "ACTION_DUE" : "WAITING_FOR_PAID_FULFILLMENT",
    evidence: `${economicsActuals.observed.paidFulfilledOrders}/${economicsActuals.thresholds.paidFulfilledOrdersMin} paid fulfilled; ${economicsActuals.observed.stripeSettlementSamples}/${economicsActuals.thresholds.stripeSettlementSamplesMin} Stripe settlements; CAC cohort ${economicsActuals.observed.maturedPaidCustomers}/${economicsActuals.thresholds.maturedPaidCustomersForMeasuredCacMin}; replacement cohort ${economicsActuals.observed.fulfilledUnitsObserved}/${economicsActuals.thresholds.fulfilledUnitsForReplacementObservationMin}`,
    nextAction: "After real paid fulfillment, record the vendor invoice, actual Stripe settlement fee, attributed acquisition/operating cost and replacement outcome; never substitute the JPY 20,000 CAC cap for measured CAC.",
    humanGate: false,
  },
  {
    id: "revenue",
    status: !revenueAvailable ? "EVIDENCE_UNAVAILABLE" : netNonRefundedYen >= revenue.targetYen ? "PASS" : "CRITICAL_GAP",
    evidence: revenueAvailable ? `¥${netNonRefundedYen.toLocaleString("en-US")}/¥${revenue.targetYen.toLocaleString("en-US")} net non-refunded` : `Production revenue evidence unavailable: ${revenue.reason}`,
    nextAction: "Refresh the Stripe aggregate after real payments and connect each valid order to fulfillment evidence.",
    humanGate: false,
  },
];

const priorityOrder = ["distribution", "measurement", "chat_conversion", "sellable_capacity", "qualified_pipeline", "dossier_and_intent", "observed_economics", "revenue", "proof_and_fulfillment"];
const actionable = lanes.filter((lane) => ["ACTION_DUE", "ACQUIRING_MINIMUM_SAMPLE", "ACQUIRING_MINIMUM_SAMPLE_WITH_PROFILE_GAP", "NO_REAL_CONSULTATION", "CRITICAL_GAP", "LEARNING"].includes(lane.status) && !lane.humanGate)
  .sort((a, b) => priorityOrder.indexOf(a.id) - priorityOrder.indexOf(b.id));

const output = {
  schemaVersion: 1,
  generatedAt: now.toISOString(),
  objective: "Phase 1: acquire 10 real paid and fulfilled ¥330,000 metal-print orders with at least ¥3,000,000 net non-refunded revenue and observed economics. Permanent mission: sell out three units for every canonical work.",
  activeGoal: {
    phase: 1,
    paidFulfilledOrderTarget: 10,
    netNonRefundedRevenueTargetYen: 3000000,
    requiresVerifiedPurchaseIntent: true,
    requiresStripePayment: true,
    requiresSerialConsumption: true,
    requiresVendorOrder: true,
    requiresDeliveryAndReceipt: true,
    requiresObservedEconomics: true,
    forbidPrematureFullCatalogDetailing: true,
  },
  goalScale: {
    catalogSource: selloutGoal.catalogSource,
    canonicalWorks: canonicalWorkCount,
    editionSizePerWork: selloutGoal.offer.editionSizePerWork,
    terminalEditionUnits,
    unitPriceYen: selloutGoal.offer.unitPriceYen,
    terminalGrossYen,
    approvedOfferWorks: offerApproval.approvedEditionIds.length,
    approvedCatalogCoverage,
    recurringMonthlyQuotaYen: selloutGoal.minimumMonthlyQuota.netNonRefundedRevenueYen,
    terminalCompletionEvidence: "durable paid, fulfilled and non-refunded edition serials for every canonical work",
  },
  decision: revenueAvailable && netNonRefundedYen >= revenue.targetYen ? "TARGET_PROVEN_THIS_MONTH" : "KEEP_EXECUTING",
  waveDay,
  primaryAction: actionable[0]?.nextAction ?? "No autonomous action currently eligible; preserve evidence and wait for the next measured gate.",
  nextHumanGate: dailyMusicReadiness && dailyMusicManifest
    && dailyMusicReadiness.readiness?.mediaReady === dailyMusicReadiness.placements
    && dailyMusicReadiness.readiness?.approvalReady < dailyMusicReadiness.placements
    ? {
        id: "DAILY_MUSIC_WAVE_PUBLICATION_APPROVAL",
        exactToken: dailyMusicManifest.batchApprovalToken,
        scope: `${dailyMusicReadiness.placements} placements / ${dailyMusicReadiness.releases} works`,
        effect: "Marks the exact prepared placements APPROVED_WAITING_SCHEDULE; does not publish, pay, accept terms or bypass platform ingress.",
      }
    : null,
  mandatoryRule: "Every run evaluates all nine lanes and completes the primary action plus one non-blocked downstream action when safe.",
  lanes,
  safety: {
    approvedExternalScope: "ABI Launch Wave 01 exact 22 placements only",
    excludedWithoutNewApproval: ["paid ads", "cold DMs", "proof purchase", "vendor payment", "refund", "identity verification", "new external copy"],
    successEvidence: "Actual durable non-refunded Stripe revenue connected to fulfillment evidence",
  },
  evidenceInputs: {
    profileChatActivation: profileChatActivationVerified ? "PRODUCTION_VERIFIED" : "UNVERIFIED",
    directProfileLinksVerified,
    profileLinkGaps,
    profileLinkCoverageComplete,
    profileLinkTargets: Object.fromEntries(activeAudiencePlatforms.map((platform) => [platform, profilePacket.profiles?.[platform]?.website ?? null])),
    dossierSessions,
    minimumDossierSample,
    landingDiagnosisSample,
    bestPlacementDossier,
    bestPlacementQualified,
    allocationCandidateVerified,
    offerCapacityReadiness: offerCapacityReadiness.status,
    approvedPhysicalProofs,
    unverifiedConsultations,
    contactVerificationFailures,
    maturityDue24h: due24hCount,
    maturityDue72h: due72hCount,
    maturityResolved24h: resolved24hCount,
    maturityResolved72h: resolved72hCount,
    nextMaturityAt: maturityQueue.summary?.nextMaturityAt ?? null,
    duePublicationPlacementIds: dueUnpublished.map((row) => row.placementId),
    nextPublicationAt,
    reviewPendingPlacementIds: reviewPending.map((row) => row.placementId),
    launchWaveComplete,
    dailyReleaseBuilderReady,
    dailyMusicWave: dailyMusicReadiness ? {
      waveId: dailyMusicReadiness.waveId,
      placements: dailyMusicReadiness.placements,
      mediaReady: dailyMusicReadiness.readiness?.mediaReady ?? 0,
      ingressReady: dailyMusicReadiness.readiness?.ingressReady ?? 0,
      approvalReady: dailyMusicReadiness.readiness?.approvalReady ?? 0,
      publicationEligible: dailyMusicReadiness.readiness?.publicationEligible ?? 0,
      mediaBlockedPlacementIds: dailyMusicReadiness.readiness?.mediaBlockedPlacementIds ?? [],
      platformStepPlacementIds: dailyMusicReadiness.readiness?.platformStepPlacementIds ?? [],
    } : null,
  },
};

assert.equal(lanes.length, 9);
assert.equal(ledgerRows.length, 22);
assert.ok(output.primaryAction.length > 20);
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ status: "PASS", decision: output.decision, waveDay, primaryAction: output.primaryAction, laneStatuses: Object.fromEntries(lanes.map((lane) => [lane.id, lane.status])) }, null, 2));
