import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ledger = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip/vendor-evidence-ledger.json"), "utf8"));
const assurance = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip/assurance.json"), "utf8"));

assert.equal(ledger.schemaVersion, 1);
assert.equal(new Set(ledger.vendors.map((vendor: { id: string }) => vendor.id)).size, ledger.vendors.length);
assert.ok(ledger.policy.comparableQuoteRequires.includes("shippingByRegion"));
assert.ok(ledger.policy.comparableQuoteRequires.includes("damageReprintPolicy"));

for (const vendor of ledger.vendors) {
  if (vendor.lastOutboundAt === null) {
    assert.ok(
      ["selfServicePlatform", "selfServiceOrderForm"].includes(vendor.channel),
      `${vendor.id}: only self-service vendors may omit outbound timestamp`,
    );
    assert.equal(vendor.followUpNotBefore, null, `${vendor.id}: follow-up must be null without outbound`);
  } else {
    assert.ok(Number.isFinite(Date.parse(vendor.lastOutboundAt)), `${vendor.id}: invalid outbound timestamp`);
    assert.ok(Number.isFinite(Date.parse(vendor.followUpNotBefore)), `${vendor.id}: invalid follow-up timestamp`);
    assert.ok(Date.parse(vendor.followUpNotBefore) > Date.parse(vendor.lastOutboundAt), `${vendor.id}: follow-up must be later than outbound`);
  }
  if (vendor.comparableQuote) {
    for (const field of ledger.policy.comparableQuoteRequires) {
      assert.ok(vendor.writtenAnswerFields.includes(field), `${vendor.id}: quote missing ${field}`);
    }
  }
  if (vendor.partnershipApproved) {
    assert.equal(vendor.comparableQuote, true, `${vendor.id}: partnership requires comparable quote`);
    for (const field of ledger.policy.partnershipRequires) {
      assert.ok(vendor.writtenAnswerFields.includes(field), `${vendor.id}: partnership missing ${field}`);
    }
  }
}

const comparableQuoteCount = ledger.vendors.filter((vendor: { comparableQuote: boolean }) => vendor.comparableQuote).length;
assert.equal(assurance.supply.vendorQuotesComparable, comparableQuoteCount, "assurance quote count must match evidence ledger");
console.log(`metal-print vendor evidence validation PASS (${comparableQuoteCount} comparable quotes)`);
