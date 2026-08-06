import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const sourcePath = path.resolve("ops/audience-engine/daily-music-release-candidates/DMW-20260805-7D--manifest.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "dmw-approval-"));
try {
  const fixture = structuredClone(source);
  for (const release of fixture.releases) {
    const candidatePath = path.join(temp, path.basename(release.candidatePath));
    const candidate = JSON.parse(fs.readFileSync(path.resolve(release.candidatePath), "utf8"));
    candidate.externalPublicationPerformed = false;
    candidate.gates.externalPublication = "HUMAN_APPROVAL_REQUIRED";
    delete candidate.waveApproval;
    for (const placement of candidate.placements) {
      placement.publicationState = "HUMAN_APPROVAL_REQUIRED";
      delete placement.publishedAt;
      delete placement.publicUrl;
      delete placement.publicationEvidence;
    }
    fs.writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
    release.candidatePath = candidatePath;
  }
  fixture.publicationState = "HUMAN_APPROVAL_REQUIRED";
  fixture.externalPublicationPerformed = false;
  delete fixture.approval;
  const fixturePath = path.join(temp, "manifest.json");
  fs.writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
  const initialState = fixture.publicationState;
  const run = (token, commit = false) => spawnSync(process.execPath, [
    "scripts/apply-daily-music-wave-approval.mjs",
    `--input=${fixturePath}`,
    ...(token ? [`--human-approval-token=${token}`] : []),
    ...(commit ? ["--commit=true"] : []),
  ], { cwd: process.cwd(), encoding: "utf8" });

  const wrong = run("APPROVE_DAILY_MUSIC_WAVE:WRONG");
  assert.notEqual(wrong.status, 0, "wrong approval token must fail");
  const standingDryRun = run("");
  assert.equal(standingDryRun.status, 0, standingDryRun.stderr);
  assert.equal(JSON.parse(standingDryRun.stdout).authorizationMode, "STANDING_PUBLICATION_APPROVAL");
  assert.equal(JSON.parse(fs.readFileSync(fixturePath, "utf8")).publicationState, initialState, "standing dry-run mutated state");
  const exact = source.batchApprovalToken;
  const dryRun = run(exact);
  assert.equal(dryRun.status, 0, dryRun.stderr);
  assert.equal(JSON.parse(fs.readFileSync(fixturePath, "utf8")).publicationState, initialState, "dry-run mutated state");
  const applied = run(exact, true);
  assert.equal(applied.status, 0, applied.stderr);
  const approved = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  assert.equal(approved.publicationState, "APPROVED_WAITING_SCHEDULE");
  assert.equal(approved.approval.placements.length, 28);
  const firstAppliedAt = approved.approval.appliedAt;
  const repeated = run(exact, true);
  assert.equal(repeated.status, 0, repeated.stderr);
  assert.equal(JSON.parse(fs.readFileSync(fixturePath, "utf8")).approval.appliedAt, firstAppliedAt, "idempotent replay changed approval time");
  for (const release of approved.releases) {
    const candidate = JSON.parse(fs.readFileSync(release.candidatePath, "utf8"));
    assert.equal(candidate.gates.externalPublication, "APPROVED");
    assert.ok(candidate.placements.every((item) => item.publicationState === "APPROVED_WAITING_SCHEDULE"));
    assert.ok(candidate.placements.every((item) => item.media.status === "COVER_READY" || item.media.status === "READY"));
    assert.ok(candidate.placements.every((item) => /^[0-9a-f]{64}$/.test(item.approvedMediaSha256)), "approval did not bind an exact media hash");
  }
  console.log("daily music wave approval: PASS — wrong token rejected, dry-run immutable, exact 28-placement commit idempotent");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
