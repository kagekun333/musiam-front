import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readiness = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip/daily-music-offer-readiness-DMW-20260805-7D.json"), "utf8"));

assert.equal(readiness.waveId, "DMW-20260805-7D");
assert.equal(readiness.counts.works, 7);
assert.equal(readiness.items.length, 7);
assert.equal(new Set(readiness.items.map((item) => item.workId)).size, 7);
assert.equal(new Set(readiness.items.map((item) => item.editionId)).size, 7);
for (const item of readiness.items) {
  assert.equal(item.amountJpy, 330_000);
  assert.equal(item.editionSize, 3);
  assert.equal(item.sourcePreview.printMasterEligible, false);
  if (item.mechanicallyEligible) {
    assert.match(item.master.sha256, /^[a-f0-9]{64}$/);
    assert.equal(item.master.format, "tiff");
    assert.equal(item.master.width, 3000);
    assert.equal(item.master.height, 3000);
    assert.equal(item.master.hasAlpha, false);
    assert.equal(item.approvalToken, `APPROVE_METAL_PRINT_OFFER:${item.editionId}:330000`);
  } else {
    assert.equal(item.approvalToken, null, "No approval token may be requested before master eligibility");
  }
}
assert.equal(readiness.counts.mechanicallyEligible, readiness.items.filter((item) => item.mechanicallyEligible).length);
assert.equal(readiness.counts.potentialUnitsAfterApproval, 21);
assert.equal(readiness.counts.potentialGrossYenAfterApproval, 6_930_000);
console.log("daily music metal offer readiness validation: PASS");
