import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { METAL_PRINT_VIP_EDITIONS } from "../src/lib/metal-print-vip";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const englishPage = fs.readFileSync(path.join(root, "src/app/en/metal-print/[slug]/page.tsx"), "utf8");
const japanesePage = fs.readFileSync(path.join(root, "src/app/metal-print/[slug]/page.tsx"), "utf8");
const sitemap = fs.readFileSync(path.join(root, "src/app/sitemap.ts"), "utf8");

assert.equal(METAL_PRINT_VIP_EDITIONS.length, 4);
for (const edition of METAL_PRINT_VIP_EDITIONS) {
  assert.ok(edition.en.searchTitle.length >= 35 && edition.en.searchTitle.length <= 70, `${edition.id}: English title length`);
  assert.ok(edition.en.searchDescription.length >= 100 && edition.en.searchDescription.length <= 180, `${edition.id}: English description length`);
  assert.ok(edition.en.collectorPromise && edition.en.spaceDescription && edition.en.story, `${edition.id}: English sales narrative incomplete`);
  assert.ok(edition.en.keywords.length >= 5, `${edition.id}: English keywords incomplete`);
}
for (const source of [englishPage, japanesePage]) {
  assert.ok(source.includes('languages: { ja:'), "JP/EN alternate links missing");
  assert.ok(source.includes('"x-default"'), "x-default alternate missing");
  assert.ok(source.includes('"@type": "VisualArtwork"'), "VisualArtwork schema missing");
}
assert.ok(englishPage.includes('lang="en"'), "English content language marker missing");
assert.ok(englishPage.includes("physical print proof has been accepted"), "proof-first truth boundary missing in English");
assert.ok(englishPage.includes("destination terms confirmed before Offer"), "destination pricing boundary missing in English");
assert.ok(englishPage.includes("MetalPrintDossierView") && englishPage.includes("MetalPrintChatCta"), "English first-party funnel missing");
assert.ok(sitemap.includes("englishMetalPrintRoutes"), "English Edition routes missing from sitemap");

console.log("metal-print global SEO: PASS — 4 English Edition pages, hreflang, schema, sitemap, proof-first Chat funnel");
