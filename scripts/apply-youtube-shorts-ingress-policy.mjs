import fs from "node:fs";
import path from "node:path";

const manifestPath = path.resolve("ops/audience-engine/daily-music-release-candidates/DMW-20260805-7D--manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const nextStatus = "SHORTS_DESCRIPTION_URL_NON_CLICKABLE_PROFILE_LINK_REQUIRED";
let changed = 0;
for (const release of manifest.releases) {
  const candidatePath = path.resolve(release.candidatePath);
  const candidate = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
  const youtube = candidate.placements.find((item) => item.platform === "youtube");
  if (!youtube) throw new Error(`${release.releaseId}: YouTube placement missing`);
  if (!["READY", nextStatus].includes(youtube.ingress?.status)) throw new Error(`${youtube.placementId}: unexpected ingress state ${youtube.ingress?.status}`);
  if (youtube.publicationState === "PUBLISHED") throw new Error(`${youtube.placementId}: already published; refuse historical rewrite`);
  if (youtube.ingress.status !== nextStatus || youtube.ingress.mechanism !== "shorts_description_url") {
    youtube.ingress = { mechanism: "shorts_description_url", status: nextStatus };
    changed += 1;
    fs.writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
  }
}
console.log(JSON.stringify({ status: "APPLIED", changed, youtubePlacements: manifest.releases.length, externalPublicationPerformed: false }));
