import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const candidate = JSON.parse(fs.readFileSync("ops/audience-engine/DMW-20260805-instagram-story-approval-candidate.json", "utf8"));
const sha256 = (filePath) => crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const probe = (filePath) => {
  const result = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", filePath], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || `${filePath}: ffprobe failed`);
  return JSON.parse(result.stdout);
};
assert.equal(candidate.status, "EXECUTION_SURFACE_REQUIRED");
assert.equal(candidate.publicationFormat, "STORY_9_16_WITH_LINK_STICKER");
assert.equal(candidate.outputs.length, 7);
assert.equal(candidate.approvalToken, null);
assert.match(candidate.activationRequirement, /authenticated Instagram mobile app execution surface/);
for (const output of candidate.outputs) {
  const mediaPath = path.resolve(output.mediaRelativePath);
  assert.equal(sha256(mediaPath), output.mediaSha256);
  const metadata = probe(mediaPath);
  const video = metadata.streams.find((stream) => stream.codec_type === "video");
  const audio = metadata.streams.find((stream) => stream.codec_type === "audio");
  assert.equal(video?.width, 1080);
  assert.equal(video?.height, 1920);
  assert.ok(audio);
  assert.ok(Number(metadata.format.duration) >= 14.5 && Number(metadata.format.duration) <= 15.5);
  assert.equal(output.width, 1080);
  assert.equal(output.height, 1920);
  assert.equal(output.hasAudio, true);
  assert.equal(output.requiredInteractiveElement, "LINK_STICKER");
  assert.equal(output.stickerDestination, output.chatUrl);
  assert.match(output.chatUrl, /utm_source=instagram/);
}
console.log("daily music Instagram Story candidates: PASS");
