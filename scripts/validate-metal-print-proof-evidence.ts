import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ledger = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip/proof-evidence-ledger.json"), "utf8"));
const assurance = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip/assurance.json"), "utf8"));

assert.equal(ledger.schemaVersion, 1);
assert.equal(ledger.requiredScoreDimensions.length, 8);
assert.equal(ledger.approvalThreshold, 64);
assert.ok(ledger.hardFailCodes.length >= 4);

for (const proof of ledger.proofs) {
  assert.ok(proof.id);
  assert.ok(proof.editionId);
  assert.match(proof.sourceSha256, /^[a-f0-9]{64}$/);
  assert.ok(proof.vendorId);
  assert.ok(proof.quoteReference);
  assert.ok(proof.orderReference);
  assert.ok(Number.isFinite(Date.parse(proof.orderedAt)));
  assert.ok(proof.productionProcess);
  assert.equal(proof.sameProcessAsProduction, true, `${proof.id}: proof process differs from production`);
  assert.ok(Array.isArray(proof.receiptPhotoReferences) && proof.receiptPhotoReferences.length >= 3);
  assert.ok(Array.isArray(proof.hardFails));
  const scoreKeys = Object.keys(proof.scores ?? {});
  assert.deepEqual(new Set(scoreKeys), new Set(ledger.requiredScoreDimensions));
  const values = ledger.requiredScoreDimensions.map((key: string) => proof.scores[key]);
  assert.ok(values.every((value: unknown) => Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 10));
  const total = values.reduce((sum: number, value: number) => sum + value, 0);
  assert.equal(proof.totalScore, total);
  if (proof.approved) {
    assert.equal(proof.humanDecision, "ACCEPT", `${proof.id}: AI/self-review cannot approve physical proof`);
    assert.ok(proof.humanReviewer);
    assert.ok(Number.isFinite(Date.parse(proof.reviewedAt)));
    assert.equal(proof.hardFails.length, 0);
    assert.ok(total >= ledger.approvalThreshold);
  }
}

const approvedProofs = ledger.proofs.filter((proof: { approved: boolean }) => proof.approved).length;
assert.equal(assurance.supply.proofsApproved, approvedProofs, "assurance proof count must match evidence ledger");
console.log(`metal-print proof evidence validation PASS (${approvedProofs} approved proofs)`);
