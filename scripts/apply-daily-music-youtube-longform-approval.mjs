import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => { const [key, ...value] = arg.replace(/^--/, "").split("="); return [key, value.join("=")]; }));
const root = process.cwd();
const manifestPath = path.join(root, "ops/audience-engine/daily-music-release-candidates/DMW-20260805-7D--manifest.json");
const candidatePath = path.join(root, "ops/audience-engine/DMW-20260805-youtube-longform-approval-candidate.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const candidate = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
const sha256 = (filePath) => crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
assert.equal(candidate.status, "HUMAN_APPROVAL_REQUIRED");
assert.equal(candidate.waveId, manifest.waveId);
assert.equal(args["human-approval-token"], candidate.approvalToken, "exact YouTube long-form Human approval token required");
assert.equal(candidate.outputs.length, manifest.releases.length);
const changes = [];
for (const release of manifest.releases) {
  const output = candidate.outputs.find((item) => item.releaseId === release.releaseId);
  assert.ok(output, `${release.releaseId}: approved output missing`);
  const outputPath = path.resolve(output.outputRelativePath);
  assert.equal(sha256(outputPath), output.outputSha256, `${output.placementId}: candidate media changed`);
  const packPath = path.resolve(release.candidatePath);
  const pack = JSON.parse(fs.readFileSync(packPath, "utf8"));
  const youtube = pack.placements.find((item) => item.placementId === output.placementId);
  assert.ok(youtube, `${output.placementId}: placement missing`);
  assert.notEqual(youtube.publicationState, "PUBLISHED", `${output.placementId}: already published`);
  assert.equal(youtube.chatUrl, output.chatUrl, `${output.placementId}: Chat attribution changed`);
  youtube.media = { kind: "long_form_video", path: output.outputRelativePath, status: "READY", evidence: { sourceSha256: output.sourceSha256, videoSha256: output.outputSha256, width: 1920, height: 1080, durationSeconds: output.durationSeconds, hasAudio: true } };
  youtube.ingress = { mechanism: "clickable_long_form_description_url", status: "READY" };
  youtube.publicationFormat = "LONG_FORM_16_9";
  youtube.publicationRequirements = { exactDescriptionChatUrl: output.chatUrl, descriptionLinkClickable: true, failClosedIfShortsUrl: true };
  youtube.approvedMediaSha256 = output.outputSha256;
  youtube.publicationState = "APPROVED_WAITING_SCHEDULE";
  youtube.youtubeLongFormApproval = { token: candidate.approvalToken, aggregateSha256: candidate.aggregateSha256, approvedAt: new Date().toISOString() };
  changes.push({ packPath, pack });
}
if (args.commit === "true") for (const { packPath, pack } of changes) fs.writeFileSync(packPath, `${JSON.stringify(pack, null, 2)}\n`);
console.log(JSON.stringify({ status: args.commit === "true" ? "APPROVAL_APPLIED" : "VALIDATED_DRY_RUN", placements: changes.length, externalPublicationPerformed: false }));
