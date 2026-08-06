import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const manifestPath = path.join(root, "ops/audience-engine/abi-hakusyaku-launch-wave-01-native.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

assert.equal(manifest.status, "APPROVED_EXECUTION_IN_PROGRESS");
assert.equal(manifest.publicationGate.state, "APPROVED");
assert.ok(manifest.publicationGate.approvedAt, "Wave approval timestamp missing");
assert.ok(fs.existsSync(path.join(root, manifest.publicationGate.approvalEvidence)), "Wave approval evidence missing");
assert.equal(manifest.posts.length, 9, "exactly 9 foundation posts required");
assert.equal(new Set(manifest.posts.map((post) => post.id)).size, 9, "post ids must be unique");
assert.equal(manifest.posts.filter((post) => post.directSales).length, 0, "Wave 01 must contain no direct-sales post");
assert.ok(manifest.contentPolicy.directSalesShare <= manifest.contentPolicy.maximumDirectSalesShare);
assert.equal(manifest.videoPolicy.audio, "PLATFORM_NATIVE_AUDIO_HUMAN_GATE");

const expectedCounts = { instagram: 9, threads: 5, tiktok: 4, youtube: 4 };
const observedCounts = { instagram: 0, threads: 0, tiktok: 0, youtube: 0 };
let placementCount = 0;

for (const post of manifest.posts) {
  assert.ok(post.alt?.length >= 25, `${post.id}: useful alt text required`);
  assert.ok(fs.existsSync(path.join(root, "public", post.image.replace(/^\//, ""))), `${post.id}: image missing`);
  assert.ok(post.placements.instagram, `${post.id}: Instagram foundation placement required`);
  assert.ok(!post.placements.x, `${post.id}: X must remain frozen`);

  const nativeCopies = new Set();
  for (const [platform, placement] of Object.entries(post.placements)) {
    assert.ok(platform in observedCounts, `${post.id}: unsupported active platform ${platform}`);
    observedCounts[platform] += 1;
    placementCount += 1;
    assert.ok(placement.format?.length > 0, `${post.id}:${platform}: native format required`);
    assert.ok(placement.copy?.length >= 20, `${post.id}:${platform}: native copy required`);
    nativeCopies.add(placement.copy);
    assert.equal(placement.approvalToken, `APPROVE_EXTERNAL_POST:${post.id}:${platform}`);

    const url = new URL(placement.trackedUrl);
    assert.equal(url.origin, "https://www.hakusyaku.xyz");
    assert.equal(url.pathname, "/chat");
    assert.equal(url.searchParams.get("utm_source"), platform);
    assert.equal(url.searchParams.get("utm_medium"), "organic_social");
    assert.equal(url.searchParams.get("utm_campaign"), manifest.campaign);
    assert.equal(url.searchParams.get("utm_content"), post.id);
    assert.ok(!/330[,.]?000|33万円|税込330/i.test(placement.copy), `${post.id}:${platform}: direct price copy is forbidden in growth wave`);
    if (platform === "youtube") assert.ok(placement.title?.includes("#Shorts"), `${post.id}: YouTube Shorts title required`);
  }
  assert.equal(nativeCopies.size, Object.keys(post.placements).length, `${post.id}: copy must be platform-native, not duplicated`);

  if (post.verticalVideo) {
    const videoPath = path.join(root, "public", post.verticalVideo.replace(/^\//, ""));
    assert.ok(fs.existsSync(videoPath), `${post.id}: vertical video missing`);
    const probe = spawnSync("ffprobe", [
      "-v", "error", "-select_streams", "v:0",
      "-show_entries", "stream=codec_name,width,height,duration",
      "-of", "json", videoPath,
    ], { encoding: "utf8" });
    assert.equal(probe.status, 0, `${post.id}: ffprobe failed`);
    const stream = JSON.parse(probe.stdout).streams[0];
    assert.equal(stream.codec_name, "h264");
    assert.equal(stream.width, 1080);
    assert.equal(stream.height, 1920);
    assert.ok(Number(stream.duration) >= 14.9 && Number(stream.duration) <= 15.1, `${post.id}: video must be 15 seconds`);
  }
}

assert.deepEqual(observedCounts, expectedCounts);
assert.equal(placementCount, 22);

const ledgerPath = path.join(root, manifest.measurement.ledger);
assert.ok(fs.existsSync(ledgerPath), "measurement ledger missing");
const ledgerLines = fs.readFileSync(ledgerPath, "utf8").trim().split("\n");
assert.equal(ledgerLines.length, placementCount + 1, "ledger must contain one row per placement");
const ledgerStatusCounts = { HUMAN_APPROVAL_REQUIRED: 0, APPROVED_WAITING_SCHEDULE: 0, REVIEW_PENDING: 0, PUBLISHED: 0 };
for (const line of ledgerLines.slice(1)) {
  const columns = line.slice(1, -1).split('","');
  const [placementId, postId, platform, status, approvalToken, publishedAt, publicUrl] = columns;
  const metrics24h = columns.slice(7, 14);
  const metrics72h = columns.slice(14, 19);
  assert.equal(placementId, `${postId}:${platform}`, `${placementId}: placement identity mismatch`);
  assert.equal(approvalToken, `APPROVE_EXTERNAL_POST:${postId}:${platform}`, `${placementId}: approval token mismatch`);
  assert.ok(["HUMAN_APPROVAL_REQUIRED", "APPROVED_WAITING_SCHEDULE", "REVIEW_PENDING", "PUBLISHED"].includes(status), `${placementId}: unsupported status ${status}`);
  ledgerStatusCounts[status] += 1;

  if (["HUMAN_APPROVAL_REQUIRED", "APPROVED_WAITING_SCHEDULE", "REVIEW_PENDING"].includes(status)) {
    assert.equal(publishedAt, "", `${placementId}: unpublished placement cannot have published_at`);
    assert.equal(publicUrl, "", `${placementId}: unpublished placement cannot have public URL`);
    assert.ok([...metrics24h, ...metrics72h].every((value) => value === ""), `${placementId}: unpublished social KPI fields must be blank, not zero`);
  } else {
    assert.ok(publicUrl.startsWith("https://"), `${placementId}: submitted placement requires an evidence URL`);
  }

  if (status === "PUBLISHED") {
    assert.ok(!Number.isNaN(Date.parse(publishedAt)), `${placementId}: published placement requires an ISO timestamp`);
    const ageMs = Date.now() - Date.parse(publishedAt);
    if (ageMs < 24 * 60 * 60 * 1000) assert.ok(metrics24h.every((value) => value === ""), `${placementId}: 24h KPI cannot be written before maturity`);
    if (ageMs < 72 * 60 * 60 * 1000) assert.ok(metrics72h.every((value) => value === ""), `${placementId}: 72h KPI cannot be written before maturity`);
  }
}

assert.equal(ledgerStatusCounts.HUMAN_APPROVAL_REQUIRED, 0, "all 22 approval tokens were received; no placement may remain approval-blocked");
assert.equal(ledgerStatusCounts.APPROVED_WAITING_SCHEDULE + ledgerStatusCounts.PUBLISHED + ledgerStatusCounts.REVIEW_PENDING, placementCount);

console.log(JSON.stringify({
  status: "PASS",
  foundationPosts: manifest.posts.length,
  placements: placementCount,
  platformCounts: observedCounts,
  directSalesPosts: 0,
  ledgerStatusCounts,
  externalPublicationPerformed: ledgerStatusCounts.PUBLISHED > 0 || ledgerStatusCounts.REVIEW_PENDING > 0,
}, null, 2));
