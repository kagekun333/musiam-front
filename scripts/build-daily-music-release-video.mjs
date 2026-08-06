import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=")];
}));
const inputPath = path.resolve(String(args.input || ""));
const audioPath = path.resolve(String(args.audio || ""));
if (!args.input || !args.audio) {
  throw new Error("usage: node scripts/build-daily-music-release-video.mjs --input=<candidate.json> --audio=<owned-audio> [--output-video=<mp4>] [--output-pack=<json>]");
}
if (!fs.existsSync(inputPath)) throw new Error(`candidate not found: ${args.input}`);
if (!fs.existsSync(audioPath) || !fs.statSync(audioPath).isFile()) throw new Error(`owned audio not found: ${args.audio}`);

const pack = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const coverWebPath = String(pack?.work?.cover || "");
if (!coverWebPath.startsWith("/")) throw new Error("candidate work cover must be a root-relative public path");
const coverPath = path.join(root, "public", coverWebPath.replace(/^\/+/, ""));
if (!fs.existsSync(coverPath)) throw new Error(`cover not found: ${path.relative(root, coverPath)}`);
if (!Array.isArray(pack.placements) || !pack.placements.some((item) => item.platform === "tiktok") || !pack.placements.some((item) => item.platform === "youtube")) {
  throw new Error("candidate must contain TikTok and YouTube placements");
}

const safeReleaseId = String(pack.releaseId).replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 140);
const defaultVideo = path.join(root, "ops/audience-engine/daily-music-release-media", `${safeReleaseId}.mp4`);
const outputVideo = path.resolve(String(args["output-video"] || defaultVideo));
const outputPack = args["output-pack"] ? path.resolve(String(args["output-pack"])) : null;
fs.mkdirSync(path.dirname(outputVideo), { recursive: true });
if (outputPack) fs.mkdirSync(path.dirname(outputPack), { recursive: true });

const temporaryVideo = path.join(os.tmpdir(), `${safeReleaseId}-${process.pid}.mp4`);
const filter = [
  "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=32[bg]",
  "[0:v]scale=900:900:force_original_aspect_ratio=decrease[cover]",
  "[bg][cover]overlay=(W-w)/2:(H-h)/2,zoompan=z='min(zoom+0.00035,1.05)':d=450:s=1080x1920:fps=30[base]",
  "[1:a]aformat=channel_layouts=mono,showwaves=s=900x120:mode=line:rate=30:colors=0xD4AF37@0.78[wave]",
  "[base][wave]overlay=(W-w)/2:1660:shortest=1,format=yuv420p[v]",
].join(";");
const ffmpeg = spawnSync("ffmpeg", [
  "-y", "-loop", "1", "-framerate", "30", "-i", coverPath,
  "-i", audioPath,
  "-filter_complex", filter,
  "-map", "[v]", "-map", "1:a:0",
  "-t", "15", "-r", "30",
  "-c:v", "libx264", "-preset", "medium", "-crf", "18",
  "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
  "-movflags", "+faststart", temporaryVideo,
], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
if (ffmpeg.status !== 0) {
  fs.rmSync(temporaryVideo, { force: true });
  throw new Error(`ffmpeg failed (${ffmpeg.status}): ${ffmpeg.stderr.slice(-2000)}`);
}

const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name,width,height", "-of", "json", temporaryVideo], { encoding: "utf8" });
if (probe.status !== 0) {
  fs.rmSync(temporaryVideo, { force: true });
  throw new Error(`ffprobe failed (${probe.status}): ${probe.stderr.slice(-1000)}`);
}
const media = JSON.parse(probe.stdout);
const streams = media.streams ?? [];
const duration = Number(media.format?.duration ?? 0);
if (!streams.some((stream) => stream.codec_type === "video" && stream.width === 1080 && stream.height === 1920)) throw new Error("rendered video is not 1080x1920");
if (!streams.some((stream) => stream.codec_type === "audio")) throw new Error("rendered video has no audio stream");
if (duration < 14.5 || duration > 15.5) throw new Error(`rendered duration is outside 15s tolerance: ${duration}`);

fs.renameSync(temporaryVideo, outputVideo);
const digest = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const evidence = {
  audioSha256: digest(audioPath),
  audioBytes: fs.statSync(audioPath).size,
  coverSha256: digest(coverPath),
  videoSha256: digest(outputVideo),
  videoBytes: fs.statSync(outputVideo).size,
  durationSeconds: duration,
  width: 1080,
  height: 1920,
  hasAudio: true,
  motionTreatment: "cinematic_zoom_1.00_to_1.05",
  audioReactiveTreatment: "gold_waveform",
};

const updated = structuredClone(pack);
for (const placement of updated.placements) {
  if (placement.platform !== "tiktok" && placement.platform !== "youtube") continue;
  placement.media = {
    kind: "vertical_video",
    path: path.relative(root, outputVideo),
    status: "READY",
    evidence,
  };
}
updated.gates.videoAssembly = "PASS";
updated.evidenceBoundary = "This candidate proves catalog identity, tracked routing and mechanically verified media only. It does not prove publication, reach, demand, pipeline or revenue.";
if (outputPack) fs.writeFileSync(outputPack, `${JSON.stringify(updated, null, 2)}\n`, { flag: "w", mode: 0o600 });

console.log(JSON.stringify({
  status: "MEDIA_READY",
  releaseId: pack.releaseId,
  outputVideo: path.relative(root, outputVideo),
  outputPack: outputPack ? path.relative(root, outputPack) : null,
  evidence,
  externalPublicationPerformed: false,
}, null, 2));
