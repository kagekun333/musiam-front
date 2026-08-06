import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRegisteredMetalPrintOrderLedger } from "../src/lib/metal-print-order-evidence-registration";
import type { MetalPrintEconomicsActualLedger } from "../src/lib/metal-print-economics-actuals";

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const inputArg = argument("--input");
const humanApprovalToken = argument("--human-approval-token") ?? "";
const dryRun = process.argv.includes("--dry-run");
if (!inputArg) throw new Error("--input is required");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.resolve(inputArg);
const ledgerPath = path.join(root, "ops/metal-print-vip/economics-actuals-ledger.json");
const proofLedgerPath = path.join(root, "ops/metal-print-vip/proof-evidence-ledger.json");
const candidate = JSON.parse(fs.readFileSync(inputPath, "utf8")) as Record<string, unknown>;
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8")) as MetalPrintEconomicsActualLedger;
const proofLedger = JSON.parse(fs.readFileSync(proofLedgerPath, "utf8")) as { proofs: Array<{ id: string; editionId: string; approved: boolean }> };
const nextLedger = buildRegisteredMetalPrintOrderLedger({ ledger, candidate, proofs: proofLedger.proofs, humanApprovalToken });

if (dryRun) {
  console.log(JSON.stringify({ status: "VALIDATED_NOT_WRITTEN", evidenceId: candidate.evidenceId, totalOrdersAfterRegistration: nextLedger.orders.length }));
  process.exit(0);
}

const pendingPath = `${ledgerPath}.pending`;
if (fs.existsSync(pendingPath)) throw new Error("pending economics ledger update exists; inspect it before retrying");
fs.writeFileSync(pendingPath, `${JSON.stringify(nextLedger, null, 2)}\n`, { flag: "wx", mode: 0o600 });
fs.renameSync(pendingPath, ledgerPath);
console.log(JSON.stringify({ status: "ACTUAL_ORDER_EVIDENCE_REGISTERED", evidenceId: candidate.evidenceId, totalOrders: nextLedger.orders.length }));
