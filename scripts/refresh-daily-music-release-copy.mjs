import fs from "node:fs";
import path from "node:path";
import { buildDailyMusicSocialCopy } from "../src/lib/daily-music-social-copy.mjs";

const input = process.argv.find((arg) => arg.startsWith("--input="))?.slice("--input=".length);
const commit = process.argv.includes("--commit=true");
if (!input) throw new Error("usage: node scripts/refresh-daily-music-release-copy.mjs --input=<manifest.json> [--commit=true]");
const manifest = JSON.parse(fs.readFileSync(path.resolve(input), "utf8"));
if (manifest.publicationState !== "HUMAN_APPROVAL_REQUIRED") throw new Error("copy may only be refreshed before Human approval");
let placements = 0;
for (const release of manifest.releases) {
  const candidatePath = path.resolve(release.candidatePath);
  const candidate = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
  const genre = candidate.work.verifiedTags?.find((tag) => String(tag).startsWith("genre:"))?.slice("genre:".length);
  for (const placement of candidate.placements) {
    if (placement.publicationState !== "HUMAN_APPROVAL_REQUIRED") throw new Error(`${placement.placementId}: copy is already approved or published`);
    placement.copy = `${buildDailyMusicSocialCopy({ platform: placement.platform, title: candidate.work.title, genre })}\n\n伯爵Chat: ${placement.chatUrl}`;
    placements += 1;
  }
  if (commit) fs.writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`, { flag: "w", mode: 0o600 });
}
console.log(JSON.stringify({ status: commit ? "COPY_REFRESHED" : "COPY_VALIDATED_DRY_RUN", waveId: manifest.waveId, placements, externalPublicationPerformed: false }, null, 2));
