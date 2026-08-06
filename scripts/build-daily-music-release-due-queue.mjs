import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=")];
}));
if (!args.input) throw new Error("usage: node scripts/build-daily-music-release-due-queue.mjs --input=<manifest.json> [--now=<ISO>] [--output=<json>]");
const manifest = JSON.parse(fs.readFileSync(path.resolve(args.input), "utf8"));
const now = args.now ? new Date(args.now) : new Date();
assert.ok(Number.isFinite(now.getTime()), "invalid --now timestamp");
const rows = [];
for (const release of manifest.releases) {
  assert.ok(Number.isFinite(Date.parse(release.scheduledAt)), `${release.releaseId}: scheduledAt missing`);
  const candidate = JSON.parse(fs.readFileSync(path.resolve(release.candidatePath), "utf8"));
  for (const placement of candidate.placements) {
    assert.equal(placement.scheduledAt, release.scheduledAt);
    const approved = placement.publicationState === "APPROVED_WAITING_SCHEDULE";
    const published = placement.publicationState === "PUBLISHED";
    const due = approved && Date.parse(placement.scheduledAt) <= now.getTime();
    rows.push({
      placementId: placement.placementId,
      platform: placement.platform,
      workId: candidate.work.id,
      scheduledAt: placement.scheduledAt,
      publicationState: placement.publicationState,
      due,
      reason: published ? "ALREADY_PUBLISHED" : !approved ? "HUMAN_APPROVAL_REQUIRED" : due ? "DUE_APPROVED" : "WAITING_SCHEDULE",
    });
  }
}
const result = {
  schemaVersion: 1,
  generatedAt: now.toISOString(),
  waveId: manifest.waveId,
  summary: {
    placements: rows.length,
    due: rows.filter((item) => item.due).length,
    approvedWaiting: rows.filter((item) => item.publicationState === "APPROVED_WAITING_SCHEDULE").length,
    humanApprovalRequired: rows.filter((item) => item.publicationState === "HUMAN_APPROVAL_REQUIRED").length,
    published: rows.filter((item) => item.publicationState === "PUBLISHED").length,
    nextScheduledAt: rows.filter((item) => item.publicationState === "APPROVED_WAITING_SCHEDULE" && !item.due).sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))[0]?.scheduledAt ?? null,
  },
  duePlacementIds: rows.filter((item) => item.due).map((item) => item.placementId),
  rows,
  executionRule: "Only duePlacementIds may proceed to immediate media preflight and external publication; HUMAN_APPROVAL_REQUIRED, future and PUBLISHED rows are forbidden.",
};
if (args.output) fs.writeFileSync(path.resolve(args.output), `${JSON.stringify(result, null, 2)}\n`, { flag: "w" });
console.log(JSON.stringify(result, null, 2));
