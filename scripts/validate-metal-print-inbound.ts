import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { METAL_PRINT_VIP_EDITIONS } from "../src/lib/metal-print-vip";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const page = fs.readFileSync(path.join(root, "src/app/metal-print/[slug]/page.tsx"), "utf8");
const sitemap = fs.readFileSync(path.join(root, "src/app/sitemap.ts"), "utf8");
const workPage = fs.readFileSync(path.join(root, "src/app/works/[id]/page.tsx"), "utf8");
const worksIndex = fs.readFileSync(path.join(root, "src/app/works/page.tsx"), "utf8");
const officeArt = fs.readFileSync(path.join(root, "src/app/office-art/page.tsx"), "utf8");
const shopConfig = fs.readFileSync(path.join(root, "src/lib/shop-config.ts"), "utf8");
const shopBuyButton = fs.readFileSync(path.join(root, "src/app/shop/BuyButton.tsx"), "utf8");
const realmHome = fs.readFileSync(path.join(root, "src/components/realm/RealmHome.tsx"), "utf8");
const lettersIndex = fs.readFileSync(path.join(root, "src/app/letters/page.tsx"), "utf8");
const letterPage = fs.readFileSync(path.join(root, "src/app/letters/[slug]/page.tsx"), "utf8");
const letterCta = fs.readFileSync(path.join(root, "src/components/letters/MetalPrintLetterCta.tsx"), "utf8");
const chatPage = fs.readFileSync(path.join(root, "src/pages/chat.tsx"), "utf8");

assert.equal(METAL_PRINT_VIP_EDITIONS.length, 4);
assert.equal(new Set(METAL_PRINT_VIP_EDITIONS.map(({ slug }) => slug)).size, 4);

for (const edition of METAL_PRINT_VIP_EDITIONS) {
  assert.ok(edition.slug.length >= 8, `${edition.title}: SEO slug missing`);
  assert.ok(edition.searchTitle.length >= 20, `${edition.title}: search title too short`);
  assert.ok(edition.searchDescription.length >= 45, `${edition.title}: description too short`);
  assert.ok(edition.keywords.length >= 5, `${edition.title}: insufficient keywords`);
  assert.ok(edition.spaceDescription.length >= 40, `${edition.title}: space positioning missing`);
  assert.equal(edition.format.widthMm, 600, `${edition.title}: signature width must be 600mm`);
  assert.equal(edition.format.heightMm, 600, `${edition.title}: signature height must be 600mm`);
  assert.equal(edition.format.editionSize, 3, `${edition.title}: edition size must remain 3`);
  assert.ok(["home", "office", "hotel", "wellness"].includes(edition.spaceSegment), `${edition.title}: space segment missing`);
}

assert.ok(page.includes("generateStaticParams"), "edition routes are not statically generated");
assert.ok(page.includes("robots: { index: true, follow: true }"), "edition routes are not indexable");
assert.ok(page.includes("VisualArtwork"), "structured data missing");
assert.ok(page.includes('value: edition.format.widthMm'), "structured artwork width missing");
assert.ok(page.includes('¥330,000'), "collector price missing from edition page");
assert.ok(page.includes("/chat?intent=metal-print&work="), "work-specific chat route missing");
assert.ok(page.match(/<MetalPrintChatCta/g)?.length === 2, "primary CTA must be repeated exactly twice");
assert.ok(sitemap.includes("METAL_PRINT_VIP_EDITIONS.map"), "edition pages missing from sitemap");
assert.ok(workPage.includes("METAL_PRINT_VIP_EDITIONS.find"), "catalog work pages do not discover matching Editions");
assert.ok(workPage.includes("utm_campaign=catalog_to_metal"), "catalog-to-Dossier attribution missing");
assert.ok(workPage.includes("この作品のCollector Dossierを見る"), "contextual Dossier CTA missing");
assert.ok(worksIndex.includes("utm_source=works_index"), "works index owned-source attribution missing");
assert.ok(worksIndex.includes("utm_campaign=all_catalog_metal"), "works index all-catalog campaign missing");
assert.ok(worksIndex.includes("/chat?intent=metal-print"), "works index must route directly to metal-print chat");
assert.ok(worksIndex.includes("すべての作品を受注生産メタルプリントの相談対象"), "works index all-catalog promise missing");
assert.ok(worksIndex.includes("原画解像度・印刷適性・配送条件を確認後"), "works index controlled Offer copy missing");
assert.ok(workPage.includes("utm_campaign=all_catalog_metal"), "work detail all-catalog campaign missing");
assert.ok(workPage.includes("workId=${encodeURIComponent(String(work.id))}"), "work-specific consultation context missing");
assert.ok(workPage.includes("全作品を受注生産の相談対象として公開"), "generic work consultation promise missing");
assert.ok(officeArt.includes("METAL_PRINT_VIP_PRICE_POLICY.anchorYen"), "office art price must use the VIP policy");
assert.ok(officeArt.includes("60 × 60cm"), "office art signature format missing");
assert.ok(officeArt.includes("Edition of 3"), "office art edition limit missing");
assert.ok(officeArt.includes("utm_source=office_art"), "office art attribution missing");
assert.ok(officeArt.includes("/chat?intent=metal-print"), "office art must route to metal-print chat");
assert.ok(!officeArt.includes("¥69,800"), "legacy low-price office offer must not return");
assert.ok(!officeArt.includes("¥98,000"), "legacy low-price office offer must not return");
assert.ok(!officeArt.includes("ContactCTA"), "office art must not bypass the tracked chat funnel");
assert.ok(shopConfig.includes('price: 330000'), "shop metal-print price must match the VIP anchor");
assert.ok(shopConfig.includes('inquiryHref: "/chat?intent=metal-print'), "shop metal-print must route to tracked chat");
assert.ok(shopConfig.includes('utm_source=shop'), "shop metal-print attribution missing");
const metalPrintShopEntries = [...shopConfig.matchAll(/id: "metal-print-[^"]+"[\s\S]*?(?=\n  \{\n|\n\];)/g)].map((match) => match[0]);
assert.ok(metalPrintShopEntries.length >= 1, "shop must expose at least one metal-print entry");
assert.equal(
  metalPrintShopEntries.filter((entry) => entry.includes("priceTbd: true")).length,
  metalPrintShopEntries.length - 1,
  "shop must keep exactly one formal-price metal-print Offer; every additional tier must remain consultation-only until approved",
);
assert.ok(!shopConfig.includes("¥39,800"), "legacy A3 metal-print price must not return");
assert.ok(!shopConfig.includes("¥69,800"), "legacy A2 metal-print price must not return");
assert.ok(!shopConfig.includes("¥98,000"), "legacy A1 metal-print price must not return");
assert.ok(shopBuyButton.includes("product.inquiryHref"), "shop custom inquiry route is not rendered");
assert.ok(realmHome.includes("utm_source=home&utm_medium=owned&utm_campaign=metal_print_inbound&utm_content=realm_gate"), "home gate metal-print attribution missing");
assert.ok(realmHome.includes("utm_source=home&utm_medium=owned&utm_campaign=metal_print_inbound&utm_content=home_quicklink"), "home quicklink metal-print attribution missing");
assert.ok(lettersIndex.includes('MetalPrintLetterCta placement="letters_index"'), "letters index metal-print CTA missing");
assert.ok(letterPage.includes('MetalPrintLetterCta placement="letter_end"'), "letter detail metal-print CTA missing");
assert.ok(letterCta.includes("utm_source=letters&utm_medium=owned&utm_campaign=editorial_to_metal"), "letters-to-Dossier attribution missing");
assert.ok(letterCta.includes("/chat?intent=metal-print"), "letters CTA does not reach metal-print chat");
assert.ok(chatPage.includes("metalPrintEntryGuide"), "metal-print Chat entry must explain the one-question consultation before the generic conversation");
assert.ok(chatPage.includes("部屋の用途・光・残したい感情"), "metal-print Chat entry is missing the concrete first-message prompt");
assert.ok(chatPage.includes("合わなければ勧めません"), "metal-print Chat entry is missing the no-pressure truth boundary");
assert.ok(chatPage.includes("夕方に西日が入る書斎です"), "metal-print Chat input is missing a concrete response example");

console.log("metal-print inbound validation: PASS — 4 SEO pages, owned-media Chat CTA, and one-question metal-print entry guide");
