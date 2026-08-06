import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { deriveMetalPrintOfferCapacityStatus } from "../src/lib/metal-print-offer-capacity-readiness";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ops = path.join(root, "ops/metal-print-vip");
const packetPath = path.join(ops, "offer-capacity-expansion-readiness-2026-07-26.json");
const approvalCandidatePath = path.join(ops, "offer-expansion-approval-candidate.json");
const preflight = JSON.parse(fs.readFileSync(path.join(ops, "proof-preflight-state-2026-07-20.json"), "utf8"));
const packet = JSON.parse(fs.readFileSync(packetPath, "utf8"));
const manifestPath = path.join(ops, "expansion-master-manifest.json");
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : null;
const registry = JSON.parse(fs.readFileSync(path.join(ops, "made-to-order-sales-approval-2026-07-24.json"), "utf8"));
const sha256 = (filePath: string) => crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
type EditionReadinessRecord = {
  editionId: string;
  sourceMountAvailable: boolean;
  printMasterCandidateGenerated: boolean;
  approvalTokenAfterAllMechanicalChecksPass: string;
  printMasterEvidence?: {
    relativePath: string;
    sha256: string;
    bytes: number;
    dimensionsPx: string;
    format: string;
    colorSpace: string;
    hasAlpha: boolean;
  };
  [key: string]: unknown;
};

async function main() {
const editions: EditionReadinessRecord[] = [];
for (const existing of packet.editions) {
  const historical = preflight.items.find((item: { editionId: string }) => item.editionId === existing.editionId);
  if (!historical) throw new Error(`${existing.editionId}: historical preflight evidence missing`);
  const sourceMountAvailable = fs.existsSync(historical.sourceAssetPath);
  if (sourceMountAvailable && sha256(historical.sourceAssetPath) !== historical.sha256) throw new Error(`${existing.editionId}: mounted source hash changed`);
  const output = manifest?.outputs?.find((item: { editionId?: string }) => item.editionId === existing.editionId);
  let printMasterCandidateGenerated = false;
  let printMasterEvidence = null;
  if (output) {
    const outputPath = path.join(root, output.outputRelativePath);
    if (!fs.existsSync(outputPath) || sha256(outputPath) !== output.outputSha256) throw new Error(`${existing.editionId}: candidate TIFF evidence mismatch`);
    const metadata = await sharp(outputPath).metadata();
    if (metadata.width !== 3000 || metadata.height !== 3000 || metadata.hasAlpha || metadata.format !== "tiff") throw new Error(`${existing.editionId}: candidate TIFF mechanical validation failed`);
    printMasterCandidateGenerated = true;
    printMasterEvidence = {
      relativePath: output.outputRelativePath,
      sha256: output.outputSha256,
      bytes: fs.statSync(outputPath).size,
      dimensionsPx: "3000x3000",
      format: "tiff",
      colorSpace: output.colorSpace,
      hasAlpha: false,
    };
  }
  editions.push({ ...existing, sourceMountAvailable, printMasterCandidateGenerated, ...(printMasterEvidence ? { printMasterEvidence } : {}) });
}

const mechanical = deriveMetalPrintOfferCapacityStatus(editions);
const expansionApprovals = editions.map((edition) => registry.editionApprovals?.find((approval: { editionId?: string }) => approval.editionId === edition.editionId));
const allApproved = expansionApprovals.every((approval, index) => approval
  && approval.amountJpy === packet.sharedOffer.amountJpy
  && approval.masterSha256 === editions[index].printMasterEvidence?.sha256);
const { allMounted, allCandidates } = mechanical;
const status = allApproved ? "APPROVED" : mechanical.status;
const generatedAt = new Date().toISOString();
const nextPacket = {
  ...packet,
  generatedAt,
  status,
  objective: {
    ...packet.objective,
    currentApprovedOfferUnits: registry.approvedEditionIds.length * registry.offer.editionSize,
    currentMaximumApprovedOfferGrossYen: registry.approvedEditionIds.length * registry.offer.editionSize * registry.offer.amountJpy,
  },
  editions,
  restartSafeExecution: {
    ...packet.restartSafeExecution,
    currentResult: allApproved ? "EXPANSION_APPROVED" : allCandidates ? "EXPANSION_MASTER_CANDIDATES_READY" : allMounted ? "RUN_PREPARE_COMMAND" : "SOURCE_MOUNT_REQUIRED",
    currentWriteResult: allApproved ? "Three hash-locked expansion Offers are registered" : allCandidates ? "Three hash-locked TIFF candidates and manifest verified" : "No new candidate was claimed by this readiness builder",
  },
  evidenceBoundary: allApproved
    ? "All three hash-locked expansion Offers are Human-approved and registered. This proves 12-unit / JPY 3,960,000 sellable capacity, not physical print quality, demand, payment or revenue."
    : allCandidates
    ? "All three historically hash-locked sources have matching 3000x3000 TIFF candidates. This makes the three Offer approvals mechanically eligible for explicit Human review; it does not activate an Offer or approve physical print quality."
    : "The three historical 3000x3000 RGB source records remain valid, but all three TIFF candidates are not yet verified in the current workspace. No additional Offer is eligible for approval.",
};
const approvalCandidate = {
  schemaVersion: 1,
  generatedAt,
  status,
  eligibleEditionCount: allApproved ? 0 : allCandidates ? editions.length : 0,
  registeredExpansionEditionCount: allApproved ? editions.length : 0,
  plannedApprovedOfferUnits: allApproved ? registry.approvedEditionIds.length * registry.offer.editionSize : allCandidates ? packet.objective.plannedApprovedOfferUnits : packet.objective.currentApprovedOfferUnits,
  plannedMaximumApprovedOfferGrossYen: allApproved ? registry.approvedEditionIds.length * registry.offer.editionSize * registry.offer.amountJpy : allCandidates ? packet.objective.plannedMaximumApprovedOfferGrossYen : packet.objective.currentMaximumApprovedOfferGrossYen,
  approvals: !allApproved && allCandidates ? editions.map((edition) => ({
    editionId: edition.editionId,
    amountJpy: packet.sharedOffer.amountJpy,
    masterSha256: edition.printMasterEvidence!.sha256,
    approvalToken: edition.approvalTokenAfterAllMechanicalChecksPass,
  })) : [],
  humanDecisionRequired: !allApproved && allCandidates,
  approvalBoundary: allApproved
    ? "The exact three Human tokens were registered with the candidate master hashes. No further Offer-expansion approval is pending."
    : "Candidate packet only. Tokens must be returned explicitly by the Human owner before source offer locks, deployment or checkout activation can change.",
};

for (const [target, value] of [[packetPath, nextPacket], [approvalCandidatePath, approvalCandidate]] as const) {
  const pending = `${target}.pending`;
  if (fs.existsSync(pending)) throw new Error(`pending state exists: ${pending}`);
  fs.writeFileSync(pending, `${JSON.stringify(value, null, 2)}\n`, { flag: "wx" });
  fs.renameSync(pending, target);
}
console.log(JSON.stringify({ status, allMounted, allCandidates, allApproved, eligibleEditionCount: approvalCandidate.eligibleEditionCount }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
