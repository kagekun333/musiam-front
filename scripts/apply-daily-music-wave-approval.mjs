import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=")];
}));
const manifestPath = path.resolve(String(args.input || ""));
const suppliedToken = String(args["human-approval-token"] || "");
const standingPolicyPath = path.resolve(String(args["standing-approval-policy"] || "ops/audience-engine/daily-music-standing-publication-approval.json"));
const commit = args.commit === "true";
if (!args.input) {
  throw new Error("usage: node scripts/apply-daily-music-wave-approval.mjs --input=<manifest.json> [--human-approval-token=<exact-token> | --standing-approval-policy=<policy.json>] [--commit=true]");
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const expectedToken = `APPROVE_DAILY_MUSIC_WAVE:${manifest.waveId}`;
assert.equal(manifest.batchApprovalToken, expectedToken, "manifest batch approval token is malformed");
let authorization;
if (suppliedToken) {
  assert.equal(suppliedToken, expectedToken, "exact batch Human approval token required");
  authorization = { mode: "EXACT_WAVE_TOKEN", token: expectedToken };
} else {
  const standingPolicy = JSON.parse(fs.readFileSync(standingPolicyPath, "utf8"));
  assert.equal(standingPolicy.status, "ACTIVE", "standing publication approval is not active");
  assert.equal(standingPolicy.scope?.requiresApprovedWave, false, "standing policy still requires per-Wave approval");
  assert.equal(standingPolicy.scope?.allowsAutomaticWaveApproval, true, "standing policy does not authorize automatic Wave approval");
  for (const platform of ["instagram", "threads", "tiktok", "youtube"]) {
    assert.ok(standingPolicy.scope.platforms.includes(platform), `standing policy does not cover ${platform}`);
  }
  authorization = { mode: "STANDING_PUBLICATION_APPROVAL", policyId: standingPolicy.policyId, policyPath: path.relative(process.cwd(), standingPolicyPath) };
}
assert.equal(manifest.externalPublicationPerformed, false, "approval application cannot operate on a published wave");
assert.ok(["HUMAN_APPROVAL_REQUIRED", "APPROVED_WAITING_SCHEDULE"].includes(manifest.publicationState), "unsupported wave publication state");

const candidateUpdates = [];
for (const release of manifest.releases) {
  const candidatePath = path.resolve(release.candidatePath);
  const candidate = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
  assert.equal(candidate.releaseId, release.releaseId);
  assert.equal(candidate.releaseDate, release.date);
  assert.equal(candidate.gates.videoAssembly, "PASS", `${release.releaseId}: verified video is required before approval`);
  assert.notEqual(candidate.externalPublicationPerformed, true, `${release.releaseId}: candidate already records external publication`);
  for (const placement of candidate.placements) {
    assert.ok(["HUMAN_APPROVAL_REQUIRED", "APPROVED_WAITING_SCHEDULE"].includes(placement.publicationState));
    assert.equal(placement.approvalToken, `APPROVE_DAILY_MUSIC_RELEASE:${candidate.releaseId}:${placement.platform}`);
    assert.ok(placement.media?.status === "COVER_READY" || placement.media?.status === "READY", `${placement.placementId}: media is not ready`);
    const mediaPath = placement.media.kind === "cover_image"
      ? path.join(process.cwd(), "public", String(placement.media.path || "").replace(/^\/+/, ""))
      : path.resolve(placement.media.path || "");
    assert.ok(fs.existsSync(mediaPath), `${placement.placementId}: approved media file is missing`);
    const currentMediaSha256 = crypto.createHash("sha256").update(fs.readFileSync(mediaPath)).digest("hex");
    if (placement.approvedMediaSha256) {
      assert.equal(currentMediaSha256, placement.approvedMediaSha256, `${placement.placementId}: media changed after approval`);
    } else {
      placement.approvedMediaSha256 = currentMediaSha256;
    }
    placement.publicationState = "APPROVED_WAITING_SCHEDULE";
  }
  candidate.gates.externalPublication = "APPROVED";
  candidate.externalPublicationPerformed = false;
  candidate.waveApproval = {
    token: expectedToken,
    authorization,
    scope: manifest.releases.flatMap((item) => item.placementIds),
    appliedAt: manifest.approval?.appliedAt ?? new Date().toISOString(),
  };
  candidateUpdates.push({ candidatePath, candidate });
}

manifest.publicationState = "APPROVED_WAITING_SCHEDULE";
manifest.approval = {
  token: expectedToken,
  authorization,
  placements: manifest.releases.flatMap((item) => item.placementIds),
  appliedAt: manifest.approval?.appliedAt ?? candidateUpdates[0]?.candidate.waveApproval.appliedAt ?? new Date().toISOString(),
};

if (commit) {
  for (const { candidatePath, candidate } of candidateUpdates) {
    fs.writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`, { flag: "w", mode: 0o600 });
  }
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "w", mode: 0o600 });
}

console.log(JSON.stringify({
  status: commit ? "APPROVAL_APPLIED" : "APPROVAL_VALIDATED_DRY_RUN",
  waveId: manifest.waveId,
  placements: manifest.approval.placements.length,
  publicationState: manifest.publicationState,
  externalPublicationPerformed: false,
  authorizationMode: authorization.mode,
}, null, 2));
