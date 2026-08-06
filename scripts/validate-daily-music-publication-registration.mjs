import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const source = "ops/audience-engine/daily-music-release-candidates/DMW-20260805-7D--manifest.json";
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "dmw-publication-"));
try {
  const manifest = JSON.parse(fs.readFileSync(source, "utf8"));
  for (const release of manifest.releases) {
    const target = path.join(temp, path.basename(release.candidatePath));
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
    fs.writeFileSync(target, `${JSON.stringify(candidate, null, 2)}\n`);
    release.candidatePath = target;
  }
  manifest.publicationState = "HUMAN_APPROVAL_REQUIRED";
  manifest.externalPublicationPerformed = false;
  delete manifest.approval;
  const manifestPath = path.join(temp, "manifest.json");
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const approval = spawnSync(process.execPath, ["scripts/apply-daily-music-wave-approval.mjs", `--input=${manifestPath}`, `--human-approval-token=${manifest.batchApprovalToken}`, "--commit=true"], { encoding: "utf8" });
  assert.equal(approval.status, 0, approval.stderr);
  const candidate = JSON.parse(fs.readFileSync(manifest.releases[0].candidatePath, "utf8"));
  const placement = candidate.placements.find((item) => item.platform === "threads");
  const evidence = {
    placementId: placement.placementId,
    platform: "threads",
    publicUrl: "https://www.threads.net/@abi_hakusyaku/post/verifiedFixture123",
    publishedAt: "2026-08-05T03:16:00.000Z",
    reviewState: "PUBLIC_VISIBLE",
    aiDisclosureState: "DISCLOSED",
    mediaSha256: placement.approvedMediaSha256,
    chatUrl: placement.chatUrl,
  };
  const evidencePath = path.join(temp, "evidence.json");
  const run = (value, commit = false) => {
    fs.writeFileSync(evidencePath, `${JSON.stringify(value, null, 2)}\n`);
    return spawnSync(process.execPath, ["scripts/register-daily-music-publication.mjs", `--input=${manifestPath}`, `--evidence=${evidencePath}`, "--now=2026-08-05T03:20:00.000Z", ...(commit ? ["--commit=true"] : [])], { encoding: "utf8" });
  };
  const blockedYoutube = candidate.placements.find((item) => item.platform === "youtube");
  assert.notEqual(run({
    placementId: blockedYoutube.placementId,
    platform: "youtube",
    publicUrl: "https://www.youtube.com/shorts/blockedFixture123",
    publishedAt: "2026-08-05T03:16:00.000Z",
    reviewState: "PUBLIC_VISIBLE",
    aiDisclosureState: "DISCLOSED",
    mediaSha256: blockedYoutube.approvedMediaSha256,
    chatUrl: blockedYoutube.chatUrl,
  }).status, 0, "non-clickable YouTube Shorts ingress was registerable");
  assert.notEqual(run({ ...evidence, publicUrl: "https://example.com/fake" }).status, 0, "wrong host accepted");
  assert.notEqual(run({ ...evidence, mediaSha256: crypto.createHash("sha256").update("wrong").digest("hex") }).status, 0, "wrong media accepted");
  assert.notEqual(run({ ...evidence, publishedAt: "2026-08-05T03:14:00.000Z" }).status, 0, "early publication accepted");

  const instagramStory = candidate.placements.find((item) => item.platform === "instagram");
  const verticalSource = candidate.placements.find((item) => item.platform === "tiktok");
  instagramStory.media = verticalSource.media;
  instagramStory.approvedMediaSha256 = verticalSource.approvedMediaSha256;
  instagramStory.ingress = { mechanism: "instagram_story_link_sticker", status: "READY" };
  instagramStory.publicationFormat = "STORY_9_16_WITH_LINK_STICKER";
  instagramStory.publicationRequirements = { exactLinkStickerDestination: instagramStory.chatUrl, failClosedIfStickerUnavailable: true, canonicalStoryUrlRequired: true };
  fs.writeFileSync(manifest.releases[0].candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
  const storyEvidence = {
    placementId: instagramStory.placementId,
    platform: "instagram",
    publicUrl: "https://www.instagram.com/stories/abi_hakusyaku/1234567890/",
    publishedAt: "2026-08-05T03:16:00.000Z",
    reviewState: "PUBLIC_VISIBLE",
    aiDisclosureState: "DISCLOSED",
    mediaSha256: instagramStory.approvedMediaSha256,
    chatUrl: instagramStory.chatUrl,
    publicationFormat: "STORY_9_16_WITH_LINK_STICKER"
  };
  assert.notEqual(run(storyEvidence).status, 0, "Instagram Story without visible exact Link sticker was registerable");
  assert.notEqual(run({ ...storyEvidence, linkStickerVisible: true, linkStickerDestination: "https://example.com/wrong" }).status, 0, "Instagram Story wrong Link sticker destination accepted");
  assert.equal(run({ ...storyEvidence, linkStickerVisible: true, linkStickerDestination: instagramStory.chatUrl }).status, 0, "valid Instagram Story evidence rejected");

  const youtubeLongForm = candidate.placements.find((item) => item.platform === "youtube");
  youtubeLongForm.ingress = { mechanism: "clickable_long_form_description_url", status: "READY" };
  youtubeLongForm.publicationFormat = "LONG_FORM_16_9";
  youtubeLongForm.publicationRequirements = { exactDescriptionChatUrl: youtubeLongForm.chatUrl, descriptionLinkClickable: true, failClosedIfShortsUrl: true };
  fs.writeFileSync(manifest.releases[0].candidatePath, `${JSON.stringify(candidate, null, 2)}\n`);
  const youtubeEvidence = {
    placementId: youtubeLongForm.placementId,
    platform: "youtube",
    publicUrl: "https://www.youtube.com/watch?v=verifiedFixture123",
    publishedAt: "2026-08-05T03:16:00.000Z",
    reviewState: "PUBLIC_VISIBLE",
    aiDisclosureState: "DISCLOSED",
    mediaSha256: youtubeLongForm.approvedMediaSha256,
    chatUrl: youtubeLongForm.chatUrl,
    publicationFormat: "LONG_FORM_16_9"
  };
  assert.notEqual(run(youtubeEvidence).status, 0, "YouTube long-form without clickable exact description URL was registerable");
  assert.notEqual(run({ ...youtubeEvidence, publicUrl: "https://www.youtube.com/shorts/invalidFixture", descriptionLinkClickable: true, descriptionChatUrl: youtubeLongForm.chatUrl }).status, 0, "Shorts URL accepted as long-form evidence");
  assert.equal(run({ ...youtubeEvidence, descriptionLinkClickable: true, descriptionChatUrl: youtubeLongForm.chatUrl }).status, 0, "valid YouTube long-form evidence rejected");

  const dry = run(evidence);
  assert.equal(dry.status, 0, dry.stderr);
  assert.equal(JSON.parse(fs.readFileSync(manifest.releases[0].candidatePath, "utf8")).placements.find((item) => item.placementId === placement.placementId).publicationState, "APPROVED_WAITING_SCHEDULE");
  const committed = run(evidence, true);
  assert.equal(committed.status, 0, committed.stderr);
  const stored = JSON.parse(fs.readFileSync(manifest.releases[0].candidatePath, "utf8")).placements.find((item) => item.placementId === placement.placementId);
  assert.equal(stored.publicationState, "PUBLISHED");
  assert.deepEqual(stored.publicationEvidence, evidence);
  const replay = run(evidence, true);
  assert.equal(replay.status, 0, replay.stderr);
  assert.equal(JSON.parse(replay.stdout).status, "ALREADY_REGISTERED_IDENTICAL");
  assert.notEqual(run({ ...evidence, publicUrl: "https://www.threads.net/@abi_hakusyaku/post/conflict" }, true).status, 0, "conflicting replay accepted");
  console.log("daily music publication registration: PASS — exact evidence only; Story Link sticker and YouTube clickable-description proof fail closed; dry-run immutable; replay idempotent; conflicts rejected");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
