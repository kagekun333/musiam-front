import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const input = "ops/audience-engine/daily-music-release-candidates/DMW-20260805-7D--manifest.json";
const runAt = (now, manifestPath = input) => {
  const run = spawnSync(process.execPath, [
    "scripts/build-daily-music-publication-queue.mjs",
    `--input=${manifestPath}`,
    `--now=${now}`,
  ], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout);
};

const before = runAt("2026-08-05T03:14:59.000Z");
assert.equal(before.summary.executable, 0, "future placement became executable");

const first = runAt("2026-08-05T03:15:00.000Z");
const youtubeCapability = JSON.parse(fs.readFileSync("ops/audience-engine/youtube-channel-capabilities.json", "utf8"));
const expectedFirstExecutable = first.rows
  .filter((row) => row.due && row.ingressReady && row.channelCapabilityReady && row.publicationState !== "PUBLISHED")
  .map((row) => row.placementId);
assert.deepEqual(first.executablePlacementIds, expectedFirstExecutable);
assert.equal(first.rows.filter((row) => Date.parse(row.scheduledAt) <= Date.parse("2026-08-05T03:15:00.000Z")).length, 4);
assert.equal(first.summary.blockedDue, first.rows.filter((row) => row.due && !row.executable).length);
assert.ok(first.rows.find((row) => row.platform === "instagram").reasons.includes("LINK_STICKER_REQUIRED_FOR_CLICKABLE_PATH"));
assert.ok(first.rows.find((row) => row.platform === "tiktok").reasons.includes("CLICKABLE_LINK_CAPABILITY_REQUIRED"));
const firstYoutube = first.rows.find((row) => row.platform === "youtube");
assert.equal(firstYoutube.publicationFormat, "LONG_FORM_16_9");
assert.equal(firstYoutube.ingressStatus, "READY");
assert.equal(firstYoutube.channelCapabilityReady, youtubeCapability.externalLinksClickable === true);
assert.equal(firstYoutube.executable, youtubeCapability.externalLinksClickable === true);
if (!youtubeCapability.externalLinksClickable) assert.ok(firstYoutube.reasons.includes("CHANNEL_EXTERNAL_LINK_VERIFICATION_REQUIRED"));
assert.equal(firstYoutube.publicationRequirements.descriptionLinkClickable, true);
assert.equal(firstYoutube.publicationRequirements.exactDescriptionChatUrl, firstYoutube.chatUrl);

const completeWindow = runAt("2026-08-12T03:15:00.000Z");
const expectedCompleteEligible = completeWindow.rows.filter((row) => row.ingressReady && row.channelCapabilityReady).length;
assert.equal(completeWindow.summary.executable + completeWindow.summary.published, expectedCompleteEligible);
assert.ok(completeWindow.rows.every((row) => row.mediaHashMatches), "approved media hash mismatch");

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "dmw-publication-queue-"));
try {
  const manifest = JSON.parse(fs.readFileSync(input, "utf8"));
  for (const release of manifest.releases) {
    const copiedCandidatePath = path.join(temp, path.basename(release.candidatePath));
    fs.copyFileSync(path.resolve(release.candidatePath), copiedCandidatePath);
    release.candidatePath = copiedCandidatePath;
  }
  const firstCandidate = JSON.parse(fs.readFileSync(manifest.releases[0].candidatePath, "utf8"));
  const threads = firstCandidate.placements.find((item) => item.platform === "threads");
  const originalCover = path.join(process.cwd(), "public", threads.media.path.replace(/^\/+/, ""));
  const tamperedCover = path.join(temp, "tampered-cover.jpg");
  fs.writeFileSync(tamperedCover, Buffer.concat([fs.readFileSync(originalCover), Buffer.from([0])]));
  threads.media.path = tamperedCover;
  threads.media.kind = "vertical_video";
  fs.writeFileSync(manifest.releases[0].candidatePath, `${JSON.stringify(firstCandidate, null, 2)}\n`);
  const fixturePath = path.join(temp, "manifest.json");
  fs.writeFileSync(fixturePath, `${JSON.stringify(manifest, null, 2)}\n`);
  const tampered = runAt("2026-08-05T03:15:00.000Z", fixturePath);
  const tamperedThread = tampered.rows.find((row) => row.placementId === threads.placementId);
  assert.equal(tamperedThread.executable, false, "changed media became executable");
  assert.ok(tamperedThread.reasons.includes("MEDIA_HASH_MISMATCH"));
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
console.log("daily music publication queue: PASS — only due approved READY-ingress placements with exact media hashes become executable");
