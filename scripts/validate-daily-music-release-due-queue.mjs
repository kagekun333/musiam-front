import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const input = "ops/audience-engine/daily-music-release-candidates/DMW-20260805-7D--manifest.json";
const runAt = (now, manifestPath = input) => {
  const run = spawnSync(process.execPath, ["scripts/build-daily-music-release-due-queue.mjs", `--input=${manifestPath}`, `--now=${now}`], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout);
};
const before = runAt("2026-08-05T03:14:59.000Z");
assert.equal(before.summary.due, 0, "future placements became due early");
const after = runAt("2026-08-12T03:15:00.000Z");
const terminalCount = after.rows.filter((row) => row.publicationState === "PUBLISHED").length;
assert.equal(after.summary.due, 28 - terminalCount, "non-terminal approved placements did not become due");
assert.equal(after.summary.published, terminalCount, "published placements were not preserved as terminal");

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "dmw-due-"));
try {
  const fixture = JSON.parse(fs.readFileSync(input, "utf8"));
  for (const release of fixture.releases) {
    const candidatePath = path.join(temp, path.basename(release.candidatePath));
    fs.copyFileSync(path.resolve(release.candidatePath), candidatePath);
    release.candidatePath = candidatePath;
  }
  const fixturePath = path.join(temp, "manifest.json");
  fixture.publicationState = "HUMAN_APPROVAL_REQUIRED";
  delete fixture.approval;
  for (const release of fixture.releases) {
    const candidate = JSON.parse(fs.readFileSync(release.candidatePath, "utf8"));
    candidate.gates.externalPublication = "HUMAN_APPROVAL_REQUIRED";
    candidate.externalPublicationPerformed = false;
    delete candidate.waveApproval;
    for (const placement of candidate.placements) {
      placement.publicationState = "HUMAN_APPROVAL_REQUIRED";
      delete placement.publishedAt;
      delete placement.publicUrl;
      delete placement.publicationEvidence;
    }
    fs.writeFileSync(release.candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
  }
  fs.writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
  const unapproved = runAt("2026-08-12T03:15:00.000Z", fixturePath);
  assert.equal(unapproved.summary.due, 0, "unapproved placements became due");
  assert.equal(unapproved.summary.humanApprovalRequired, 28);
  const approve = spawnSync(process.execPath, [
    "scripts/apply-daily-music-wave-approval.mjs",
    `--input=${fixturePath}`,
    `--human-approval-token=${fixture.batchApprovalToken}`,
    "--commit=true",
  ], { encoding: "utf8" });
  assert.equal(approve.status, 0, approve.stderr);
  const firstDay = runAt("2026-08-05T03:15:00.000Z", fixturePath);
  assert.equal(firstDay.summary.due, 4, "first approved work should produce four due placements");
  assert.ok(firstDay.duePlacementIds.every((id) => id.startsWith("DMR-20260805-")));
  const firstCandidatePath = JSON.parse(fs.readFileSync(fixturePath, "utf8")).releases[0].candidatePath;
  const firstCandidate = JSON.parse(fs.readFileSync(firstCandidatePath, "utf8"));
  firstCandidate.placements[0].publicationState = "PUBLISHED";
  firstCandidate.placements[0].publishedAt = "2026-08-05T03:15:30.000Z";
  fs.writeFileSync(firstCandidatePath, `${JSON.stringify(firstCandidate, null, 2)}\n`);
  const replay = runAt("2026-08-05T03:16:00.000Z", fixturePath);
  assert.equal(replay.summary.due, 3, "published placement was offered twice");
  assert.equal(replay.summary.published, 1);
  assert.equal(replay.rows.find((item) => item.publicationState === "PUBLISHED")?.reason, "ALREADY_PUBLISHED");
  console.log("daily music release due queue: PASS — future/unapproved excluded, first due cohort exact, published replay excluded");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
