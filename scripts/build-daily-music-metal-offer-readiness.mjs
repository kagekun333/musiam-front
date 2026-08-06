import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wavePath = path.join(root, "ops/audience-engine/daily-music-release-candidates/DMW-20260805-7D--manifest.json");
const outputPath = path.join(root, "ops/metal-print-vip/daily-music-offer-readiness-DMW-20260805-7D.json");
const masterDir = path.join(root, "ops/metal-print-vip/proof-assets/daily-music-candidates");
const PRICE_YEN = 330_000;
const EDITION_SIZE = 3;

const sha256 = (filePath) => crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const wave = JSON.parse(fs.readFileSync(wavePath, "utf8"));

const releases = Array.isArray(wave.releases)
  ? wave.releases.map((entry) => entry.work
    ? entry
    : JSON.parse(fs.readFileSync(path.join(root, entry.candidatePath), "utf8")))
  : (wave.candidatePaths ?? []).map((candidatePath) => JSON.parse(fs.readFileSync(path.join(root, candidatePath), "utf8")));

if (releases.length !== 7) throw new Error(`Expected 7 daily releases, found ${releases.length}`);

const items = [];
for (const release of releases) {
  const work = release.work;
  if (!work?.id || !work?.title || !work?.cover) throw new Error("Daily release is missing work identity");
  // Keep the same identity from Chat through consultation, approval, Stripe and serial inventory.
  const editionId = `CATALOG-WORK:${work.id}`;
  const sourcePreviewPath = path.join(root, "public", work.cover.replace(/^\//, ""));
  const masterPath = path.join(masterDir, `${work.id}-whitewall-3000x3000.tiff`);
  const previewMetadata = fs.existsSync(sourcePreviewPath) ? await sharp(sourcePreviewPath).metadata() : null;
  let master = null;
  let eligible = false;
  let blocker = "PRINT_MASTER_MISSING";
  if (fs.existsSync(masterPath)) {
    const metadata = await sharp(masterPath).metadata();
    eligible = metadata.format === "tiff" && metadata.width === 3000 && metadata.height === 3000 && !metadata.hasAlpha;
    blocker = eligible ? null : "PRINT_MASTER_MECHANICAL_PREFLIGHT_FAILED";
    master = {
      relativePath: path.relative(root, masterPath),
      sha256: sha256(masterPath),
      format: metadata.format ?? null,
      width: metadata.width ?? null,
      height: metadata.height ?? null,
      hasAlpha: Boolean(metadata.hasAlpha),
    };
  }
  items.push({
    releaseDate: release.releaseDate,
    workId: work.id,
    workTitle: work.title,
    editionId,
    amountJpy: PRICE_YEN,
    editionSize: EDITION_SIZE,
    sourcePreview: {
      relativePath: path.relative(root, sourcePreviewPath),
      exists: fs.existsSync(sourcePreviewPath),
      sha256: fs.existsSync(sourcePreviewPath) ? sha256(sourcePreviewPath) : null,
      width: previewMetadata?.width ?? null,
      height: previewMetadata?.height ?? null,
      printMasterEligible: false,
      boundary: "A 640px streaming cover is a web preview, not a 600mm print master.",
    },
    master,
    mechanicallyEligible: eligible,
    blocker,
    approvalToken: eligible ? `APPROVE_METAL_PRINT_OFFER:${editionId}:${PRICE_YEN}` : null,
  });
}

const eligibleItems = items.filter((item) => item.mechanicallyEligible);
const result = {
  schemaVersion: 1,
  waveId: "DMW-20260805-7D",
  generatedAt: new Date().toISOString(),
  status: eligibleItems.length === items.length ? "HUMAN_APPROVAL_REQUIRED" : "PRINT_MASTERS_REQUIRED",
  offerContract: { currency: "jpy", amountJpy: PRICE_YEN, editionSize: EDITION_SIZE, vendor: "whitewall-jp", formatMm: "600x600" },
  counts: {
    works: items.length,
    mechanicallyEligible: eligibleItems.length,
    missingOrInvalidMasters: items.length - eligibleItems.length,
    potentialUnitsAfterApproval: items.length * EDITION_SIZE,
    potentialGrossYenAfterApproval: items.length * EDITION_SIZE * PRICE_YEN,
  },
  items,
  nextGate: eligibleItems.length === items.length
    ? "Obtain every exact approvalToken, then register hash-bound offers without altering existing approvals."
    : `Provide exact 3000x3000 non-alpha print masters at ${path.relative(root, masterDir)}/; do not upscale 640px previews and call them masters.`,
  evidenceBoundary: "This readiness file does not approve an Offer, physical print quality, vendor payment, demand, sale, fulfillment or revenue.",
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
