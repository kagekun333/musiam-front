import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const inputPath = process.argv.find((arg) => arg.startsWith("--input="))?.slice("--input=".length);
if (!inputPath) throw new Error("usage: node scripts/validate-daily-music-release-pack.mjs --input=<candidate.json>");
const pack = JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf8"));
const catalogRaw = JSON.parse(fs.readFileSync("public/works/works.json", "utf8"));
const catalog = Array.isArray(catalogRaw) ? catalogRaw : catalogRaw.items ?? catalogRaw.works ?? [];
const work = catalog.find((item) => String(item.id) === String(pack.work.id));

assert.ok(work, "work is absent from canonical catalog");
assert.equal(String(work.title), String(pack.work.title));
assert.equal(String(work.type).toLowerCase(), "music");
assert.equal(pack.campaign, "daily_music_to_metal");
assert.equal(pack.placements.length, 4);
assert.deepEqual(pack.placements.map((item) => item.platform).sort(), ["instagram", "threads", "tiktok", "youtube"]);
for (const placement of pack.placements) {
  const url = new URL(placement.chatUrl);
  assert.equal(url.origin, "https://www.hakusyaku.xyz");
  assert.equal(url.pathname, "/chat");
  assert.equal(url.searchParams.get("intent"), "music-work");
  assert.equal(url.searchParams.get("workId"), String(work.id));
  assert.equal(url.searchParams.get("work"), String(work.title));
  assert.equal(url.searchParams.get("utm_source"), placement.platform);
  assert.equal(url.searchParams.get("utm_medium"), "organic_social");
  assert.equal(url.searchParams.get("utm_campaign"), "daily_music_to_metal");
  assert.equal(url.searchParams.get("utm_content"), placement.placementId);
  assert.ok(placement.placementId.length <= 40, "utm_content exceeds the production event contract");
  assert.match(placement.placementId, /^DMR-\d{8}-[0-9a-f]{8}-(instagram|threads|tiktok|youtube)$/);
  assert.ok(placement.copy.includes(placement.chatUrl), "post copy omits the attributed Chat URL");
  assert.ok(
    ["HUMAN_APPROVAL_REQUIRED", "APPROVED_WAITING_SCHEDULE", "PUBLISHED"].includes(placement.publicationState),
    `${placement.placementId}: unsupported publication state`,
  );
  assert.match(placement.approvalToken, new RegExp(`^APPROVE_DAILY_MUSIC_RELEASE:${pack.releaseId}:${placement.platform}$`));
  assert.doesNotMatch(placement.copy, /(33万円|限定3|購入してください|残り\d)/);
  if (placement.media.kind === "cover_image") {
    assert.equal(placement.media.status, "COVER_READY");
    assert.ok(fs.existsSync(path.join("public", String(placement.media.path).replace(/^\/+/, ""))), `${placement.platform} cover asset is missing`);
  }
  if (placement.media.status === "READY") {
    assert.ok(placement.media.path && fs.existsSync(path.resolve(placement.media.path)), `${placement.platform} READY media asset is missing`);
    assert.match(String(placement.media.evidence?.videoSha256 || ""), /^[0-9a-f]{64}$/, `${placement.platform} READY media hash is missing`);
  }
}
assert.equal(pack.gates.exactWorkAttribution, "PASS");
assert.ok(["HUMAN_APPROVAL_REQUIRED", "APPROVED"].includes(pack.gates.externalPublication));
if (pack.gates.externalPublication === "APPROVED") {
  assert.equal(pack.waveApproval?.token, `APPROVE_DAILY_MUSIC_WAVE:${pack.waveApproval?.token?.split(":").slice(1).join(":")}`);
  assert.ok(
    pack.placements.every((item) => ["APPROVED_WAITING_SCHEDULE", "PUBLISHED"].includes(item.publicationState)),
    "approved wave contains a placement outside the approved or published states",
  );
}
console.log(JSON.stringify({
  status: "PASS",
  releaseId: pack.releaseId,
  workId: work.id,
  placements: pack.placements.length,
  externalPublicationPerformed: pack.placements.some((item) => item.publicationState === "PUBLISHED"),
}, null, 2));
