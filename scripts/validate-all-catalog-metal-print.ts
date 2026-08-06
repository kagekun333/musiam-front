import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import worksCatalog from "../public/works/works.json";
import {
  getCatalogMetalPrintEditionId,
  METAL_PRINT_CATALOG_EDITIONS,
  METAL_PRINT_FEATURED_EDITIONS,
  METAL_PRINT_TOTAL_EDITION_COUNT,
} from "../src/lib/metal-print-vip";
import { getApprovedMetalPrintOffer, getMetalPrintApprovedOfferCapacity } from "../src/lib/metal-print-offers.server";

const works = worksCatalog.items;
assert.equal(works.length, 401, "canonical catalog count changed; review the public sales scope before release");
assert.equal(METAL_PRINT_CATALOG_EDITIONS.length, works.length, "not every canonical work has an Edition");
assert.equal(METAL_PRINT_TOTAL_EDITION_COUNT, works.length + METAL_PRINT_FEATURED_EDITIONS.length);
assert.equal(new Set(METAL_PRINT_CATALOG_EDITIONS.map((edition) => edition.id)).size, works.length, "catalog Edition IDs are not unique");
assert.equal(new Set(METAL_PRINT_CATALOG_EDITIONS.map((edition) => edition.slug)).size, works.length, "catalog Edition slugs are not unique");

for (const work of works) {
  const editionId = getCatalogMetalPrintEditionId(work.id);
  const edition = METAL_PRINT_CATALOG_EDITIONS.find((candidate) => candidate.id === editionId);
  assert.ok(edition, `${work.id}: Edition missing`);
  assert.equal(edition.title, work.title, `${work.id}: title mismatch`);
  assert.equal(edition.cover, work.cover, `${work.id}: cover mismatch`);
  assert.equal(edition.format.editionSize, 3, `${work.id}: Edition must be limited to three`);
  const offer = getApprovedMetalPrintOffer(editionId);
  assert.ok(offer, `${work.id}: formal Offer missing`);
  assert.equal(offer.amountJpy, 330_000, `${work.id}: price mismatch`);
  if (work.cover.startsWith("/")) {
    assert.ok(fs.existsSync(path.join(process.cwd(), "public", work.cover)), `${work.id}: local cover missing`);
  } else {
    assert.match(work.cover, /^https:\/\/(m\.media-amazon\.com|images-na\.ssl-images-amazon\.com)\//, `${work.id}: remote cover host is not approved`);
  }
}

const capacity = getMetalPrintApprovedOfferCapacity();
assert.equal(capacity.approvedEditionIds.length, METAL_PRINT_TOTAL_EDITION_COUNT);
assert.equal(capacity.approvedOfferUnits, METAL_PRINT_TOTAL_EDITION_COUNT * 3);
assert.equal(capacity.maximumApprovedOfferGrossYen, METAL_PRINT_TOTAL_EDITION_COUNT * 3 * 330_000);

const workPage = fs.readFileSync("src/app/works/[id]/page.tsx", "utf8");
const vipPage = fs.readFileSync("src/app/vip-metal-print/page.tsx", "utf8");
const sitemap = fs.readFileSync("src/app/sitemap.ts", "utf8");
assert.ok(workPage.includes("getCatalogMetalPrintEditionId"), "canonical work pages are not bound to their Edition IDs");
assert.ok(vipPage.includes("METAL_PRINT_CATALOG_WORK_COUNT"), "VIP page does not expose all-catalog capacity");
assert.ok(sitemap.includes("METAL_PRINT_VIP_EDITIONS.map"), "metal-print pages are absent from sitemap generation");

console.log(`[validate-all-catalog-metal-print] PASS — catalog=${works.length}, featured=${METAL_PRINT_FEATURED_EDITIONS.length}, formalOffers=${METAL_PRINT_TOTAL_EDITION_COUNT}, units=${capacity.approvedOfferUnits}, grossCap=¥${capacity.maximumApprovedOfferGrossYen.toLocaleString()}`);
