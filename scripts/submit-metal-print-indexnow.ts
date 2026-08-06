import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLetters } from "../src/lib/letters";
import { METAL_PRINT_VIP_EDITIONS } from "../src/lib/metal-print-vip";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const host = "www.hakusyaku.xyz";
const origin = `https://${host}`;
const key = "dc7d0eb0cdc33a0cb5ca151150e2ea00";
const keyLocation = `${origin}/${key}.txt`;
const outputPath = path.join(root, "ops", "metal-print-vip", "indexnow-submission-evidence.json");

async function main() {
  const letters = await getLetters();
  const paths = [
    "/vip-metal-print",
    "/office-art",
    "/works",
    "/letters",
    ...METAL_PRINT_VIP_EDITIONS.flatMap((edition) => [
      `/metal-print/${edition.slug}`,
      `/en/metal-print/${edition.slug}`,
    ]),
    ...letters.map((letter) => `/letters/${letter.slug}`),
  ];
  const urlList = [...new Set(paths.map((value) => `${origin}${value}`))];
  if (urlList.length > 10_000) throw new Error("IndexNow URL limit exceeded");

  const response = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key, keyLocation, urlList }),
  });
  if (![200, 202].includes(response.status)) throw new Error(`IndexNow rejected submission: HTTP ${response.status}`);

  const report = {
    schemaVersion: 1,
    submittedAt: new Date().toISOString(),
    evidenceClass: "INDEXNOW_PROTOCOL_ACCEPTED",
    endpoint: "https://api.indexnow.org/indexnow",
    host,
    keyLocation,
    httpStatus: response.status,
    urlCount: urlList.length,
    metalPrintUrlCount: 10,
    letterUrlCount: letters.length + 1,
    acceptanceMeaning: "HTTP 200/202 proves receipt or pending key validation, not crawling, indexing, ranking, traffic or demand.",
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "IndexNow submission failed");
  process.exitCode = 1;
});
