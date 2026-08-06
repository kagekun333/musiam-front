import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { buildDailyMusicSocialCopy } from "../src/lib/daily-music-social-copy.mjs";

const root = process.cwd();
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=")];
}));
const workId = String(args["work-id"] || "").trim();
const releaseDate = String(args.date || "").trim();
const audioPath = String(args.audio || "").trim();
if (!workId || !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
  throw new Error("usage: node scripts/build-daily-music-release-pack.mjs --work-id=<canonical-id> --date=YYYY-MM-DD [--audio=<owned-file>]");
}

const catalogRaw = JSON.parse(fs.readFileSync(path.join(root, "public/works/works.json"), "utf8"));
const catalog = Array.isArray(catalogRaw) ? catalogRaw : catalogRaw.items ?? catalogRaw.works ?? [];
const work = catalog.find((item) => String(item.id) === workId);
if (!work) throw new Error(`canonical work not found: ${workId}`);
if (String(work.type || "").toLowerCase() !== "music") throw new Error(`daily music pack requires type=music: ${workId}`);
if (!work.title || !work.cover) throw new Error(`title/cover missing: ${workId}`);
const listenUrl = work.links?.spotify || work.links?.listen || work.primaryHref || work.href;
if (!/^https:\/\//.test(String(listenUrl || ""))) throw new Error(`public listen URL missing: ${workId}`);

const compactWorkId = workId.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
const dateKey = releaseDate.replaceAll("-", "");
const releaseId = `DMR-${dateKey}-${compactWorkId}`;
const campaign = "daily_music_to_metal";
const platforms = ["instagram", "threads", "tiktok", "youtube"];
const verifiedTags = [...new Set([...(work.moodTags || []), ...(work.moodTagsInferred || [])])].filter(Boolean).slice(0, 3);
const genre = verifiedTags.find((tag) => String(tag).startsWith("genre:"))?.slice("genre:".length);

let audioEvidence = null;
if (audioPath) {
  const absolute = path.resolve(root, audioPath);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) throw new Error(`audio asset not found: ${audioPath}`);
  const bytes = fs.readFileSync(absolute);
  audioEvidence = { path: path.relative(root, absolute), bytes: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") };
}

const placements = platforms.map((platform) => {
  const workKey = crypto.createHash("sha256").update(workId).digest("hex").slice(0, 8);
  const content = `DMR-${dateKey}-${workKey}-${platform}`;
  const chat = new URL("/chat", "https://www.hakusyaku.xyz");
  chat.searchParams.set("intent", "music-work");
  chat.searchParams.set("work", String(work.title));
  chat.searchParams.set("workId", workId);
  chat.searchParams.set("utm_source", platform);
  chat.searchParams.set("utm_medium", "organic_social");
  chat.searchParams.set("utm_campaign", campaign);
  chat.searchParams.set("utm_content", content);
  const videoPlatform = platform === "tiktok" || platform === "youtube";
  return {
    placementId: content,
    platform,
    scheduledDate: releaseDate,
    copy: `${buildDailyMusicSocialCopy({ platform, title: String(work.title), genre })}\n\n伯爵Chat: ${chat.toString()}`,
    alt: `${work.title} — ABI伯爵の音楽作品ジャケット`,
    listenUrl,
    chatUrl: chat.toString(),
    media: videoPlatform
      ? { kind: "vertical_video", audioEvidence, status: audioEvidence ? "AUDIO_EVIDENCED_VIDEO_ASSEMBLY_REQUIRED" : "AUDIO_ASSET_REQUIRED" }
      : { kind: "cover_image", path: String(work.cover), status: "COVER_READY" },
    ingress: platform === "threads"
      ? { mechanism: "clickable_post_url", status: "READY" }
      : platform === "youtube"
        ? { mechanism: "shorts_description_url", status: "SHORTS_DESCRIPTION_URL_NON_CLICKABLE_PROFILE_LINK_REQUIRED" }
      : platform === "instagram"
        ? { mechanism: "story_link_sticker_or_copyable_caption_url", status: "LINK_STICKER_REQUIRED_FOR_CLICKABLE_PATH" }
        : { mechanism: "supported_link_attachment_or_copyable_caption_url", status: "CLICKABLE_LINK_CAPABILITY_REQUIRED" },
    approvalToken: `APPROVE_DAILY_MUSIC_RELEASE:${releaseId}:${platform}`,
    publicationState: "HUMAN_APPROVAL_REQUIRED",
  };
});

const output = {
  schemaVersion: 1,
  releaseId,
  createdAt: new Date().toISOString(),
  releaseDate,
  work: { id: workId, title: work.title, type: work.type, cover: work.cover, listenUrl, verifiedTags },
  campaign,
  purpose: "daily music discovery to permission-based work-specific Chat; not a direct sales post",
  placements,
  gates: {
    externalPublication: "HUMAN_APPROVAL_REQUIRED",
    videoAssembly: placements.some((item) => item.media.kind === "vertical_video" && item.media.status !== "READY") ? "REQUIRED" : "PASS",
    exactWorkAttribution: "PASS",
  },
  evidenceBoundary: "This candidate proves catalog identity and tracked routing only. It does not prove publication, reach, demand, pipeline or revenue.",
};

const outputDir = path.join(root, "ops/audience-engine/daily-music-release-candidates");
const outputPath = args.output ? path.resolve(args.output) : path.join(outputDir, `${releaseDate}--${compactWorkId}.json`);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
if (fs.existsSync(outputPath) && args.overwrite !== "true") throw new Error(`candidate already exists; pass --overwrite=true only after reviewing the existing file: ${path.relative(root, outputPath)}`);
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, { flag: "w" });
console.log(JSON.stringify({ status: "CANDIDATE_READY", output: path.relative(root, outputPath), releaseId, workId, placements: placements.length, externalPublication: "NOT_PERFORMED" }, null, 2));
