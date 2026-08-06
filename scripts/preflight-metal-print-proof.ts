import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const statePath = path.join(root, "ops/metal-print-vip/state.json");
const reportPath = path.join(root, "ops/metal-print-vip/proof-preflight-state-2026-07-20.json");
const state = JSON.parse(fs.readFileSync(statePath, "utf8"));

function sha256(filePath: string) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function sipsMetadata(filePath: string) {
  const output = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", "-g", "format", "-g", "space", "-g", "dpiWidth", "-g", "dpiHeight", "-g", "hasAlpha", filePath], { encoding: "utf8" });
  const values = Object.fromEntries(output.split("\n").flatMap((line) => {
    const match = line.match(/^\s{2}([^:]+):\s*(.+)$/);
    return match ? [[match[1], match[2]]] : [];
  }));
  return {
    width: Number(values.pixelWidth),
    height: Number(values.pixelHeight),
    format: values.format ?? "unknown",
    colorSpace: values.space ?? "unknown",
    dpiWidth: Number(values.dpiWidth),
    dpiHeight: Number(values.dpiHeight),
    hasAlpha: values.hasAlpha === "yes",
  };
}

const items = (state.editionLocks as { editionId: string; workTitle: string; sourceAssetPath: string; salePermissionStatus: string }[]).map((lock) => {
  if (!fs.existsSync(lock.sourceAssetPath)) {
    return { ...lock, status: "SOURCE_UNAVAILABLE", blockers: ["source volume is not mounted"] };
  }
  const metadata = sipsMetadata(lock.sourceAssetPath);
  const longSide = Math.max(metadata.width, metadata.height);
  const shortSide = Math.min(metadata.width, metadata.height);
  const blockers: string[] = [];
  if (longSide < 3000 || shortSide < 3000) blockers.push("below provisional 3000x3000 minimum");
  if (!/rgb/i.test(metadata.colorSpace)) blockers.push("RGB color space not confirmed");
  if (metadata.hasAlpha) blockers.push("alpha channel must be flattened per vendor specification");
  return {
    ...lock,
    status: blockers.length ? "REVISE" : "CANDIDATE_MASTER_PASS",
    bytes: fs.statSync(lock.sourceAssetPath).size,
    sha256: sha256(lock.sourceAssetPath),
    metadata,
    blockers,
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  sourceMountPath: state.assetReadiness.sourceMountPath,
  sourceMountAvailable: fs.existsSync(state.assetReadiness.sourceMountPath),
  proofReadyCount: items.filter((item) => item.status === "CANDIDATE_MASTER_PASS").length,
  unavailableCount: items.filter((item) => item.status === "SOURCE_UNAVAILABLE").length,
  items,
  note: "Candidate-master preflight only. Vendor ICC/file specification and physical proof remain authoritative.",
};

fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.sourceMountAvailable || report.proofReadyCount !== items.length) process.exitCode = 2;
