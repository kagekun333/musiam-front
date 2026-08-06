import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=")];
}));
if (!args.input) throw new Error("usage: node scripts/schedule-daily-music-release-wave.mjs --input=<manifest.json> [--commit=true]");
const input = path.resolve(args.input);
const commit = args.commit === "true";
const manifest = JSON.parse(fs.readFileSync(input, "utf8"));
assert.equal(manifest.externalPublicationPerformed, false);
for (const release of manifest.releases) {
  const scheduledAt = `${release.date}T03:15:00.000Z`;
  release.scheduledAt = scheduledAt;
  const candidatePath = path.resolve(release.candidatePath);
  const candidate = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
  assert.equal(candidate.releaseDate, release.date);
  assert.ok(candidate.placements.every((item) => !item.publishedAt), `${release.releaseId}: published placement cannot be rescheduled`);
  for (const placement of candidate.placements) placement.scheduledAt = scheduledAt;
  if (commit) fs.writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`, { flag: "w", mode: 0o600 });
}
manifest.schedulePolicy = "One canonical work per day at 12:15 JST; a placement is due only after scheduledAt, exact Human approval and immediate media preflight.";
if (commit) fs.writeFileSync(input, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "w", mode: 0o600 });
console.log(JSON.stringify({ status: commit ? "SCHEDULE_APPLIED" : "SCHEDULE_VALIDATED_DRY_RUN", waveId: manifest.waveId, releases: manifest.releases.length, timezone: "Asia/Tokyo", localTime: "12:15", externalPublicationPerformed: false }, null, 2));
