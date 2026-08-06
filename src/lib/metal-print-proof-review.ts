export const METAL_PRINT_PROOF_SCORE_KEYS = [
  "colorFidelity",
  "deepBlackDetail",
  "highlightControl",
  "edgeSharpness",
  "surfaceConsistency",
  "finishAndMounting",
  "packagingProtection",
  "collectorValue",
] as const;

export const METAL_PRINT_PROOF_HARD_FAILS = [
  "COLOR_SHIFT_BANDING_OR_CRUSH",
  "WARP_SCRATCH_PEEL_OR_CORNER_DAMAGE",
  "UNACCEPTABLE_MOUNT_OR_PACKAGING",
  "PROOF_AND_PRODUCTION_PROCESS_DIFFER",
] as const;

type ScoreKey = (typeof METAL_PRINT_PROOF_SCORE_KEYS)[number];
type HardFail = (typeof METAL_PRINT_PROOF_HARD_FAILS)[number];

export type ProofPhotoEvidence = { path: string; sha256: string; bytes: number };
export type ProofCandidate = {
  id: string;
  editionId: string;
  sourceSha256: string;
  vendorId: string;
  quoteReference: string;
  orderReference: string;
  orderedAt: string;
  receivedAt: string;
  productionProcess: string;
  sameProcessAsProduction: boolean;
  receiptPhotoReferences: ProofPhotoEvidence[];
};

export type ProofHumanReview = {
  scores: Record<ScoreKey, number>;
  hardFails: HardFail[];
  humanDecision: "ACCEPT" | "REVISE" | "REJECT";
  humanReviewer: string;
  reviewedAt: string;
  approvalToken?: string;
};

export function finalizeMetalPrintProof(candidate: ProofCandidate, review: ProofHumanReview) {
  if (!/^proof_[A-Za-z0-9_-]{8,100}$/.test(candidate.id)) throw new Error("invalid proof id");
  if (!/^[a-f0-9]{64}$/.test(candidate.sourceSha256)) throw new Error("invalid source hash");
  if (!candidate.orderReference || !candidate.quoteReference) throw new Error("order and quote evidence required");
  if (!Number.isFinite(Date.parse(candidate.orderedAt)) || !Number.isFinite(Date.parse(candidate.receivedAt))) throw new Error("invalid proof dates");
  if (Date.parse(candidate.receivedAt) < Date.parse(candidate.orderedAt)) throw new Error("proof received before order");
  if (!candidate.sameProcessAsProduction) throw new Error("proof process differs from production");
  if (candidate.receiptPhotoReferences.length < 3) throw new Error("at least three receipt photos required");
  for (const photo of candidate.receiptPhotoReferences) {
    if (!photo.path || !/^[a-f0-9]{64}$/.test(photo.sha256) || !Number.isInteger(photo.bytes) || photo.bytes <= 0) throw new Error("invalid photo evidence");
  }
  const scoreKeys = Object.keys(review.scores);
  if (scoreKeys.length !== METAL_PRINT_PROOF_SCORE_KEYS.length || !METAL_PRINT_PROOF_SCORE_KEYS.every((key) => scoreKeys.includes(key))) throw new Error("all eight proof scores required");
  const values = METAL_PRINT_PROOF_SCORE_KEYS.map((key) => review.scores[key]);
  if (!values.every((value) => Number.isInteger(value) && value >= 0 && value <= 10)) throw new Error("scores must be integers from 0 to 10");
  if (!review.hardFails.every((code) => METAL_PRINT_PROOF_HARD_FAILS.includes(code))) throw new Error("unknown hard fail");
  if (!review.humanReviewer.trim() || !Number.isFinite(Date.parse(review.reviewedAt))) throw new Error("human reviewer and review time required");
  const totalScore = values.reduce((sum, value) => sum + value, 0);
  const mechanicallyAcceptable = totalScore >= 64 && review.hardFails.length === 0;
  const approved = review.humanDecision === "ACCEPT" && mechanicallyAcceptable;
  if (review.humanDecision === "ACCEPT" && !mechanicallyAcceptable) throw new Error("ACCEPT conflicts with score or hard fail");
  if (approved && review.approvalToken !== `APPROVE_PHYSICAL_PROOF:${candidate.id}:ACCEPT`) throw new Error("physical proof approval token missing");
  return { ...candidate, ...review, totalScore, approved };
}

export function sanitizeRegisteredMetalPrintProof<T extends ReturnType<typeof finalizeMetalPrintProof>>(proof: T): T {
  return {
    ...proof,
    receiptPhotoReferences: proof.receiptPhotoReferences.map((photo, index) => ({
      ...photo,
      path: `evidence://receipt-photo/${index + 1}/${photo.sha256}`,
    })),
  };
}
