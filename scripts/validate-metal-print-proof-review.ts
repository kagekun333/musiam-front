import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { finalizeMetalPrintProof, METAL_PRINT_PROOF_SCORE_KEYS, sanitizeRegisteredMetalPrintProof } from "../src/lib/metal-print-proof-review";

const candidate = {
  id: "proof_customer_0001",
  editionId: "VIP-METAL-2026-07-NATURA",
  sourceSha256: "a".repeat(64),
  vendorId: "whitewall-jp",
  quoteReference: "quote_test",
  orderReference: "order_test",
  orderedAt: "2026-07-01T00:00:00.000Z",
  receivedAt: "2026-07-14T00:00:00.000Z",
  productionProcess: "ChromaLuxe HD Metal Print",
  sameProcessAsProduction: true,
  receiptPhotoReferences: [1, 2, 3].map((number) => ({ path: `photo-${number}.jpg`, sha256: String(number).repeat(64), bytes: 1000 + number })),
};
const scores = Object.fromEntries(METAL_PRINT_PROOF_SCORE_KEYS.map((key) => [key, 8])) as Record<(typeof METAL_PRINT_PROOF_SCORE_KEYS)[number], number>;
const accepted = finalizeMetalPrintProof(candidate, { scores, hardFails: [], humanDecision: "ACCEPT", humanReviewer: "Owner", reviewedAt: "2026-07-14T01:00:00.000Z", approvalToken: "APPROVE_PHYSICAL_PROOF:proof_customer_0001:ACCEPT" });
assert.equal(accepted.totalScore, 64);
assert.equal(accepted.approved, true);
const sanitized = sanitizeRegisteredMetalPrintProof(accepted);
assert.ok(sanitized.receiptPhotoReferences.every((photo) => photo.path.startsWith("evidence://receipt-photo/")));
assert.ok(!JSON.stringify(sanitized).includes("photo-1.jpg"), "local receipt-photo path leaked into durable proof evidence");
assert.deepEqual(sanitized.receiptPhotoReferences.map((photo) => photo.sha256), accepted.receiptPhotoReferences.map((photo) => photo.sha256));
assert.throws(() => finalizeMetalPrintProof(candidate, { scores, hardFails: [], humanDecision: "ACCEPT", humanReviewer: "Owner", reviewedAt: "2026-07-14T01:00:00.000Z" }), /approval token/);
assert.throws(() => finalizeMetalPrintProof({ ...candidate, receiptPhotoReferences: candidate.receiptPhotoReferences.slice(0, 2) }, { scores, hardFails: [], humanDecision: "REVISE", humanReviewer: "Owner", reviewedAt: "2026-07-14T01:00:00.000Z" }), /three receipt photos/);
assert.throws(() => finalizeMetalPrintProof(candidate, { scores, hardFails: ["WARP_SCRATCH_PEEL_OR_CORNER_DAMAGE"], humanDecision: "ACCEPT", humanReviewer: "Owner", reviewedAt: "2026-07-14T01:00:00.000Z", approvalToken: "APPROVE_PHYSICAL_PROOF:proof_customer_0001:ACCEPT" }), /conflicts/);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const template = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip/proof-review-template.json"), "utf8"));
assert.equal(Object.keys(template.humanReview.scores).length, 8);
assert.equal(template.candidate.receiptPhotoReferences.length, 3);
assert.equal(template.status, "TEMPLATE_AWAITING_PHYSICAL_UNIT");
const register = fs.readFileSync(path.join(root, "scripts/register-metal-print-proof.ts"), "utf8");
assert.ok(register.includes("--human-approval-token"), "proof registration must require an external Human approval token");
assert.ok(register.includes("photo evidence mismatch"), "proof registration must re-hash receipt photos");
assert.ok(register.includes("proof id already registered with different evidence"), "proof registration must reject conflicting duplicate evidence");
assert.ok(register.includes("proofsApproved"), "proof registration must synchronize the assurance count");
assert.ok(register.includes("sanitizeRegisteredMetalPrintProof"), "proof registration must strip private local photo paths");
assert.ok(register.includes(".pending"), "proof registry update must stage both synchronized files before replacement");
assert.ok(register.includes("PHYSICAL_PROOF_ALREADY_REGISTERED_ASSURANCE_SYNCED"), "proof registration is not restart-safe after a partial synchronized update");
console.log("metal-print proof review: PASS — photo hashes, eight-axis scoring, hard fails, and explicit Human ACCEPT token");
