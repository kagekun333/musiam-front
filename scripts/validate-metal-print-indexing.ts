import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const key = "dc7d0eb0cdc33a0cb5ca151150e2ea00";
const keyFile = path.join(root, "public", `${key}.txt`);
const jaPage = fs.readFileSync(path.join(root, "src/app/metal-print/[slug]/page.tsx"), "utf8");
const enPage = fs.readFileSync(path.join(root, "src/app/en/metal-print/[slug]/page.tsx"), "utf8");
const offer = fs.readFileSync(path.join(root, "src/lib/metal-print-offers.server.ts"), "utf8");
const submitter = fs.readFileSync(path.join(root, "scripts/submit-metal-print-indexnow.ts"), "utf8");

assert.equal(fs.readFileSync(keyFile, "utf8").trim(), key, "IndexNow key file mismatch");
for (const page of [jaPage, enPage]) {
  assert.ok(page.includes('"@type": "Product"'), "Product structured data missing");
  assert.ok(page.includes('"@type": "Offer"'), "Offer structured data missing");
  assert.ok(page.includes('price: "330000"'), "Offer price mismatch");
  assert.ok(page.includes("edition.id === METAL_PRINT_PUBLIC_OFFER_EDITION_ID"), "Product schema is not restricted to the approved Edition");
}
assert.ok(offer.includes("METAL_PRINT_PUBLIC_OFFER_EDITION_ID"), "runtime Offer and public Product eligibility are not shared");
assert.ok(submitter.includes("https://api.indexnow.org/indexnow"), "official IndexNow endpoint missing");
assert.ok(submitter.includes("urlList.length > 10_000"), "IndexNow batch limit missing");
assert.ok(submitter.includes("HTTP 200/202 proves receipt"), "IndexNow claim boundary missing");

console.log("metal-print indexing validation: PASS — one approved Product Offer, shared eligibility, IndexNow key and bounded submission");
