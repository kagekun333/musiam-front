import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configs = [
  { locale: "ja", pack: "organic-content-pack-2026-07.json", visualDir: "metal-print-campaign" },
  { locale: "en", pack: "organic-content-pack-en-2026-07.json", visualDir: "metal-print-campaign-en" },
] as const;

async function main() {
  for (const config of configs) {
    const pack = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip", config.pack), "utf8"));
    const assets = pack.assets as { id: string; work: string; hook: string; sequence?: string[]; caption: string; landingPath: string }[];
    assert.equal(assets.length, 12);
    assert.equal(new Set(assets.map(({ id }) => id)).size, 12);
    assert.equal(new Set(assets.map(({ work }) => work)).size, 4);
    for (const asset of assets) {
      assert.ok(asset.hook.length >= 15, `${asset.id}: hook too short`);
      if (config.locale === "ja") assert.equal(asset.sequence?.length, 4, `${asset.id}: sequence must have 4 beats`);
      assert.ok(asset.landingPath.startsWith(config.locale === "en" ? "/en/metal-print/" : "/metal-print/"), `${asset.id}: locale landing route mismatch`);
      assert.ok(!/(販売中|即納|品質保証|available now|in stock|guaranteed quality|ships immediately)/i.test(`${asset.hook} ${asset.caption}`), `${asset.id}: proof-before-sales rule violated`);
      const visualPath = path.join(root, "public", config.visualDir, `${asset.id.toLowerCase()}.jpg`);
      assert.ok(fs.existsSync(visualPath), `${asset.id}: visual missing`);
      const metadata = await sharp(visualPath).metadata();
      assert.equal(metadata.width, 1080, `${asset.id}: visual width must be 1080`);
      assert.equal(metadata.height, 1350, `${asset.id}: visual height must be 1350`);
    }
  }

  console.log("metal-print content pack validation: PASS — 24 JA/EN assets / 4 works / 1080x1350 visuals / locale landing routes");
}

void main();
