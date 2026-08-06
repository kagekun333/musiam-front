import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => { const [key, ...value] = arg.replace(/^--/, "").split("="); return [key, value.join("=")]; }));
const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync("ops/audience-engine/daily-music-release-candidates/DMW-20260805-7D--manifest.json", "utf8"));
const candidate = JSON.parse(fs.readFileSync("ops/audience-engine/DMW-20260805-instagram-story-approval-candidate.json", "utf8"));
const sha256 = (filePath) => crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
assert.equal(candidate.status, "HUMAN_APPROVAL_REQUIRED", "Instagram Story candidate is not approval-eligible; authenticated mobile Story Link-sticker execution surface required");
assert.equal(args["human-approval-token"], candidate.approvalToken, "exact Instagram Story Human approval token required");
assert.equal(candidate.outputs.length, manifest.releases.length);
const changes = [];
for (const release of manifest.releases) {
  const output = candidate.outputs.find((item) => item.releaseId === release.releaseId);
  assert.ok(output, `${release.releaseId}: candidate output missing`);
  assert.equal(sha256(path.resolve(output.mediaRelativePath)), output.mediaSha256, `${output.placementId}: Story media changed`);
  assert.equal(output.stickerDestination, output.chatUrl, `${output.placementId}: Link sticker destination mismatch`);
  const packPath = path.resolve(release.candidatePath);
  const pack = JSON.parse(fs.readFileSync(packPath, "utf8"));
  const instagram = pack.placements.find((item) => item.placementId === output.placementId);
  assert.ok(instagram);
  assert.notEqual(instagram.publicationState, "PUBLISHED", `${output.placementId}: already published`);
  assert.equal(instagram.chatUrl, output.chatUrl, `${output.placementId}: Chat attribution changed`);
  instagram.media = { kind: "vertical_video", path: output.mediaRelativePath, status: "READY", evidence: { videoSha256: output.mediaSha256, width: 1080, height: 1920, durationSeconds: 15, hasAudio: true } };
  instagram.ingress = { mechanism: "instagram_story_link_sticker", status: "READY" };
  instagram.publicationFormat = "STORY_9_16_WITH_LINK_STICKER";
  instagram.publicationRequirements = { exactLinkStickerDestination: output.chatUrl, failClosedIfStickerUnavailable: true, canonicalStoryUrlRequired: true };
  instagram.approvedMediaSha256 = output.mediaSha256;
  instagram.instagramStoryApproval = { token: candidate.approvalToken, aggregateSha256: candidate.aggregateSha256, approvedAt: new Date().toISOString() };
  changes.push({ packPath, pack });
}
if (args.commit === "true") for (const { packPath, pack } of changes) fs.writeFileSync(packPath, `${JSON.stringify(pack, null, 2)}\n`);
console.log(JSON.stringify({ status: args.commit === "true" ? "APPROVAL_APPLIED" : "VALIDATED_DRY_RUN", placements: changes.length, externalPublicationPerformed: false }));
