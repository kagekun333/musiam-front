import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const inputArg = process.argv.find((arg) => arg.startsWith("--input="))?.slice("--input=".length);
if (!inputArg) throw new Error("usage: node scripts/validate-daily-music-release-video.mjs --input=<media-ready-candidate.json>");
const root = process.cwd();
const pack = JSON.parse(fs.readFileSync(path.resolve(inputArg), "utf8"));
const videoPlacements = pack.placements.filter((item) => item.platform === "tiktok" || item.platform === "youtube");
assert.equal(videoPlacements.length, 2, "candidate must have TikTok and YouTube video placements");
assert.equal(pack.gates.videoAssembly, "PASS");
assert.equal(new Set(videoPlacements.map((item) => item.media.path)).size, 1, "video placements must use the same verified work-specific asset");
const videoPath = path.resolve(videoPlacements[0].media.path);
assert.ok(fs.existsSync(videoPath), "video asset is missing");
const sha256 = crypto.createHash("sha256").update(fs.readFileSync(videoPath)).digest("hex");
for (const placement of videoPlacements) {
  assert.equal(placement.media.kind, "vertical_video");
  assert.equal(placement.media.status, "READY");
  assert.equal(placement.media.evidence.videoSha256, sha256, `${placement.platform} video hash mismatch`);
  assert.equal(placement.media.evidence.motionTreatment, "cinematic_zoom_1.00_to_1.05");
  assert.equal(placement.media.evidence.audioReactiveTreatment, "gold_waveform");
  assert.equal(placement.publicationState, "HUMAN_APPROVAL_REQUIRED", "media assembly must not approve publication");
}
const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height", "-of", "json", videoPath], { encoding: "utf8" });
assert.equal(probe.status, 0, `ffprobe failed: ${probe.stderr}`);
const media = JSON.parse(probe.stdout);
const streams = media.streams ?? [];
const duration = Number(media.format?.duration ?? 0);
assert.ok(streams.some((stream) => stream.codec_type === "video" && stream.codec_name === "h264" && stream.width === 1080 && stream.height === 1920), "1080x1920 H.264 stream missing");
assert.ok(streams.some((stream) => stream.codec_type === "audio" && stream.codec_name === "aac"), "AAC audio stream missing");
assert.ok(duration >= 14.5 && duration <= 15.5, `duration outside 15s tolerance: ${duration}`);
console.log(JSON.stringify({ status: "PASS", releaseId: pack.releaseId, videoSha256: sha256, durationSeconds: duration, externalPublicationPerformed: false }, null, 2));
