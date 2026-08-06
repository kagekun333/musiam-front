import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const inputPath = process.argv.find((arg) => arg.startsWith("--input="))?.slice("--input=".length);
const outputPath = process.argv.find((arg) => arg.startsWith("--output="))?.slice("--output=".length);
if (!inputPath) throw new Error("usage: node scripts/validate-daily-music-release-wave.mjs --input=<manifest.json>");
const manifest = JSON.parse(fs.readFileSync(inputPath, "utf8"));
assert.equal(manifest.releases.length, manifest.days);
assert.equal(new Set(manifest.releases.map((item) => item.workId)).size, manifest.days, "wave repeats a work");
assert.equal(new Set(manifest.releases.map((item) => item.date)).size, manifest.days, "wave repeats a date");
assert.ok(["HUMAN_APPROVAL_REQUIRED", "APPROVED_WAITING_SCHEDULE"].includes(manifest.publicationState));
assert.equal(manifest.externalPublicationPerformed, false);
assert.equal(manifest.batchApprovalToken, `APPROVE_DAILY_MUSIC_WAVE:${manifest.waveId}`);

let placementCount = 0;
const readiness = [];
for (const release of manifest.releases) {
  assert.equal(release.scheduledAt, `${release.date}T03:15:00.000Z`, `${release.releaseId}: schedule must be 12:15 JST`);
  const pack = JSON.parse(fs.readFileSync(release.candidatePath, "utf8"));
  assert.equal(pack.work.id, release.workId);
  assert.equal(pack.releaseDate, release.date);
  assert.equal(pack.placements.length, 4);
  assert.equal(new Set(pack.placements.map((item) => item.copy.split("\n\n伯爵Chat:")[0])).size, 4, `${release.releaseId}: platform copy is duplicated`);
  assert.doesNotMatch(pack.placements.map((item) => item.copy).join("\n"), /新曲|new release/i, "historical catalog work is described as a new release");
  assert.doesNotMatch(pack.placements.map((item) => item.copy).join("\n"), /作品を飾る|33万円|限定3|購入してください/, "social discovery copy contains a sales pitch");
  const allowedPlacementStates = manifest.publicationState === "APPROVED_WAITING_SCHEDULE"
    ? ["APPROVED_WAITING_SCHEDULE", "PUBLISHED"]
    : ["HUMAN_APPROVAL_REQUIRED"];
  assert.ok(pack.placements.every((item) => allowedPlacementStates.includes(item.publicationState)));
  assert.ok(pack.placements.every((item) => new URL(item.chatUrl).searchParams.get("workId") === release.workId));
  for (const placement of pack.placements) {
    assert.equal(placement.scheduledAt, release.scheduledAt, `${placement.placementId}: schedule mismatch`);
    const coverReady = placement.media?.kind === "cover_image"
      && placement.media?.status === "COVER_READY"
      && fs.existsSync(path.join(process.cwd(), "public", String(placement.media.path || "").replace(/^\/+/, "")));
    const videoReady = ["vertical_video", "long_form_video"].includes(placement.media?.kind)
      && placement.media?.status === "READY"
      && Boolean(placement.media?.path)
      && fs.existsSync(path.resolve(placement.media.path));
    const mediaReady = coverReady || videoReady;
    const ingressReady = placement.ingress?.status === "READY";
    readiness.push({
      placementId: placement.placementId,
      platform: placement.platform,
      mediaReady,
      mediaStatus: placement.media?.status ?? "MISSING",
      ingressReady,
      ingressStatus: placement.ingress?.status ?? "MISSING",
      approvalReady: placement.publicationState !== "HUMAN_APPROVAL_REQUIRED",
      publicationState: placement.publicationState,
      publicationEligible: mediaReady && ingressReady && placement.publicationState === "APPROVED_WAITING_SCHEDULE",
    });
  }
  placementCount += pack.placements.length;
}
assert.equal(placementCount, manifest.days * 4);
const result = {
  status: "PASS",
  waveId: manifest.waveId,
  releases: manifest.days,
  placements: placementCount,
  uniqueWorks: manifest.days,
  readiness: {
    mediaReady: readiness.filter((item) => item.mediaReady).length,
    ingressReady: readiness.filter((item) => item.ingressReady).length,
    approvalReady: readiness.filter((item) => item.approvalReady).length,
    publicationEligible: readiness.filter((item) => item.publicationEligible).length,
    mediaBlockedPlacementIds: readiness.filter((item) => !item.mediaReady).map((item) => item.placementId),
    platformStepPlacementIds: readiness.filter((item) => item.mediaReady && !item.ingressReady).map((item) => item.placementId),
    approvalBlockedPlacementIds: readiness.filter((item) => !item.approvalReady).map((item) => item.placementId),
  },
  externalPublicationPerformed: readiness.some((item) => item.publicationState === "PUBLISHED"),
  evidenceBoundary: "Routing validation PASS does not mean publication eligibility. Eligibility requires media, ingress capability and Human approval for the same placement.",
};
if (outputPath) fs.writeFileSync(path.resolve(outputPath), `${JSON.stringify(result, null, 2)}\n`, { flag: "w" });
console.log(JSON.stringify(result, null, 2));
