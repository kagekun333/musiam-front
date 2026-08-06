import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getApprovedMetalPrintOffer } from "../src/lib/metal-print-offers.server";
import { METAL_PRINT_VIP_EDITIONS } from "../src/lib/metal-print-vip";
import { deriveMetalPrintOfferCapacityStatus } from "../src/lib/metal-print-offer-capacity-readiness";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mission = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip/mission.json"), "utf8"));
const packet = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip/offer-capacity-expansion-readiness-2026-07-26.json"), "utf8"));
const historicalPreflight = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip/proof-preflight-state-2026-07-20.json"), "utf8"));
const approvalCandidate = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip/offer-expansion-approval-candidate.json"), "utf8"));
const manifestPath = path.join(root, "ops/metal-print-vip/expansion-master-manifest.json");
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : null;
const approved = METAL_PRINT_VIP_EDITIONS.flatMap((edition) => {
  const offer = getApprovedMetalPrintOffer(edition.id);
  return offer ? [{ edition, offer }] : [];
});
const expansionApproved = approved.length === METAL_PRINT_VIP_EDITIONS.length;
const units = approved.reduce((total, item) => total + item.edition.format.editionSize, 0);
const grossCap = approved.reduce((total, item) => total + item.edition.format.editionSize * item.offer.amountJpy, 0);

assert.ok(packet.objective.currentApprovedOfferUnits <= units, "approved units regressed below the historical expansion packet");
assert.ok(packet.objective.currentMaximumApprovedOfferGrossYen <= grossCap, "approved gross capacity regressed below the historical expansion packet");
assert.equal(packet.objective.requiredApprovedOfferUnits, mission.objective.monthlyPaidUnitMin);
assert.equal(packet.editions.length, 3);
for (const candidate of packet.editions) {
  const historical = historicalPreflight.items.find((item: { editionId: string }) => item.editionId === candidate.editionId);
  assert.ok(historical, `${candidate.editionId}: historical source evidence missing`);
  const sourceCurrentlyMounted = fs.existsSync(candidate.sourceAssetPath);
  if (!candidate.printMasterCandidateGenerated) {
    assert.equal(candidate.sourceMountAvailable, sourceCurrentlyMounted, `${candidate.editionId}: source mount state changed before master generation`);
  }
  assert.equal(candidate.sourceHashLocked, true);
  assert.equal(candidate.sourceHashEvidence.sha256, historical.sha256);
  assert.equal(candidate.sourceHashEvidence.dimensionsPx, historical.sourcePixels);
  assert.equal(candidate.sourceHashEvidence.colorSpace, historical.metadata.colorSpace);
  assert.equal(candidate.sourceHashEvidence.hasAlpha, historical.metadata.hasAlpha);
  assert.equal(candidate.digitalSourcePreflightPassed, historical.status === "CANDIDATE_MASTER_PASS");
  const manifestOutput = manifest?.outputs?.find((item: { editionId?: string }) => item.editionId === candidate.editionId);
  assert.equal(candidate.printMasterCandidateGenerated, Boolean(manifestOutput));
  if (candidate.printMasterCandidateGenerated) {
    assert.equal(candidate.printMasterEvidence.sha256, manifestOutput.outputSha256);
    assert.equal(candidate.printMasterEvidence.dimensionsPx, "3000x3000");
    assert.equal(candidate.printMasterEvidence.format, "tiff");
    assert.equal(candidate.printMasterEvidence.hasAlpha, false);
  }
  assert.equal(candidate.repositoryPreview.printMasterEligible, false);
  assert.match(candidate.approvalTokenAfterAllMechanicalChecksPass, new RegExp(`^APPROVE_METAL_PRINT_OFFER:${candidate.editionId}:330000$`));
}

const allCandidates = packet.editions.every((candidate: { printMasterCandidateGenerated: boolean }) => candidate.printMasterCandidateGenerated);
assert.equal(packet.status, expansionApproved ? "APPROVED" : allCandidates ? "HUMAN_APPROVAL_REQUIRED" : packet.editions.every((candidate: { sourceMountAvailable: boolean }) => candidate.sourceMountAvailable) ? "MASTER_GENERATION_REQUIRED" : "HUMAN_APPROVAL_NOT_YET_ELIGIBLE");
assert.equal(approvalCandidate.status, packet.status);
assert.equal(approvalCandidate.humanDecisionRequired, !expansionApproved && allCandidates);
assert.equal(approvalCandidate.approvals.length, !expansionApproved && allCandidates ? packet.editions.length : 0);
if (expansionApproved) {
  assert.equal(approvalCandidate.registeredExpansionEditionCount, 3);
  assert.equal(approvalCandidate.plannedApprovedOfferUnits, 12);
  assert.equal(approvalCandidate.plannedMaximumApprovedOfferGrossYen, 3_960_000);
} else if (allCandidates) {
  assert.equal(approvalCandidate.plannedApprovedOfferUnits, 12);
  assert.equal(approvalCandidate.plannedMaximumApprovedOfferGrossYen, 3_960_000);
  for (const approval of approvalCandidate.approvals) assert.match(approval.approvalToken, new RegExp(`^APPROVE_METAL_PRINT_OFFER:${approval.editionId}:330000$`));
}
assert.equal(deriveMetalPrintOfferCapacityStatus(Array.from({ length: 3 }, () => ({ sourceMountAvailable: false, printMasterCandidateGenerated: false }))).status, "HUMAN_APPROVAL_NOT_YET_ELIGIBLE");
assert.equal(deriveMetalPrintOfferCapacityStatus(Array.from({ length: 3 }, () => ({ sourceMountAvailable: true, printMasterCandidateGenerated: false }))).status, "MASTER_GENERATION_REQUIRED");
assert.equal(deriveMetalPrintOfferCapacityStatus(Array.from({ length: 3 }, () => ({ sourceMountAvailable: true, printMasterCandidateGenerated: true }))).status, "HUMAN_APPROVAL_REQUIRED");
assert.equal(deriveMetalPrintOfferCapacityStatus(Array.from({ length: 3 }, () => ({ sourceMountAvailable: false, printMasterCandidateGenerated: true }))).status, "HUMAN_APPROVAL_REQUIRED", "verified candidates remain eligible after the source drive is unmounted");

console.log(`[validate-metal-print-offer-capacity] PASS — approved=${units}/${mission.objective.monthlyPaidUnitMin} units, grossCap=¥${grossCap.toLocaleString()}, expansion candidates=${packet.editions.length}`);
