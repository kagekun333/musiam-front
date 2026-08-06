import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const manifestPath = path.join(root, "ops/audience-engine/daily-music-release-candidates/DMW-20260805-7D--manifest.json");
const outputDir = path.join(root, "ops/audience-engine/daily-music-release-media/youtube-longform");
const candidatePath = path.join(root, "ops/audience-engine/DMW-20260805-youtube-longform-approval-candidate.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const sha256 = (filePath) => crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const probe = (filePath) => {
  const result = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", filePath], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || `ffprobe failed: ${filePath}`);
  return JSON.parse(result.stdout);
};

fs.mkdirSync(outputDir, { recursive: true });
const outputs = [];
for (const release of manifest.releases) {
  const pack = JSON.parse(fs.readFileSync(path.resolve(release.candidatePath), "utf8"));
  const youtube = pack.placements.find((item) => item.platform === "youtube");
  if (!youtube || youtube.media?.kind !== "vertical_video" || youtube.media?.status !== "READY") throw new Error(`${release.releaseId}: approved source video missing`);
  const sourcePath = path.resolve(youtube.media.path);
  const sourceSha256 = sha256(sourcePath);
  if (sourceSha256 !== youtube.approvedMediaSha256) throw new Error(`${youtube.placementId}: source video changed after approval`);
  const outputPath = path.join(outputDir, `${release.releaseId}-youtube-longform-1920x1080.mp4`);
  let outputIsValid = false;
  if (fs.existsSync(outputPath)) {
    try {
      const existing = probe(outputPath);
      const existingVideo = existing.streams.find((stream) => stream.codec_type === "video");
      const existingAudio = existing.streams.find((stream) => stream.codec_type === "audio");
      const existingDuration = Number(existing.format.duration);
      outputIsValid = existingVideo?.width === 1920 && existingVideo?.height === 1080 && Boolean(existingAudio) && existingDuration >= 14.5 && existingDuration <= 15.5;
    } catch {
      outputIsValid = false;
    }
  }
  if (!outputIsValid) {
    const filter = "[0:v]split=2[bg][fg];[bg]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,gblur=sigma=30[bg2];[fg]scale=-2:1080[fg2];[bg2][fg2]overlay=(W-w)/2:0,format=yuv420p[v]";
    const temporaryPath = `${outputPath}.rendering`;
    const render = spawnSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", sourcePath, "-filter_complex", filter, "-map", "[v]", "-map", "0:a:0", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-f", "mp4", temporaryPath], { encoding: "utf8" });
    if (render.status !== 0) throw new Error(render.stderr || `ffmpeg failed: ${release.releaseId}`);
    probe(temporaryPath);
    fs.renameSync(temporaryPath, outputPath);
  }
  const metadata = probe(outputPath);
  const video = metadata.streams.find((stream) => stream.codec_type === "video");
  const audio = metadata.streams.find((stream) => stream.codec_type === "audio");
  const durationSeconds = Number(metadata.format.duration);
  if (video?.width !== 1920 || video?.height !== 1080 || !audio || durationSeconds < 14.5 || durationSeconds > 15.5) throw new Error(`${release.releaseId}: long-form preflight failed`);
  outputs.push({
    releaseId: release.releaseId,
    placementId: youtube.placementId,
    workId: release.workId,
    workTitle: release.title,
    sourceRelativePath: path.relative(root, sourcePath),
    sourceSha256,
    outputRelativePath: path.relative(root, outputPath),
    outputSha256: sha256(outputPath),
    bytes: fs.statSync(outputPath).size,
    width: video.width,
    height: video.height,
    durationSeconds,
    hasAudio: true,
    chatUrl: youtube.chatUrl,
  });
}
const aggregateSha256 = crypto.createHash("sha256").update(JSON.stringify(outputs.map(({ placementId, outputSha256, chatUrl }) => ({ placementId, outputSha256, chatUrl })))).digest("hex");
const approvalToken = `APPROVE_DAILY_MUSIC_YOUTUBE_LONGFORM:${manifest.waveId}:${aggregateSha256.slice(0, 16)}`;
const candidate = {
  schemaVersion: 1,
  waveId: manifest.waveId,
  generatedAt: new Date().toISOString(),
  status: "HUMAN_APPROVAL_REQUIRED",
  platform: "youtube",
  publicationFormat: "LONG_FORM_16_9",
  verifiedChannelCapability: "ADVANCED_FEATURES_ELIGIBLE_OBSERVED_2026-08-03",
  linkMechanism: "clickable_long_form_description_url",
  outputs,
  aggregateSha256,
  approvalToken,
  externalPublicationPerformed: false,
  evidenceBoundary: "These are hash-bound 16:9 candidates derived from previously approved videos. Generation does not approve replacement media or external publication.",
};
fs.writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
console.log(JSON.stringify(candidate, null, 2));
