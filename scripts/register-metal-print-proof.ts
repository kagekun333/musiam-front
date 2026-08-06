import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { finalizeMetalPrintProof, sanitizeRegisteredMetalPrintProof } from "../src/lib/metal-print-proof-review";

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const reviewPathArg = argument("--review");
const humanApprovalToken = argument("--human-approval-token");
if (!reviewPathArg) throw new Error("--review is required");
const reviewPath = path.resolve(reviewPathArg);
const input = JSON.parse(fs.readFileSync(reviewPath, "utf8"));
if (!input?.candidate || !input?.humanReview) throw new Error("candidate and humanReview are required");
if (input.humanReview.humanDecision !== "ACCEPT") throw new Error("only Human ACCEPT can be registered as an approved physical proof");
const expectedToken = `APPROVE_PHYSICAL_PROOF:${input.candidate.id}:ACCEPT`;
if (humanApprovalToken !== expectedToken) throw new Error("matching --human-approval-token is required");
input.humanReview.approvalToken = humanApprovalToken;

for (const photo of input.candidate.receiptPhotoReferences ?? []) {
  const photoPath = path.isAbsolute(photo.path) ? photo.path : path.resolve(path.dirname(reviewPath), photo.path);
  const bytes = fs.readFileSync(photoPath);
  const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== photo.sha256 || bytes.byteLength !== photo.bytes) throw new Error(`photo evidence mismatch: ${photo.path}`);
}

const reviewedProof = finalizeMetalPrintProof(input.candidate, input.humanReview);
if (!reviewedProof.approved) throw new Error("proof did not satisfy approval rules");
const proof = sanitizeRegisteredMetalPrintProof(reviewedProof);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ledgerPath = path.join(root, "ops/metal-print-vip/proof-evidence-ledger.json");
const assurancePath = path.join(root, "ops/metal-print-vip/assurance.json");
const ledgerTemp = `${ledgerPath}.pending`;
const assuranceTemp = `${assurancePath}.pending`;
if (fs.existsSync(ledgerTemp)) {
  const pendingLedger = JSON.parse(fs.readFileSync(ledgerTemp, "utf8"));
  const pendingProof = pendingLedger.proofs?.find((existing: { id?: string }) => existing.id === proof.id);
  if (!pendingProof || JSON.stringify(pendingProof) !== JSON.stringify(proof)) throw new Error("pending proof ledger conflicts with this registration");
  fs.renameSync(ledgerTemp, ledgerPath);
}
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
const assurance = JSON.parse(fs.readFileSync(assurancePath, "utf8"));
const existingProof = ledger.proofs.find((existing: { id?: string }) => existing.id === proof.id);
if (existingProof && JSON.stringify(existingProof) !== JSON.stringify(proof)) throw new Error("proof id already registered with different evidence");
const nextLedger = existingProof ? ledger : { ...ledger, auditedAt: new Date().toISOString(), proofs: [...ledger.proofs, proof], status: "PHYSICAL_PROOF_APPROVED" };
const nextAssurance = { ...assurance, supply: { ...assurance.supply, proofsApproved: nextLedger.proofs.filter((entry: { approved?: boolean }) => entry.approved === true).length } };
if (!existingProof) {
  fs.writeFileSync(ledgerTemp, `${JSON.stringify(nextLedger, null, 2)}\n`, { flag: "wx" });
  fs.renameSync(ledgerTemp, ledgerPath);
}
if (fs.existsSync(assuranceTemp)) {
  const pendingAssurance = JSON.parse(fs.readFileSync(assuranceTemp, "utf8"));
  if (JSON.stringify(pendingAssurance) !== JSON.stringify(nextAssurance)) throw new Error("pending assurance sync conflicts with proof ledger");
} else if (JSON.stringify(assurance) !== JSON.stringify(nextAssurance)) {
  fs.writeFileSync(assuranceTemp, `${JSON.stringify(nextAssurance, null, 2)}\n`, { flag: "wx" });
}
if (fs.existsSync(assuranceTemp)) fs.renameSync(assuranceTemp, assurancePath);
console.log(JSON.stringify({ status: existingProof ? "PHYSICAL_PROOF_ALREADY_REGISTERED_ASSURANCE_SYNCED" : "PHYSICAL_PROOF_REGISTERED", proofId: proof.id, totalScore: proof.totalScore, approved: true }));
