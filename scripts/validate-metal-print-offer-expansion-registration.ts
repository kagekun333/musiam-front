import assert from "node:assert/strict";
import { buildExpandedMetalPrintApprovalRegistry } from "../src/lib/metal-print-offer-expansion-registration";

const ids = ["VIP-METAL-2026-07-NATURA", "VIP-METAL-2026-07-IGNITION", "VIP-METAL-2026-07-HOME", "VIP-METAL-2026-07-BALIAN"];
const registry = {
  schemaVersion: 1,
  approvedAt: "2026-07-24T11:25:41.000Z",
  status: "APPROVED_FOR_CONTROLLED_SALE",
  approvedEditionIds: [ids[0]],
  editionApprovals: [{ editionId: ids[0], amountJpy: 330000, approvalToken: `APPROVE_METAL_PRINT_OFFER:${ids[0]}:330000`, approvedAt: "2026-07-24T11:25:41.000Z" }],
  offer: { currency: "jpy", amountJpy: 330000, editionSize: 3 },
};
const approvals = ids.slice(1).map((editionId, index) => ({ editionId, amountJpy: 330000, masterSha256: String(index + 1).repeat(64), approvalToken: `APPROVE_METAL_PRINT_OFFER:${editionId}:330000` }));
const candidate = { status: "HUMAN_APPROVAL_REQUIRED", eligibleEditionCount: 3, plannedApprovedOfferUnits: 12, approvals, humanDecisionRequired: true };
const tokens = approvals.map((approval) => approval.approvalToken);
const build = (overrides: Record<string, unknown> = {}) => buildExpandedMetalPrintApprovalRegistry({ candidate, registry, suppliedApprovalTokens: tokens, approvedAt: "2026-07-27T00:00:00.000Z", knownEditionIds: ids, requiredApprovedUnits: 10, ...overrides });
const result = build();
assert.deepEqual(result.approvedEditionIds, ids);
assert.equal(result.editionApprovals.length, 4);
assert.equal(result.editionApprovals.filter((approval) => approval.masterSha256).length, 3);
assert.throws(() => build({ suppliedApprovalTokens: tokens.slice(0, 2) }), /token missing/);
assert.throws(() => build({ suppliedApprovalTokens: [...tokens, "APPROVE_METAL_PRINT_OFFER:UNKNOWN:330000"] }), /unexpected approval token/);
assert.throws(() => build({ candidate: { ...candidate, status: "HUMAN_APPROVAL_NOT_YET_ELIGIBLE" } }), /not mechanically eligible/);
assert.throws(() => build({ candidate: { ...candidate, approvals: approvals.map((approval, index) => index === 0 ? { ...approval, masterSha256: "bad" } : approval) } }), /master SHA-256 invalid/);
assert.throws(() => build({ approvedAt: "invalid" }), /valid ISO/);
console.log("metal-print Offer expansion registration: PASS — exact 3-token, hash-bound, 12-unit atomic registry transition");
