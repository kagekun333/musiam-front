import assert from "node:assert/strict";
import { buildCatalogMetalPrintApprovalRegistry } from "../src/lib/metal-print-offer-expansion-registration";

const token = "APPROVE_METAL_PRINT_OFFER:CATALOG-WORK:work-a:330000";
const registry = {
  schemaVersion: 1, approvedAt: "2026-01-01T00:00:00.000Z", status: "APPROVED_FOR_CONTROLLED_SALE",
  approvedEditionIds: ["existing"], editionApprovals: [{ editionId: "existing", amountJpy: 330000, approvalToken: "APPROVE_METAL_PRINT_OFFER:existing:330000", approvedAt: "2026-01-01T00:00:00.000Z" }],
  offer: { currency: "jpy", amountJpy: 330000, editionSize: 3 },
};
const candidate = { status: "HUMAN_APPROVAL_REQUIRED", items: [{ editionId: "CATALOG-WORK:work-a", workId: "work-a", workTitle: "Work A", amountJpy: 330000, editionSize: 3, mechanicallyEligible: true, approvalToken: token, master: { sha256: "a".repeat(64) } }] };
assert.throws(() => buildCatalogMetalPrintApprovalRegistry({ candidate, registry, suppliedApprovalTokens: [], approvedAt: "2026-08-03T00:00:00.000Z" }), /exact Human approval token missing/);
assert.throws(() => buildCatalogMetalPrintApprovalRegistry({ candidate: { ...candidate, items: [{ ...candidate.items[0], mechanicallyEligible: false }] }, registry, suppliedApprovalTokens: [token], approvedAt: "2026-08-03T00:00:00.000Z" }), /master is not eligible/);
assert.throws(() => buildCatalogMetalPrintApprovalRegistry({ candidate, registry, suppliedApprovalTokens: [token, "unexpected"], approvedAt: "2026-08-03T00:00:00.000Z" }), /unexpected approval token/);
const result = buildCatalogMetalPrintApprovalRegistry({ candidate, registry, suppliedApprovalTokens: [token], approvedAt: "2026-08-03T00:00:00.000Z" });
assert.deepEqual(result.approvedEditionIds, ["existing", "CATALOG-WORK:work-a"]);
assert.equal(result.editionApprovals[1].masterSha256, "a".repeat(64));
console.log("daily music metal offer registration validation: PASS");
