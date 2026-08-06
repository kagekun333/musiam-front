import assert from "node:assert/strict";
import fs from "node:fs";

const controller = fs.readFileSync("scripts/build-metal-print-goal-controller.mjs", "utf8");
const state = JSON.parse(fs.readFileSync("ops/metal-print-vip/goal-controller-state.json", "utf8"));
const funnel = JSON.parse(fs.readFileSync("ops/metal-print-vip/first-party-funnel-snapshot.json", "utf8"));
const pipeline = JSON.parse(fs.readFileSync("ops/metal-print-vip/pipeline-evidence-snapshot.json", "utf8"));
const policy = JSON.parse(fs.readFileSync("src/lib/metal-print-measurement-policy.json", "utf8"));
const activation = JSON.parse(fs.readFileSync("ops/metal-print-vip/production-profile-chat-activation-evidence-2026-07-26.json", "utf8"));
const accountRegistry = JSON.parse(fs.readFileSync("ops/audience-engine/abi-hakusyaku-account-registry.json", "utf8"));
const capacityReadiness = JSON.parse(fs.readFileSync("ops/metal-print-vip/offer-capacity-expansion-readiness-2026-07-26.json", "utf8"));
const proofLedger = JSON.parse(fs.readFileSync("ops/metal-print-vip/proof-evidence-ledger.json", "utf8"));
const maturityQueue = JSON.parse(fs.readFileSync("ops/audience-engine/abi-hakusyaku-launch-wave-01-maturity-queue.json", "utf8"));
const publicationSchedule = JSON.parse(fs.readFileSync("ops/audience-engine/abi-hakusyaku-launch-wave-01-schedule.json", "utf8"));
const selloutGoal = JSON.parse(fs.readFileSync("ops/metal-print-vip/all-works-sellout-goal.json", "utf8"));
const canonicalRaw = JSON.parse(fs.readFileSync(selloutGoal.catalogSource, "utf8"));
const canonicalWorks = Array.isArray(canonicalRaw) ? canonicalRaw : canonicalRaw.items ?? canonicalRaw.works ?? [];
const offerApproval = JSON.parse(fs.readFileSync("ops/metal-print-vip/made-to-order-sales-approval-2026-07-24.json", "utf8"));
const dailyMusicReadiness = JSON.parse(fs.readFileSync("ops/audience-engine/daily-music-release-readiness-2026-08-03.json", "utf8"));

assert.ok(controller.includes('production-profile-chat-activation-evidence-2026-07-26.json'), "production profile-to-Chat evidence is not an input");
assert.ok(controller.includes('first-party-funnel-snapshot.json'), "first-party funnel snapshot is not an input");
assert.ok(controller.includes('"ACQUIRING_MINIMUM_SAMPLE"'), "minimum-sample state is missing");
assert.equal(state.evidenceInputs.profileChatActivation, activation.result === "PASS" ? "PRODUCTION_VERIFIED" : "UNVERIFIED");
const activePlatforms = ["instagram", "threads", "tiktok", "youtube"];
const verifiedProfileLinks = activePlatforms.filter((platform) => accountRegistry.accounts.find((item) => item.platform === platform)?.profileSetup?.website === "APPLIED_AND_PUBLICLY_VISIBLE");
assert.deepEqual(state.evidenceInputs.directProfileLinksVerified, verifiedProfileLinks);
assert.deepEqual(state.evidenceInputs.profileLinkGaps, activePlatforms.filter((platform) => !verifiedProfileLinks.includes(platform)));
assert.equal(state.evidenceInputs.profileLinkCoverageComplete, verifiedProfileLinks.length === activePlatforms.length);
assert.equal(state.evidenceInputs.dossierSessions, Number(funnel.metrics?.metal_dossier_view?.sessions ?? 0));
assert.equal(state.evidenceInputs.minimumDossierSample, policy.allocation.dossierSessionsPerPlacementMin);
assert.equal(state.evidenceInputs.landingDiagnosisSample, policy.conversionDiagnosis.dossierSessionsMin);
const placementProgress = Object.entries(funnel.byPlacement ?? {}).map(([key, placement]) => ({
  dossier: Number(placement.metrics?.metal_dossier_view ?? 0),
  qualified: Number(pipeline.byPlacement?.[key]?.qualified ?? 0),
}));
const bestDossier = Math.max(0, ...placementProgress.map((item) => item.dossier));
const bestQualified = Math.max(0, ...placementProgress.map((item) => item.qualified));
const allocationCandidate = placementProgress.some((item) => item.dossier >= policy.allocation.dossierSessionsPerPlacementMin && item.qualified >= policy.allocation.qualifiedPerPlacementMin);
assert.equal(state.evidenceInputs.bestPlacementDossier, bestDossier);
assert.equal(state.evidenceInputs.bestPlacementQualified, bestQualified);
assert.equal(state.evidenceInputs.allocationCandidateVerified, allocationCandidate);
assert.equal(state.evidenceInputs.offerCapacityReadiness, capacityReadiness.status);
assert.equal(state.evidenceInputs.unverifiedConsultations, Number(pipeline.unverified ?? 0));
assert.equal(state.evidenceInputs.contactVerificationFailures, Number(pipeline.contactVerificationFailures ?? 0));
assert.equal(state.evidenceInputs.maturityDue24h, Number(maturityQueue.summary.due24h));
assert.equal(state.evidenceInputs.maturityDue72h, Number(maturityQueue.summary.due72h));
assert.equal(state.evidenceInputs.maturityResolved24h, Number(maturityQueue.summary.resolved24h));
assert.equal(state.evidenceInputs.maturityResolved72h, Number(maturityQueue.summary.resolved72h));
assert.equal(state.evidenceInputs.nextMaturityAt, maturityQueue.summary.nextMaturityAt);
assert.equal(state.evidenceInputs.launchWaveComplete, state.lanes.find((lane) => lane.id === "distribution").status === "COMPLETE");
assert.equal(state.evidenceInputs.dailyReleaseBuilderReady, true);
assert.equal(state.evidenceInputs.dailyMusicWave.waveId, dailyMusicReadiness.waveId);
assert.equal(state.evidenceInputs.dailyMusicWave.placements, 28);
assert.equal(state.evidenceInputs.dailyMusicWave.mediaReady, dailyMusicReadiness.readiness.mediaReady);
assert.equal(state.evidenceInputs.dailyMusicWave.ingressReady, dailyMusicReadiness.readiness.ingressReady);
assert.equal(state.evidenceInputs.dailyMusicWave.approvalReady, dailyMusicReadiness.readiness.approvalReady);
assert.equal(state.evidenceInputs.dailyMusicWave.publicationEligible, dailyMusicReadiness.readiness.publicationEligible);
assert.deepEqual(state.evidenceInputs.dailyMusicWave.mediaBlockedPlacementIds, dailyMusicReadiness.readiness.mediaBlockedPlacementIds);
if (dailyMusicReadiness.readiness.mediaReady === dailyMusicReadiness.placements && dailyMusicReadiness.readiness.approvalReady < dailyMusicReadiness.placements) {
  assert.equal(state.nextHumanGate?.id, "DAILY_MUSIC_WAVE_PUBLICATION_APPROVAL");
  assert.equal(state.nextHumanGate?.exactToken, "APPROVE_DAILY_MUSIC_WAVE:DMW-20260805-7D");
}
const measurementLane = state.lanes.find((lane) => lane.id === "measurement");
assert.equal(measurementLane.status, maturityQueue.summary.due24h > 0 || maturityQueue.summary.due72h > 0 ? "ACTION_DUE" : "WAITING_FOR_MATURITY");
if (maturityQueue.summary.due24h === 0 && maturityQueue.summary.due72h === 0) {
  assert.doesNotMatch(state.primaryAction, /^Capture only matured/);
}
assert.equal(publicationSchedule.schedule.length, 9);
assert.deepEqual(publicationSchedule.schedule.map((item) => item.postId), Array.from({ length: 9 }, (_, index) => `ABI-LW01-${String(index + 1).padStart(2, "0")}`));
assert.equal(new Set(publicationSchedule.schedule.flatMap((item) => item.placements.map((platform) => `${item.postId}:${platform}`))).size, 22);
for (const item of publicationSchedule.schedule) assert.ok(Number.isFinite(Date.parse(item.scheduledAt)));
assert.equal(publicationSchedule.schedule.find((item) => item.postId === "ABI-LW01-04").scheduledAt, "2026-07-31T12:15:00+09:00");
assert.equal(publicationSchedule.schedule.find((item) => item.postId === "ABI-LW01-05").scheduledAt, "2026-08-01T12:15:00+09:00");
assert.equal(publicationSchedule.schedule.find((item) => item.postId === "ABI-LW01-06").scheduledAt, "2026-08-01T20:30:00+09:00");
const waitingLedgerRows = fs.readFileSync("ops/audience-engine/abi-hakusyaku-launch-wave-01-ledger.csv", "utf8").trim().split("\n").slice(1).map((line) => line.slice(1, -1).split('\",\"')).filter((values) => values[3] === "APPROVED_WAITING_SCHEDULE");
const expectedDuePlacements = waitingLedgerRows.filter((values) => Date.parse(publicationSchedule.schedule.find((item) => item.postId === values[1]).scheduledAt) <= Date.parse(state.generatedAt)).map((values) => values[0]);
assert.deepEqual(state.evidenceInputs.duePublicationPlacementIds, expectedDuePlacements);
const expectedNextPublication = publicationSchedule.schedule.filter((item) => waitingLedgerRows.some((values) => values[1] === item.postId) && Date.parse(item.scheduledAt) > Date.parse(state.generatedAt)).sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))[0]?.scheduledAt ?? null;
assert.equal(state.evidenceInputs.nextPublicationAt, expectedNextPublication);
const reviewPendingPlacementIds = fs.readFileSync("ops/audience-engine/abi-hakusyaku-launch-wave-01-ledger.csv", "utf8").trim().split("\n").slice(1).map((line) => line.slice(1, -1).split('\",\"')).filter((values) => values[3] === "REVIEW_PENDING").map((values) => values[0]);
assert.deepEqual(state.evidenceInputs.reviewPendingPlacementIds, reviewPendingPlacementIds);
if (reviewPendingPlacementIds.length > 0) {
  assert.match(state.primaryAction, /^Repair and mechanically validate REVIEW_PENDING canonical media/);
  assert.match(state.primaryAction, /validate:abi-launch-wave-media-preflight/);
}
const dueWaitingAt = (instant) => waitingLedgerRows.filter((values) => Date.parse(publicationSchedule.schedule.find((item) => item.postId === values[1]).scheduledAt) <= Date.parse(instant)).map((values) => values[0]);
const dueScheduledAt = (instant) => publicationSchedule.schedule.filter((item) => Date.parse(item.scheduledAt) <= Date.parse(instant)).flatMap((item) => item.placements.map((platform) => `${item.postId}:${platform}`));
assert.ok(!dueWaitingAt("2026-08-01T12:14:59+09:00").some((id) => id.startsWith("ABI-LW01-05:") || id.startsWith("ABI-LW01-06:")), "Recovery day posts became due before the first slot");
assert.ok(dueScheduledAt("2026-08-01T12:15:00+09:00").filter((id) => id.startsWith("ABI-LW01-05:")).length === 2, "ABI-LW01-05 is not due at recovery 12:15");
assert.ok(!dueScheduledAt("2026-08-01T20:29:59+09:00").some((id) => id.startsWith("ABI-LW01-06:")), "ABI-LW01-06 became due before recovery 20:30");
assert.ok(dueScheduledAt("2026-08-01T20:30:00+09:00").filter((id) => id.startsWith("ABI-LW01-06:")).length === 3, "ABI-LW01-06 is not due at recovery 20:30");
const approvedPhysicalProofs = proofLedger.proofs.filter((proof) => proof.approved === true).length;
assert.equal(state.evidenceInputs.approvedPhysicalProofs, approvedPhysicalProofs);
const proofLane = state.lanes.find((lane) => lane.id === "proof_and_fulfillment");
assert.equal(proofLane.status === "PASS", approvedPhysicalProofs >= 1, "non-approved proof records must not pass the proof lane");
assert.match(proofLane.evidence, new RegExp(`^${approvedPhysicalProofs}/1 Human-approved`));
const capacityLane = state.lanes.find((lane) => lane.id === "sellable_capacity");
assert.equal(state.goalScale.canonicalWorks, canonicalWorks.length);
assert.equal(state.goalScale.terminalEditionUnits, canonicalWorks.length * 3);
assert.equal(state.goalScale.terminalGrossYen, canonicalWorks.length * 3 * 330000);
assert.equal(state.goalScale.approvedOfferWorks, offerApproval.approvedEditionIds.length);
assert.equal(state.goalScale.recurringMonthlyQuotaYen, 3000000);
assert.equal(state.activeGoal.phase, 1);
assert.equal(state.activeGoal.paidFulfilledOrderTarget, 10);
assert.equal(state.activeGoal.netNonRefundedRevenueTargetYen, 3000000);
assert.equal(state.activeGoal.requiresObservedEconomics, true);
assert.equal(state.activeGoal.forbidPrematureFullCatalogDetailing, true);
if (offerApproval.approvedEditionIds.length < canonicalWorks.length && offerApproval.approvedEditionIds.length * offerApproval.offer.editionSize >= 10) {
  assert.equal(capacityLane.status, "MONTHLY_QUOTA_READY_CATALOG_EXPANSION_REQUIRED");
  assert.match(capacityLane.evidence, new RegExp(`^${offerApproval.approvedEditionIds.length}/${canonicalWorks.length} canonical works`));
}
if (capacityReadiness.status === "HUMAN_APPROVAL_NOT_YET_ELIGIBLE") {
  assert.equal(capacityLane.status, "SOURCE_MOUNT_REQUIRED");
  assert.match(capacityLane.nextAction, /Connect PortableSSD/);
}
if (capacityReadiness.status === "MASTER_GENERATION_REQUIRED") assert.equal(capacityLane.status, "MASTER_GENERATION_REQUIRED");
if (capacityReadiness.status === "HUMAN_APPROVAL_REQUIRED") assert.equal(capacityLane.status, "HUMAN_APPROVAL_REQUIRED");
if (capacityReadiness.status === "APPROVED" && offerApproval.approvedEditionIds.length >= canonicalWorks.length) assert.equal(capacityLane.status, "PASS");
const chatLane = state.lanes.find((lane) => lane.id === "chat_conversion");
assert.ok(controller.includes('contactVerificationFailures > 0'), "verification delivery failures cannot become an ACTION_DUE controller state");
assert.ok(controller.includes('"WAITING_FOR_CONTACT_VERIFICATION"'), "unverified consultations have no explicit controller state");
if (Number(pipeline.total ?? 0) === 0 && activation.result === "PASS" && !allocationCandidate) {
  assert.equal(chatLane.status, verifiedProfileLinks.length === activePlatforms.length ? "ACQUIRING_MINIMUM_SAMPLE" : "ACQUIRING_MINIMUM_SAMPLE_WITH_PROFILE_GAP");
  if (state.evidenceInputs.launchWaveComplete) assert.match(chatLane.nextAction, /build:daily-music-release-pack/);
  else assert.match(chatLane.nextAction, /approved spaced Launch Wave/);
  if (verifiedProfileLinks.length < activePlatforms.length) assert.match(chatLane.nextAction, /profile-update Human Gate/);
  assert.match(chatLane.nextAction, new RegExp(`${policy.conversionDiagnosis.dossierSessionsMin}-Dossier diagnosis floor`));
  assert.doesNotMatch(state.primaryAction, /^Verify profile-to-Chat links/);
}

console.log("metal-print goal controller: PASS — site activation and external profile-link coverage are independently evidenced");
