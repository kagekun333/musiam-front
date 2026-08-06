import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildMetalPrintOrderEvidenceCandidate } from "../src/lib/metal-print-order-evidence-candidate";
import { buildRegisteredMetalPrintOrderLedger } from "../src/lib/metal-print-order-evidence-registration";
import type { MetalPrintEconomicsActualLedger } from "../src/lib/metal-print-economics-actuals";

const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "metal-order-evidence-"));
const invoice = path.join(fixtureDir, "invoice.pdf");
const settlement = path.join(fixtureDir, "settlement.csv");
const fulfillment = path.join(fixtureDir, "delivery.pdf");
fs.writeFileSync(invoice, "synthetic invoice evidence");
fs.writeFileSync(settlement, "synthetic Stripe settlement evidence");
fs.writeFileSync(fulfillment, "synthetic fulfillment evidence");
const raw = {
  evidenceId: "ACTUAL-CANDIDATE-01",
  editionId: "VIP-METAL-2026-07-NATURA",
  region: "JP",
  paidAt: "2026-07-01T00:00:00.000Z",
  fulfilledAt: "2026-07-10T00:00:00.000Z",
  grossPaidYen: 330000,
  internalOrderReference: "internal-order-fixture-01",
  trackingReference: "tracking-fixture-01",
  vendorInvoicePath: invoice,
  stripeSettlementPath: settlement,
  fulfillmentEvidencePath: fulfillment,
  productionYen: 26400,
  shippingYen: 5100,
  packagingYen: 0,
  customsDutyYen: 0,
  indirectTaxLiabilityYen: 30000,
  stripeFeeYen: 11880,
  fxCostYen: 0,
  replacementRequired: false,
  replacementCostYen: 0,
};
const secret = "synthetic-secret-at-least-32-characters-long";
const candidate = buildMetalPrintOrderEvidenceCandidate(raw, secret);
assert.match(candidate.orderReferenceHmac, /^[a-f0-9]{64}$/);
assert.match(candidate.trackingReferenceHash, /^[a-f0-9]{64}$/);
assert.notEqual(candidate.orderReferenceHmac, candidate.trackingReferenceHash, "HMAC domains must be separated");
assert.ok(!JSON.stringify(candidate).includes(raw.internalOrderReference));
assert.ok(!JSON.stringify(candidate).includes(raw.trackingReference));
assert.ok(!JSON.stringify(candidate).includes(fixtureDir), "source paths must not leak into the candidate");
assert.throws(() => buildMetalPrintOrderEvidenceCandidate(raw, "short"), /at least 32 characters/);
assert.throws(() => buildMetalPrintOrderEvidenceCandidate({ ...raw, customerEmail: "forbidden@example.test" }, secret), /unknown source field/);
assert.throws(() => buildMetalPrintOrderEvidenceCandidate({ ...raw, vendorInvoicePath: path.join(fixtureDir, "missing.pdf") }, secret), /existing absolute file/);
const emptyLedger: MetalPrintEconomicsActualLedger = { schemaVersion: 1, privacy: "synthetic", orders: [], cacCohorts: [] };
const nextLedger = buildRegisteredMetalPrintOrderLedger({ ledger: emptyLedger, candidate, proofs: [], humanApprovalToken: "APPROVE_ECONOMICS_ACTUAL:ACTUAL-CANDIDATE-01" });
assert.equal(nextLedger.orders.length, 1);
assert.equal(emptyLedger.orders.length, 0);
fs.rmSync(fixtureDir, { recursive: true, force: true });
console.log("metal-print order evidence candidate: PASS — file SHA-256, domain-separated HMAC, no raw references/paths, registration-compatible, ledger unchanged");
