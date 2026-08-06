import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Asset = { id: string; hook: string; caption: string; landingPath: string };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const locale = process.env.METAL_PRINT_CAMPAIGN_LOCALE === "en" ? "en" : "ja";
const pack = JSON.parse(fs.readFileSync(path.join(root, `ops/metal-print-vip/organic-content-pack${locale === "en" ? "-en" : ""}-2026-07.json`), "utf8")) as { defaultCta: string; assets: Asset[] };
const channels = ["instagram", "youtube", "pinterest", "linkedin", "x"] as const;
const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
const rows = [["asset_id", "channel", "visual_path", "tracked_url", "post_copy", "external_post_state"]];

for (const asset of pack.assets) {
  for (const channel of channels) {
    const url = new URL(asset.landingPath, "https://www.hakusyaku.xyz");
    url.searchParams.set("utm_source", channel);
    url.searchParams.set("utm_medium", "organic_social");
    url.searchParams.set("utm_campaign", locale === "en" ? "metal_print_inbound_en" : "metal_print_inbound");
    url.searchParams.set("utm_content", asset.id);
    rows.push([
      asset.id,
      channel,
      `/metal-print-campaign${locale === "en" ? "-en" : ""}/${asset.id.toLowerCase()}.jpg`,
      url.toString(),
      `${asset.hook}\n\n${asset.caption}\n\n${pack.defaultCta}`,
      "HUMAN_APPROVAL_REQUIRED",
    ]);
  }
}

const output = rows.map((row) => row.map(escapeCsv).join(",")).join("\n") + "\n";
fs.writeFileSync(path.join(root, `ops/metal-print-vip/campaign-distribution-plan${locale === "en" ? "-en" : ""}-2026-07.csv`), output);
console.log(`metal-print distribution plan: ${rows.length - 1} tracked placements`);
