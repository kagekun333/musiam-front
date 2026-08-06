import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=")];
}));
if (!args.input || !args.evidence) throw new Error("usage: node scripts/register-daily-music-publication.mjs --input=<manifest.json> --evidence=<publication.json> [--commit=true]");
const manifestPath = path.resolve(args.input);
const evidencePath = path.resolve(args.evidence);
const commit = args.commit === "true";
const now = args.now ? new Date(args.now) : new Date();
assert.ok(Number.isFinite(now.getTime()), "invalid --now timestamp");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
assert.match(String(evidence.placementId || ""), /^DMR-\d{8}-[0-9a-f]{8}-(instagram|threads|tiktok|youtube)$/);

let selected = null;
for (const release of manifest.releases) {
  if (!release.placementIds.includes(evidence.placementId)) continue;
  const candidatePath = path.resolve(release.candidatePath);
  const candidate = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
  const placement = candidate.placements.find((item) => item.placementId === evidence.placementId);
  if (placement) selected = { release, candidatePath, candidate, placement };
}
assert.ok(selected, "placement is outside the exact wave manifest");
const { candidatePath, candidate, placement } = selected;
const exactReplay = placement.publicationState === "PUBLISHED"
  && placement.publicationEvidence
  && JSON.stringify(placement.publicationEvidence) === JSON.stringify(evidence);
if (exactReplay) {
  console.log(JSON.stringify({ status: "ALREADY_REGISTERED_IDENTICAL", placementId: evidence.placementId, externalPublicationPerformed: true }, null, 2));
  process.exit(0);
}
assert.equal(placement.publicationState, "APPROVED_WAITING_SCHEDULE", "placement is not approved waiting schedule");
assert.equal(placement.ingress?.status, "READY", "placement ingress is not verified clickable");
assert.ok(Date.parse(placement.scheduledAt) <= Date.parse(evidence.publishedAt), "publishedAt predates scheduledAt");
assert.ok(Date.parse(evidence.publishedAt) <= now.getTime() + 5 * 60 * 1000, "publishedAt is in the future");
assert.equal(evidence.platform, placement.platform);
const url = new URL(evidence.publicUrl);
assert.equal(url.protocol, "https:");
const allowedHosts = {
  instagram: ["instagram.com", "www.instagram.com"],
  threads: ["threads.net", "www.threads.net"],
  tiktok: ["tiktok.com", "www.tiktok.com"],
  youtube: ["youtube.com", "www.youtube.com", "youtu.be"],
};
assert.ok(allowedHosts[placement.platform].includes(url.hostname), "public URL host does not match platform");
assert.ok(url.pathname.length > 1, "public URL is not content-specific");
assert.ok(["PUBLIC_VISIBLE", "CONTENT_REVIEW_PENDING"].includes(evidence.reviewState), "unsupported reviewState");
assert.ok(["DISCLOSED", "NOT_REQUIRED", "UNAVAILABLE"].includes(evidence.aiDisclosureState), "unsupported aiDisclosureState");

if (placement.publicationFormat === "STORY_9_16_WITH_LINK_STICKER") {
  assert.equal(evidence.publicationFormat, placement.publicationFormat, "Instagram Story publication format evidence missing");
  assert.equal(evidence.linkStickerVisible, true, "Instagram Story Link sticker was not visibly verified");
  assert.equal(evidence.linkStickerDestination, placement.publicationRequirements?.exactLinkStickerDestination, "Instagram Story Link sticker destination mismatch");
  assert.equal(evidence.linkStickerDestination, placement.chatUrl, "Instagram Story Link sticker is not the exact attributed Chat URL");
}
if (placement.publicationFormat === "LONG_FORM_16_9") {
  assert.equal(evidence.publicationFormat, placement.publicationFormat, "YouTube long-form publication format evidence missing");
  assert.ok(!url.pathname.startsWith("/shorts/"), "YouTube long-form placement cannot be registered with a Shorts URL");
  assert.equal(evidence.descriptionLinkClickable, true, "YouTube description link clickability was not verified");
  assert.equal(evidence.descriptionChatUrl, placement.publicationRequirements?.exactDescriptionChatUrl, "YouTube description Chat URL mismatch");
  assert.equal(evidence.descriptionChatUrl, placement.chatUrl, "YouTube description does not contain the exact attributed Chat URL");
}

const mediaPath = placement.media.kind === "cover_image"
  ? path.join(process.cwd(), "public", String(placement.media.path || "").replace(/^\/+/, ""))
  : path.resolve(placement.media.path || "");
assert.ok(fs.existsSync(mediaPath), "approved publication media is missing");
const currentMediaSha256 = crypto.createHash("sha256").update(fs.readFileSync(mediaPath)).digest("hex");
const expectedMediaSha256 = placement.approvedMediaSha256;
assert.match(String(expectedMediaSha256 || ""), /^[0-9a-f]{64}$/);
assert.equal(currentMediaSha256, expectedMediaSha256, "publication media changed after Human approval");
assert.equal(evidence.mediaSha256, expectedMediaSha256, "publication media hash does not match the approved candidate");
assert.equal(evidence.chatUrl, placement.chatUrl, "published attribution URL does not match the approved candidate");

placement.publicationState = "PUBLISHED";
placement.publishedAt = evidence.publishedAt;
placement.publicUrl = evidence.publicUrl;
placement.publicationEvidence = evidence;
candidate.externalPublicationPerformed = true;
if (commit) fs.writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`, { flag: "w", mode: 0o600 });
console.log(JSON.stringify({ status: commit ? "PUBLICATION_REGISTERED" : "PUBLICATION_VALIDATED_DRY_RUN", placementId: evidence.placementId, publicUrl: evidence.publicUrl, externalPublicationPerformed: true }, null, 2));
