import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();
const file = path.join(repo, "ops/product/owner-source-corpus-index-v1.json");
const index = JSON.parse(fs.readFileSync(file, "utf8"));

assert.equal(index.schemaVersion, 1);
assert.equal(index.status, "INDEX_V1_NON_RUNTIME");
assert.match(index.indexFingerprint, /^[a-f0-9]{64}$/);
assert.equal(index.bindingPolicy.titleOnlyMayEnterRuntime, false);
assert.equal(index.bindingPolicy.aiMessageMayBecomeOwnerIntentAutomatically, false);
assert.ok(index.summary.worksIndexed >= 400);
assert.equal(index.summary.reviewedPackets, 5);
assert.ok(index.summary.filesScanned >= 300);
assert.ok(index.summary.sectionsScanned > 0);

const byId = new Map(index.works.map((work: any) => [work.workId, work]));

for (const id of [
  "fuego-en-la-noche-228",
  "g-rli-garden-149",
  "apple-album-6800129451",
  "apple-album-6808806776",
  "spotify-album-79CuhhEhb0GtBzgkk7fwsY",
]) {
  const work: any = byId.get(id);
  assert.ok(work, `Missing representative work: ${id}`);
  assert.equal(work.reviewedPacket?.bindingStatus, "REVIEWED_STABLE_ID_PACKET");
}

const fuego: any = byId.get("fuego-en-la-noche-228");
assert.equal(fuego.reviewedPacket?.ownerIntentStatus, "VERIFIED_OWNER_PUBLISHED_MEDIA");
assert.ok(fuego.reviewedPacket?.sourceClasses.includes("OWNER_PUBLISHED_MEDIA"));

const sun: any = byId.get("apple-album-6808806776");
assert.equal(sun.reviewedPacket?.ownerIntentStatus, "KNOWLEDGE_GAP");

for (const work of index.works) {
  for (const candidate of work.candidates ?? []) {
    assert.equal(candidate.bindingStatus, "UNVERIFIED_TITLE_CANDIDATE");
    assert.ok(candidate.sectionSha256 && /^[a-f0-9]{64}$/.test(candidate.sectionSha256));
    assert.ok(candidate.lineStart >= 1 && candidate.lineEnd >= candidate.lineStart);
    assert.ok(!("text" in candidate));
    assert.ok(!("excerpt" in candidate));
    assert.notEqual(candidate.classification, "OWNER_MESSAGE", "Unreviewed archive candidate must never be promoted directly to OWNER_MESSAGE");
  }
}

console.log(JSON.stringify({
  verdict: "OWNER_SOURCE_CORPUS_INDEX_V1=PASS",
  worksIndexed: index.summary.worksIndexed,
  reviewedPackets: index.summary.reviewedPackets,
  worksWithCandidates: index.summary.worksWithCandidates,
  filesScanned: index.summary.filesScanned,
  sectionsScanned: index.summary.sectionsScanned,
}));
