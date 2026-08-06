import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const manifestPath = path.join(root, "ops/audience-engine/daily-music-release-candidates/DMW-20260805-7D--manifest.json");
const candidatePath = path.join(root, "ops/audience-engine/DMW-20260805-instagram-story-approval-candidate.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const sha256 = (filePath) => crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const probe = (filePath) => {
  const result = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", filePath], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || `${filePath}: ffprobe failed`);
  return JSON.parse(result.stdout);
};
const outputs = [];

for (const release of manifest.releases) {
  const pack = JSON.parse(fs.readFileSync(path.resolve(release.candidatePath), "utf8"));
  const instagram = pack.placements.find((item) => item.platform === "instagram");
  const videoSource = pack.placements.find((item) => item.platform === "tiktok");
  assert.ok(instagram && videoSource, `${release.releaseId}: Instagram or vertical source missing`);
  assert.equal(videoSource.media?.kind, "vertical_video");
  assert.equal(videoSource.media?.status, "READY");
  const mediaPath = path.resolve(videoSource.media.path);
  const mediaSha256 = sha256(mediaPath);
  assert.equal(mediaSha256, videoSource.approvedMediaSha256, `${release.releaseId}: approved vertical media changed`);
  const metadata = probe(mediaPath);
  const video = metadata.streams.find((stream) => stream.codec_type === "video");
  const audio = metadata.streams.find((stream) => stream.codec_type === "audio");
  const durationSeconds = Number(metadata.format.duration);
  assert.equal(video?.width, 1080, `${release.releaseId}: Story width must be 1080`);
  assert.equal(video?.height, 1920, `${release.releaseId}: Story height must be 1920`);
  assert.ok(audio, `${release.releaseId}: Story audio missing`);
  assert.ok(durationSeconds >= 14.5 && durationSeconds <= 15.5, `${release.releaseId}: Story duration out of range`);
  assert.match(instagram.chatUrl, /utm_source=instagram/);
  outputs.push({
    releaseId: release.releaseId,
    placementId: instagram.placementId,
    workId: release.workId,
    workTitle: release.title,
    mediaRelativePath: path.relative(root, mediaPath),
    mediaSha256,
    bytes: fs.statSync(mediaPath).size,
    width: 1080,
    height: 1920,
    durationSeconds,
    hasAudio: true,
    chatUrl: instagram.chatUrl,
    requiredInteractiveElement: "LINK_STICKER",
    stickerDestination: instagram.chatUrl
  });
}

const aggregateSha256 = crypto.createHash("sha256").update(JSON.stringify(outputs.map(({ placementId, mediaSha256, stickerDestination }) => ({ placementId, mediaSha256, stickerDestination })))).digest("hex");
const candidate = {
  schemaVersion: 1,
  waveId: manifest.waveId,
  generatedAt: new Date().toISOString(),
  status: "EXECUTION_SURFACE_REQUIRED",
  platform: "instagram",
  publicationFormat: "STORY_9_16_WITH_LINK_STICKER",
  outputs,
  aggregateSha256,
  approvalToken: null,
  activationRequirement: "An authenticated Instagram mobile app execution surface with observable Story creation and Link sticker controls must be connected and preflighted before a new hash-bound Human approval token can be issued.",
  externalPublicationPerformed: false,
  evidenceBoundary: "The media and exact sticker destinations are mechanically prepared, but the connected Instagram Web surface cannot create a Story or attach a Link sticker and no Android device is connected. This candidate is not approval-eligible or executable."
};
fs.writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
console.log(JSON.stringify(candidate, null, 2));
