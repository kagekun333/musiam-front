import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, "ops/audience-engine/abi-hakusyaku-launch-wave-01-native.json"), "utf8"));
const ledgerLines = fs.readFileSync(path.join(root, "ops/audience-engine/abi-hakusyaku-launch-wave-01-ledger.csv"), "utf8").trim().split("\n");
const parse = (line) => line.slice(1, -1).split('\",\"');
const ledger = new Map(ledgerLines.slice(1).map((line) => { const values = parse(line); return [values[0], { status: values[3], notes: values[25] }]; }));
const videoFormats = new Set(["reel_9x16", "vertical_video_15s", "short_9x16"]);
const checks = [];
for (const post of manifest.posts) {
  if (!post.verticalVideo) continue;
  const videoPath = path.join(root, "public", post.verticalVideo.replace(/^\//, ""));
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height", "-of", "json", videoPath], { encoding: "utf8" });
  const streams = probe.status === 0 ? JSON.parse(probe.stdout).streams ?? [] : [];
  const hasVideo = streams.some((stream) => stream.codec_type === "video" && stream.width === 1080 && stream.height === 1920);
  const hasAudio = streams.some((stream) => stream.codec_type === "audio");
  for (const [platform, placement] of Object.entries(post.placements)) {
    if (!videoFormats.has(placement.format)) continue;
    const placementId = `${post.id}:${platform}`;
    const row = ledger.get(placementId);
    const futurePublicationEligible = row?.status === "APPROVED_WAITING_SCHEDULE";
    checks.push({ placementId, status: row?.status ?? "MISSING", videoPath: path.relative(root, videoPath), hasVideo, hasAudio, futurePublicationEligible, pass: hasVideo && hasAudio });
  }
}
const unsafeEligible = checks.filter((check) => check.futurePublicationEligible && !check.pass);
const reviewPendingFailures = checks.filter((check) => check.status === "REVIEW_PENDING" && !check.pass);
const output = {
  status: unsafeEligible.length === 0 ? (reviewPendingFailures.length === 0 ? "PASS" : "HOLD_REVIEW_PENDING") : "FAIL_UNSAFE_PUBLICATION_ELIGIBLE",
  checks,
  unsafeEligiblePlacementIds: unsafeEligible.map((check) => check.placementId),
  reviewPendingPlacementIds: reviewPendingFailures.map((check) => check.placementId),
  rule: "A future video placement cannot be APPROVED_WAITING_SCHEDULE unless the canonical 1080x1920 asset contains both video and audio streams.",
};
console.log(JSON.stringify(output, null, 2));
if (unsafeEligible.length > 0) process.exit(1);
if (reviewPendingFailures.length > 0) process.exit(2);
