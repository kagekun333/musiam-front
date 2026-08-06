import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { summarizeMetalPrintEconomicsActuals, type MetalPrintEconomicsActualLedger } from "../src/lib/metal-print-economics-actuals";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ledgerPath = path.join(root, "ops/metal-print-vip/economics-actuals-ledger.json");
const outputPath = path.join(root, "ops/metal-print-vip/economics-actuals-evidence.json");
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8")) as MetalPrintEconomicsActualLedger;
const observed = summarizeMetalPrintEconomicsActuals(ledger);
const thresholds = { paidFulfilledOrdersMin: 1, stripeSettlementSamplesMin: 1, maturedPaidCustomersForMeasuredCacMin: 3, fulfilledUnitsForReplacementObservationMin: 10 };
const gates = {
  paidInvoiceAndFulfillment: observed.paidFulfilledOrders >= thresholds.paidFulfilledOrdersMin && observed.vendorPaidInvoices >= 1,
  actualStripeFee: observed.stripeSettlementSamples >= thresholds.stripeSettlementSamplesMin,
  measuredCac: observed.maturedPaidCustomers >= thresholds.maturedPaidCustomersForMeasuredCacMin && Number.isFinite(observed.measuredCustomerAcquisitionCostYen),
  replacementObservation: observed.fulfilledUnitsObserved >= thresholds.fulfilledUnitsForReplacementObservationMin && Number.isFinite(observed.measuredReplacementRate),
  observedContributionMargin60: observed.measuredContributionMarginRate !== null && observed.measuredContributionMarginRate >= 0.6,
};
const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  evidenceClass: Object.values(gates).every(Boolean) ? "OBSERVED_UNIT_ECONOMICS_PROVEN" : "OBSERVED_UNIT_ECONOMICS_PENDING",
  thresholds,
  observed,
  gates,
  launchReadinessBoundary: "The enforced JPY 20000 CAC cap and JP/US/EU platform quotes prove a controlled pre-sale margin stress test only.",
  strongJudgmentBoundary: "Observed unit economics require Human-reviewed, hash-referenced fulfilled orders and CAC cohorts. Until every gate passes, actual contribution margin is unproven.",
};
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
