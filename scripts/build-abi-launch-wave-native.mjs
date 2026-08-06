import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const manifestPath = path.join(root, "ops/audience-engine/abi-hakusyaku-launch-wave-01-native.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const outputDir = path.join(root, "public/audience/abi-launch-wave-01");
fs.mkdirSync(outputDir, { recursive: true });

const videoPosts = manifest.posts.filter((post) => post.verticalVideo);

for (const post of videoPosts) {
  const input = path.join(root, "public", post.image.replace(/^\//, ""));
  const output = path.join(root, "public", post.verticalVideo.replace(/^\//, ""));
  if (!fs.existsSync(input)) throw new Error(`${post.id}: input image missing: ${input}`);

  const filter = [
    "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=28[bg]",
    "[0:v]scale=1080:1350:force_original_aspect_ratio=decrease[fg]",
    "[bg][fg]overlay=(W-w)/2:(H-h)/2,fade=t=in:st=0:d=0.35,fade=t=out:st=14.35:d=0.65,format=yuv420p",
  ].join(";");

  const result = spawnSync("ffmpeg", [
    "-y",
    "-loop", "1",
    "-i", input,
    "-t", "15",
    "-r", "30",
    "-filter_complex", filter,
    "-an",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "20",
    "-movflags", "+faststart",
    output,
  ], { stdio: "inherit" });

  if (result.status !== 0) throw new Error(`${post.id}: ffmpeg failed with exit ${result.status}`);
}

const header = [
  "placement_id", "post_id", "platform", "status", "approval_token", "published_at", "public_url",
  "views_24h", "three_second_views_24h", "completion_rate_24h", "saves_24h", "shares_24h", "meaningful_comments_24h", "profile_visits_24h",
  "views_72h", "completion_rate_72h", "saves_72h", "shares_72h", "profile_visits_72h",
  "chat_sessions", "first_messages", "consultations", "dossier_accepted", "purchase_intent", "net_non_refunded_yen", "notes",
];

const escapeCsv = (value) => `"${String(value).replaceAll('"', '""')}"`;
const rows = [header.map(escapeCsv).join(",")];
const ledgerPath = path.join(root, manifest.measurement.ledger);
const existingRows = new Map();
if (fs.existsSync(ledgerPath)) {
  for (const line of fs.readFileSync(ledgerPath, "utf8").trim().split("\n").slice(1)) {
    const placementId = line.slice(1).split('","', 1)[0];
    existingRows.set(placementId, line);
  }
}
for (const post of manifest.posts) {
  for (const [platform, placement] of Object.entries(post.placements)) {
    const placementId = `${post.id}:${platform}`;
    const existing = existingRows.get(placementId);
    if (existing) {
      rows.push(existing);
      continue;
    }
    const values = [
      placementId, post.id, platform, manifest.publicationGate.state === "APPROVED" ? "APPROVED_WAITING_SCHEDULE" : "HUMAN_APPROVAL_REQUIRED", placement.approvalToken,
      "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "",
    ];
    rows.push(values.map(escapeCsv).join(","));
  }
}
fs.writeFileSync(ledgerPath, `${rows.join("\n")}\n`);

console.log(JSON.stringify({ status: "BUILT", videos: videoPosts.length, ledgerRows: rows.length - 1, outputDir }, null, 2));
