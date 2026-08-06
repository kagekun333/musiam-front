import assert from "node:assert/strict";
import fs from "node:fs";

const candidate = JSON.parse(fs.readFileSync("ops/audience-engine/DMW-20260805-youtube-longform-approval-candidate.json", "utf8"));
assert.equal(candidate.status, "HUMAN_APPROVAL_REQUIRED");
assert.equal(candidate.outputs.length, 7);
assert.match(candidate.aggregateSha256, /^[a-f0-9]{64}$/);
assert.equal(candidate.approvalToken, `APPROVE_DAILY_MUSIC_YOUTUBE_LONGFORM:${candidate.waveId}:${candidate.aggregateSha256.slice(0, 16)}`);
for (const output of candidate.outputs) {
  assert.equal(output.width, 1920);
  assert.equal(output.height, 1080);
  assert.ok(output.durationSeconds >= 14.5 && output.durationSeconds <= 15.5);
  assert.equal(output.hasAudio, true);
  assert.match(output.outputSha256, /^[a-f0-9]{64}$/);
  assert.match(output.chatUrl, /utm_source=youtube/);
}
console.log("daily music YouTube long-form candidates: PASS");
