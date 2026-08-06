import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packet = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip/natura-first-wave-release.json"), "utf8"));
const offers = fs.readFileSync(path.join(root, "src/lib/metal-print-offers.server.ts"), "utf8");
const vip = fs.readFileSync(path.join(root, "src/lib/metal-print-vip.ts"), "utf8");

assert.ok(["READY_HUMAN_PUBLICATION_GATE", "APPROVED_FOR_PUBLICATION"].includes(packet.status));
assert.equal(packet.offerEditionId, "VIP-METAL-2026-07-NATURA");
assert.equal(packet.assetId, "NATURA-01");
assert.equal(packet.offerPriceJpy, 330000);
assert.equal(packet.editionSize, 3);
assert.equal(packet.spendAuthorizedYen, 0);
assert.ok(offers.includes(`APPROVE_METAL_PRINT_OFFER:${packet.offerEditionId}:${packet.offerPriceJpy}`));
assert.ok(vip.includes(`METAL_PRINT_PUBLIC_OFFER_EDITION_ID = "${packet.offerEditionId}"`));

const expectedChannels = new Set(["instagram", "threads", "tiktok", "youtube"]);
assert.equal(packet.placements.length, expectedChannels.size);
for (const placement of packet.placements) {
  assert.ok(expectedChannels.delete(placement.channel), `unexpected or duplicate channel: ${placement.channel}`);
  assert.equal(placement.approvalToken, `APPROVE_EXTERNAL_POST:${packet.assetId}:${placement.channel}`);
  const url = new URL(placement.trackedUrl);
  assert.equal(url.origin, "https://www.hakusyaku.xyz");
  assert.equal(url.pathname, "/metal-print/deus-sive-natura-wall-art");
  assert.equal(url.searchParams.get("utm_source"), placement.channel);
  assert.equal(url.searchParams.get("utm_medium"), "organic_social");
  assert.equal(url.searchParams.get("utm_campaign"), "metal_print_natura_launch");
  assert.equal(url.searchParams.get("utm_content"), packet.assetId);
}
assert.equal(expectedChannels.size, 0);
assert.ok(fs.existsSync(path.join(root, "public", packet.visualPath)));
assert.ok(packet.truthBoundary.includes("実物proof未承認"));

console.log(JSON.stringify({
  decision: packet.status,
  offerEditionId: packet.offerEditionId,
  assetId: packet.assetId,
  placements: packet.placements.length,
  spendAuthorizedYen: packet.spendAuthorizedYen,
  trackedUrlsUnique: new Set(packet.placements.map((row: { trackedUrl: string }) => row.trackedUrl)).size,
}, null, 2));
