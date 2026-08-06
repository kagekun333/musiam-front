import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildExpandedMetalPrintApprovalRegistry } from "../src/lib/metal-print-offer-expansion-registration";
import { METAL_PRINT_VIP_EDITIONS } from "../src/lib/metal-print-vip";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidatePath = path.join(root, "ops/metal-print-vip/offer-expansion-approval-candidate.json");
const registryPath = path.join(root, "ops/metal-print-vip/made-to-order-sales-approval-2026-07-24.json");
const args = process.argv.slice(2);
const suppliedApprovalTokens = args.flatMap((value, index) => value === "--approval" && args[index + 1] ? [args[index + 1]] : []);
const apply = args.includes("--apply");
const candidate = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));

if (candidate.status !== "HUMAN_APPROVAL_REQUIRED") {
  console.error(JSON.stringify({ status: "HUMAN_APPROVAL_NOT_YET_ELIGIBLE", candidateStatus: candidate.status, registryChanged: false }, null, 2));
  process.exit(2);
}
if (!apply) {
  console.error(JSON.stringify({ status: "APPLY_FLAG_REQUIRED", requiredTokens: candidate.approvals.map((approval: { approvalToken: string }) => approval.approvalToken), registryChanged: false }, null, 2));
  process.exit(2);
}

const nextRegistry = buildExpandedMetalPrintApprovalRegistry({
  candidate,
  registry,
  suppliedApprovalTokens,
  approvedAt: new Date().toISOString(),
  knownEditionIds: METAL_PRINT_VIP_EDITIONS.map((edition) => edition.id),
  requiredApprovedUnits: 10,
});
const pendingPath = `${registryPath}.pending`;
if (fs.existsSync(pendingPath)) throw new Error(`pending approval registry exists: ${pendingPath}`);
fs.writeFileSync(pendingPath, `${JSON.stringify(nextRegistry, null, 2)}\n`, { flag: "wx" });
fs.renameSync(pendingPath, registryPath);
console.log(JSON.stringify({ status: "REGISTERED", approvedEditionIds: nextRegistry.approvedEditionIds, approvedOfferUnits: nextRegistry.approvedEditionIds.length * nextRegistry.offer.editionSize }));
