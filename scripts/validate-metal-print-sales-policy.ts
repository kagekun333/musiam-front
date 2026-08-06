import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const policy = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip/autonomous-sales-policy.json"), "utf8"));

assert.equal(policy.monthlyRevenueTargetJpy, 3_000_000);
assert.equal(policy.quotaControl.primaryPriceJpy * policy.quotaControl.minimumMonthlyOrdersAtPrimaryPrice, 3_300_000);
assert.ok(policy.quotaControl.primaryPriceJpy * policy.quotaControl.minimumMonthlyOrdersAtPrimaryPrice >= policy.monthlyRevenueTargetJpy);
assert.match(policy.externalGates.customerOutreach, /^AUTHORIZED_BY_OWNER_/);
assert.equal(policy.externalGates.paidVendorOrder, "HOLD_UNTIL_QUOTE_AND_PROOF_APPROVAL");
assert.ok(policy.quotaControl.qualifiedPipelineCoverageMultiple >= 10);
assert.ok(policy.quotaControl.stopIfContributionMarginBelow >= 0.6);
assert.equal(policy.weeklyMission.qualifiedVisitors * 4, 20_000);
assert.equal(policy.weeklyMission.paidOrders * 4, 10);

console.log("metal-print sales policy validation: PASS");
