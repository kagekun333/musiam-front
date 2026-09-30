import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();
const control = JSON.parse(fs.readFileSync(path.join(repo, "ops/control-plane/config.json"), "utf8"));
const lanes = JSON.parse(fs.readFileSync(path.join(repo, "ops/control-plane/parallel-lanes.json"), "utf8"));
const script = fs.readFileSync(path.join(repo, "scripts/control-plane/parallel-lanes.mjs"), "utf8");

assert.equal(lanes.schemaVersion, 1);
assert.equal(lanes.canonicalBranch, "recovery/musiam-clean-20260920");
assert.equal(lanes.worktreeRoot, "/Users/kagekun/Desktop/MUSIAM_WORKTREES");
assert.equal(lanes.mergePolicy, "FF_ONLY_AFTER_REBASE_AND_VALIDATION");
assert.equal(lanes.remotePublishPolicy, "ON_FIRST_MEANINGFUL_COMMIT");
assert.equal(lanes.lanes.length, 5);
assert.equal(control.parallel?.laneConfigPath, "ops/control-plane/parallel-lanes.json");
assert.equal(control.parallel?.worktreeRoot, lanes.worktreeRoot);
assert.equal(control.parallel?.mergeQueuePath, lanes.mergeQueuePath);

const ids = new Set();
const branches = new Set();
const worktreeNames = new Set();

for (const lane of lanes.lanes) {
  assert.ok(lane.id && !ids.has(lane.id), `Duplicate/empty lane id: ${lane.id}`);
  assert.ok(lane.branch?.startsWith("lane/") && !branches.has(lane.branch), `Duplicate/invalid lane branch: ${lane.branch}`);
  assert.ok(["codex", "work", "openclaw"].includes(lane.preferredTool), `Invalid preferred tool: ${lane.preferredTool}`);
  assert.ok(Array.isArray(lane.allowedPaths) && lane.allowedPaths.length > 0, `Missing allowed paths: ${lane.id}`);
  assert.ok(Array.isArray(lane.sharedIntegrationPaths), `Missing shared integration paths: ${lane.id}`);
  ids.add(lane.id);
  branches.add(lane.branch);
  worktreeNames.add(lane.id);

  for (const rule of [...lane.allowedPaths, ...lane.sharedIntegrationPaths]) {
    for (const denied of control.humanOwnedPaths ?? []) {
      assert.notEqual(rule, denied, `Lane may not own Human path: ${lane.id} -> ${rule}`);
    }
    for (const protectedRoot of control.protectedRoots ?? []) {
      assert.ok(!(rule === protectedRoot || rule.startsWith(protectedRoot + "/")), `Lane may not own protected root: ${lane.id} -> ${rule}`);
    }
  }
}

assert.equal(ids.size, 5);
assert.equal(branches.size, 5);
assert.equal(worktreeNames.size, 5);

for (const token of [
  'command === "bootstrap"',
  'command === "status"',
  'command === "acquire"',
  'command === "release"',
  'command === "test"',
  'command === "sync"',
  'command === "queue"',
  'command === "dequeue"',
  'command === "merge-next"',
  'command === "publish"',
  "LANE_SCOPE_VIOLATION",
  "MERGE_QUEUE_PATH_CONFLICT",
  "VALIDATION_REQUIRED_FOR_CURRENT_HEAD",
  "SYNC_CONFLICT_REQUIRES_REVIEW",
  "FAST_FORWARD_ALREADY_INTEGRATED",
  "laneBaseUpdated",
]) {
  assert.ok(script.includes(token), `parallel-lanes.mjs missing guard/command: ${token}`);
}

const sharedOwners = new Map();
for (const lane of lanes.lanes) {
  for (const rule of lane.sharedIntegrationPaths) {
    const owners = sharedOwners.get(rule) ?? [];
    owners.push(lane.id);
    sharedOwners.set(rule, owners);
  }
}
assert.ok((sharedOwners.get("src/pages/api/chat-experience-v3.ts") ?? []).length >= 2, "Expected chat-experience-v3 to be explicitly shared");

console.log(JSON.stringify({
  verdict: "MUSIAM_PARALLEL_EXECUTION_LAYER=PASS_LOCAL_CONFIG",
  lanes: [...ids],
  branches: [...branches],
  worktreeRoot: lanes.worktreeRoot,
  sharedIntegrationOwners: Object.fromEntries(sharedOwners),
}, null, 2));
