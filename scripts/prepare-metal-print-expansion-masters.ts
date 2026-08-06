import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const evidencePath = path.join(root, "ops/metal-print-vip/proof-preflight-state-2026-07-20.json");
const outputDir = path.join(root, "ops/metal-print-vip/proof-assets/expansion-candidates");
const manifestPath = path.join(root, "ops/metal-print-vip/expansion-master-manifest.json");
const state = JSON.parse(fs.readFileSync(evidencePath, "utf8"));

async function main() {
const requestedEditionIds = new Set([
  "VIP-METAL-2026-07-IGNITION",
  "VIP-METAL-2026-07-HOME",
  "VIP-METAL-2026-07-BALIAN",
]);
const items = state.items.filter((item: { editionId: string }) => requestedEditionIds.has(item.editionId));
if (items.length !== requestedEditionIds.size) throw new Error("Historical preflight evidence does not contain all expansion Editions");

const hashFile = (filePath: string) => crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const slug = (editionId: string) => editionId.toLowerCase().replace(/^vip-metal-2026-07-/, "");

const unavailable = items.filter((item: { sourceAssetPath: string }) => !fs.existsSync(item.sourceAssetPath));
if (unavailable.length > 0) {
  console.error(JSON.stringify({
    status: "SOURCE_MOUNT_REQUIRED",
    unavailable: unavailable.map((item: { editionId: string; sourceAssetPath: string }) => ({ editionId: item.editionId, sourceAssetPath: item.sourceAssetPath })),
    safety: "No output files were written.",
  }, null, 2));
  process.exit(2);
}

// Validate every source before writing anything so a partial mount or changed source cannot produce a mixed set.
for (const item of items) {
  const actualHash = hashFile(item.sourceAssetPath);
  if (actualHash !== item.sha256) throw new Error(`${item.editionId} source hash changed: expected ${item.sha256}, got ${actualHash}`);
  const metadata = await sharp(item.sourceAssetPath).metadata();
  if (metadata.width !== 3000 || metadata.height !== 3000) throw new Error(`${item.editionId} source is not 3000x3000`);
  if (metadata.hasAlpha) throw new Error(`${item.editionId} source unexpectedly has alpha`);
}

fs.mkdirSync(outputDir, { recursive: true });
const stagingDirectory = path.join(outputDir, `.batch-${process.pid}`);
fs.mkdirSync(stagingDirectory, { recursive: false });
const staged = [];
try {
  // Render and validate the complete set in an isolated batch before exposing any new final candidate.
  for (const item of items) {
    const fileName = `${slug(item.editionId)}-whitewall-3000x3000.tiff`;
    const stagedPath = path.join(stagingDirectory, fileName);
    const finalPath = path.join(outputDir, fileName);
    await sharp(item.sourceAssetPath)
      .removeAlpha()
      .toColourspace("srgb")
      .tiff({ compression: "lzw", bitdepth: 8 })
      .toFile(stagedPath);
    const metadata = await sharp(stagedPath).metadata();
    if (metadata.width !== 3000 || metadata.height !== 3000 || metadata.hasAlpha || metadata.format !== "tiff") {
      throw new Error(`${item.editionId} generated TIFF failed mechanical validation`);
    }
    const stagedSha256 = hashFile(stagedPath);
    if (fs.existsSync(finalPath) && hashFile(finalPath) !== stagedSha256) {
      throw new Error(`${finalPath} already exists with different content; refusing overwrite`);
    }
    staged.push({ item, stagedPath, finalPath, stagedSha256 });
  }

  // Commit only matching/restart-safe files. A later restart reuses any identical file already committed.
  for (const candidate of staged) {
    if (fs.existsSync(candidate.finalPath)) fs.unlinkSync(candidate.stagedPath);
    else fs.renameSync(candidate.stagedPath, candidate.finalPath);
  }
} finally {
  fs.rmSync(stagingDirectory, { recursive: true, force: true });
}

const outputs = staged.map(({ item, finalPath }) => ({
  editionId: item.editionId,
  sourceAssetPath: item.sourceAssetPath,
  sourceSha256: item.sha256,
  outputRelativePath: path.relative(root, finalPath),
  outputSha256: hashFile(finalPath),
  bytes: fs.statSync(finalPath).size,
  dimensionsPx: "3000x3000",
  format: "tiff",
  colorSpace: "srgb",
  hasAlpha: false,
  status: "DIGITAL_MASTER_CANDIDATE_PHYSICAL_PROOF_REQUIRED",
}));

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  evidenceClass: "SOURCE_HASH_MATCHED_DIGITAL_MASTER_CANDIDATES",
  outputs,
  approvalBoundary: "Candidate TIFF generation does not activate an Offer or approve physical print quality.",
};
if (fs.existsSync(manifestPath)) {
  const existing = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (JSON.stringify(existing.outputs) !== JSON.stringify(outputs)) {
    throw new Error("Expansion master manifest already exists with different output evidence; refusing overwrite");
  }
} else {
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
}
console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
