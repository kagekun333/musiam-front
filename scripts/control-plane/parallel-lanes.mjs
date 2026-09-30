import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SCRIPT_REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const control = readJson(path.join(SCRIPT_REPO, "ops/control-plane/config.json"));
const CANONICAL = control.canonicalRepo || SCRIPT_REPO;
const lanesConfig = readJson(path.join(CANONICAL, "ops/control-plane/parallel-lanes.json"));
const WORKTREE_ROOT = lanesConfig.worktreeRoot;
const QUEUE_PATH = path.join(CANONICAL, lanesConfig.mergeQueuePath);

function git(repo, args, options = {}) {
  return execFileSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trimEnd();
}

function gitMaybe(repo, args) {
  try {
    return { ok: true, stdout: git(repo, args), stderr: "", status: 0 };
  } catch (error) {
    return {
      ok: false,
      stdout: String(error?.stdout ?? "").trim(),
      stderr: String(error?.stderr ?? "").trim(),
      status: Number(error?.status ?? 1),
    };
  }
}

function laneById(id) {
  const lane = lanesConfig.lanes.find((row) => row.id === id);
  if (!lane) throw new Error("Unknown lane: " + id);
  return lane;
}

function lanePath(lane) {
  return path.join(WORKTREE_ROOT, lane.id);
}

function laneStatePath(lane) {
  return path.join(lanePath(lane), lanesConfig.laneStatePath);
}

function validationPath(lane) {
  return path.join(lanePath(lane), lanesConfig.validationReceiptPath);
}

function ensureDir(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
}

function loadLaneState(lane) {
  const file = laneStatePath(lane);
  return fs.existsSync(file) ? readJson(file) : null;
}

function writeLaneState(lane, state) {
  const file = laneStatePath(lane);
  ensureDir(file);
  fs.writeFileSync(file, JSON.stringify(state, null, 2) + "\n", { mode: 0o600 });
}

function loadValidation(lane) {
  const file = validationPath(lane);
  return fs.existsSync(file) ? readJson(file) : null;
}

function clearValidation(lane) {
  fs.rmSync(validationPath(lane), { force: true });
}

function loadQueue() {
  if (!fs.existsSync(QUEUE_PATH)) return { schemaVersion: 1, entries: [] };
  return readJson(QUEUE_PATH);
}

function saveQueue(queue) {
  ensureDir(QUEUE_PATH);
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2) + "\n", { mode: 0o600 });
}

function matchesRule(file, rule) {
  if (!rule) return false;
  if (
    rule.endsWith("/")
    || rule.endsWith("_")
    || rule.endsWith("-")
    || !path.extname(rule)
  ) return file.startsWith(rule);
  return file === rule;
}

function laneAllows(lane, file) {
  return [...lane.allowedPaths, ...(lane.sharedIntegrationPaths ?? [])]
    .some((rule) => matchesRule(file, rule));
}

function denied(file) {
  if ((control.humanOwnedPaths ?? []).includes(file)) return true;
  return (control.protectedRoots ?? []).some((root) => file === root || file.startsWith(root + "/"));
}

function changedPaths(repo, base, head = "HEAD") {
  if (!base) return [];
  const out = gitMaybe(repo, ["diff", "--name-only", base + ".." + head]);
  if (!out.ok || !out.stdout) return [];
  return out.stdout.split("\n").filter(Boolean);
}

function scopeViolations(lane, files) {
  return files.filter((file) => denied(file) || !laneAllows(lane, file));
}

function trackedDirty(repo) {
  const out = git(repo, ["status", "--porcelain=v1", "--untracked-files=no"]);
  return out ? out.split("\n").filter(Boolean) : [];
}

function canonicalUnexpectedDirty() {
  return trackedDirty(CANONICAL).filter((line) => {
    const file = line.slice(3);
    return !(control.humanOwnedPaths ?? []).includes(file);
  });
}

function branchExists(branch) {
  return gitMaybe(CANONICAL, ["show-ref", "--verify", "--quiet", "refs/heads/" + branch]).ok;
}

function currentHead(repo) {
  return git(repo, ["rev-parse", "HEAD"]);
}

function currentBranch(repo) {
  return git(repo, ["branch", "--show-current"]);
}

function remoteHead(branch) {
  const out = gitMaybe(CANONICAL, ["ls-remote", "--heads", control.remote, "refs/heads/" + branch]);
  if (!out.ok || !out.stdout) return null;
  return out.stdout.split(/\s+/)[0] || null;
}

function worktreeRegistered(target) {
  const raw = git(CANONICAL, ["worktree", "list", "--porcelain"]);
  return raw.split("\n\n").some((block) => block.includes("worktree " + target));
}

function bootstrapLane(lane, baseCommit) {
  const target = lanePath(lane);
  fs.mkdirSync(WORKTREE_ROOT, { recursive: true });
  if (!fs.existsSync(target)) {
    if (branchExists(lane.branch)) {
      execFileSync("git", ["-C", CANONICAL, "worktree", "add", target, lane.branch], { stdio: "inherit" });
    } else {
      execFileSync("git", ["-C", CANONICAL, "worktree", "add", "-b", lane.branch, target, baseCommit], { stdio: "inherit" });
    }
  } else if (!worktreeRegistered(target)) {
    throw new Error("Path exists but is not a registered worktree: " + target);
  }

  const actualBranch = currentBranch(target);
  if (actualBranch !== lane.branch) {
    throw new Error("Worktree branch mismatch for " + lane.id + ": " + actualBranch);
  }

  const nodeModules = path.join(target, "node_modules");
  const canonicalNodeModules = path.join(CANONICAL, "node_modules");
  if (!fs.existsSync(nodeModules) && fs.existsSync(canonicalNodeModules)) {
    fs.symlinkSync(canonicalNodeModules, nodeModules, "dir");
  }

  const prior = loadLaneState(lane);
  const state = {
    schemaVersion: 1,
    lane: lane.id,
    branch: lane.branch,
    preferredTool: lane.preferredTool,
    canonicalBranch: lanesConfig.canonicalBranch,
    baseCommit: prior?.baseCommit ?? baseCommit,
    createdAt: prior?.createdAt ?? new Date().toISOString(),
    syncedAt: prior?.syncedAt ?? new Date().toISOString(),
  };
  writeLaneState(lane, state);
  return state;
}

function laneSnapshot(lane) {
  const target = lanePath(lane);
  const exists = fs.existsSync(target) && worktreeRegistered(target);
  if (!exists) {
    return {
      lane: lane.id,
      branch: lane.branch,
      preferredTool: lane.preferredTool,
      worktree: target,
      exists: false,
      remoteHead: remoteHead(lane.branch),
    };
  }
  const state = loadLaneState(lane);
  const head = currentHead(target);
  const files = state ? changedPaths(target, state.baseCommit, head) : [];
  const validation = loadValidation(lane);
  const leaseFile = path.join(target, control.leasePath);
  const lease = fs.existsSync(leaseFile) ? readJson(leaseFile) : null;
  return {
    lane: lane.id,
    branch: lane.branch,
    preferredTool: lane.preferredTool,
    worktree: target,
    exists: true,
    head,
    baseCommit: state?.baseCommit ?? null,
    canonicalHead: currentHead(CANONICAL),
    aheadCommits: state?.baseCommit ? Number(git(target, ["rev-list", "--count", state.baseCommit + ".." + head])) : null,
    changedPaths: files,
    scopeViolations: scopeViolations(lane, files),
    trackedDirty: trackedDirty(target),
    validation: validation && validation.head === head ? validation : null,
    validationStale: Boolean(validation && validation.head !== head),
    lease,
    remoteHead: remoteHead(lane.branch),
  };
}

function overlaps() {
  const snaps = lanesConfig.lanes.map(laneSnapshot).filter((snap) => snap.exists && snap.changedPaths?.length);
  const collisions = [];
  for (let i = 0; i < snaps.length; i += 1) {
    for (let j = i + 1; j < snaps.length; j += 1) {
      const b = new Set(snaps[j].changedPaths);
      const shared = snaps[i].changedPaths.filter((file) => b.has(file));
      if (shared.length) collisions.push({ lanes: [snaps[i].lane, snaps[j].lane], paths: shared });
    }
  }
  return collisions;
}

function parseNamed(args, name, fallback = null) {
  const i = args.indexOf("--" + name);
  return i >= 0 ? (args[i + 1] ?? fallback) : fallback;
}

function validationReceipt(lane, command, result) {
  const target = lanePath(lane);
  const state = loadLaneState(lane);
  const receipt = {
    schemaVersion: 1,
    lane: lane.id,
    branch: lane.branch,
    baseCommit: state?.baseCommit ?? null,
    head: currentHead(target),
    command,
    passed: result.status === 0,
    exitCode: result.status,
    validatedAt: new Date().toISOString(),
    stdoutTail: String(result.stdout ?? "").slice(-6000),
    stderrTail: String(result.stderr ?? "").slice(-6000),
  };
  const file = validationPath(lane);
  ensureDir(file);
  fs.writeFileSync(file, JSON.stringify(receipt, null, 2) + "\n", { mode: 0o600 });
  return receipt;
}

function runValidation(lane, command) {
  const target = lanePath(lane);
  const result = spawnSync("/bin/bash", ["-lc", command], {
    cwd: target,
    encoding: "utf8",
    timeout: 20 * 60 * 1000,
  });
  const receipt = validationReceipt(lane, command, result);
  console.log(JSON.stringify(receipt, null, 2));
  if (!receipt.passed) process.exitCode = 4;
}

function acquireLaneLease(lane, args) {
  const target = lanePath(lane);
  const task = parseNamed(args, "task");
  const owner = parseNamed(args, "owner");
  const ttl = parseNamed(args, "ttl-minutes", "180");
  if (!task || !owner) throw new Error("acquire requires --task and --owner");
  const allow = [...lane.allowedPaths, ...(lane.sharedIntegrationPaths ?? [])].join(",");
  const leaseScript = path.join(target, "scripts/control-plane/lease.mjs");
  const result = spawnSync(process.execPath, [
    leaseScript, "acquire",
    "--task", task,
    "--owner", owner,
    "--allow", allow,
    "--ttl-minutes", ttl,
  ], { cwd: target, encoding: "utf8" });
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  process.exitCode = result.status ?? 1;
}

function releaseLaneLease(lane, args) {
  const target = lanePath(lane);
  const task = parseNamed(args, "task");
  if (!task) throw new Error("release requires --task");
  const leaseScript = path.join(target, "scripts/control-plane/lease.mjs");
  const result = spawnSync(process.execPath, [leaseScript, "release", "--task", task], {
    cwd: target,
    encoding: "utf8",
  });
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  process.exitCode = result.status ?? 1;
}

function syncLane(lane) {
  const target = lanePath(lane);
  const state = loadLaneState(lane);
  if (!state) throw new Error("Lane is not bootstrapped: " + lane.id);
  if (trackedDirty(target).length) throw new Error("Lane has tracked dirty files: " + lane.id);
  const canonicalHead = currentHead(CANONICAL);
  const laneHead = currentHead(target);
  if (state.baseCommit === canonicalHead && laneHead === canonicalHead) {
    console.log(JSON.stringify({ synced: false, reason: "ALREADY_CURRENT", lane: lane.id, baseCommit: state.baseCommit }, null, 2));
    return;
  }

  // If the lane HEAD has already been integrated into Canonical, the lane is not
  // divergent work: it is simply stale after merge. Fast-forward the lane branch
  // to Canonical and reset its base so the worktree can be reused safely.
  if (gitMaybe(target, ["merge-base", "--is-ancestor", laneHead, canonicalHead]).ok) {
    const result = spawnSync("git", ["-C", target, "merge", "--ff-only", canonicalHead], { encoding: "utf8" });
    if (result.status !== 0) {
      process.stdout.write(result.stdout ?? "");
      process.stderr.write(result.stderr ?? "");
      process.exitCode = result.status ?? 1;
      return;
    }
    state.baseCommit = canonicalHead;
    state.syncedAt = new Date().toISOString();
    writeLaneState(lane, state);
    clearValidation(lane);
    console.log(JSON.stringify({
      synced: true,
      lane: lane.id,
      mode: "FAST_FORWARD_ALREADY_INTEGRATED",
      baseCommit: canonicalHead,
      head: currentHead(target),
    }, null, 2));
    return;
  }

  const laneFiles = changedPaths(target, state.baseCommit, laneHead);
  const canonicalFiles = changedPaths(CANONICAL, state.baseCommit, canonicalHead);
  const canonicalSet = new Set(canonicalFiles);
  const conflicts = laneFiles.filter((file) => canonicalSet.has(file));
  if (conflicts.length) {
    console.error(JSON.stringify({ error: "SYNC_CONFLICT_REQUIRES_REVIEW", lane: lane.id, conflicts }, null, 2));
    process.exitCode = 5;
    return;
  }
  const result = spawnSync("git", ["-C", target, "rebase", canonicalHead], { encoding: "utf8" });
  if (result.status !== 0) {
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    process.exitCode = result.status ?? 1;
    return;
  }
  state.baseCommit = canonicalHead;
  state.syncedAt = new Date().toISOString();
  writeLaneState(lane, state);
  clearValidation(lane);
  console.log(JSON.stringify({ synced: true, lane: lane.id, baseCommit: canonicalHead, head: currentHead(target) }, null, 2));
}

function queueLane(lane, note = "") {
  const snap = laneSnapshot(lane);
  if (!snap.exists) throw new Error("Lane is not bootstrapped: " + lane.id);
  if (snap.trackedDirty.length) throw new Error("Lane has tracked dirty files: " + lane.id);
  if (!snap.changedPaths.length) throw new Error("Lane has no committed changes: " + lane.id);
  if (snap.scopeViolations.length) {
    console.error(JSON.stringify({ error: "LANE_SCOPE_VIOLATION", lane: lane.id, paths: snap.scopeViolations }, null, 2));
    process.exitCode = 6;
    return;
  }
  if (!snap.validation || !snap.validation.passed) {
    console.error(JSON.stringify({ error: "VALIDATION_REQUIRED_FOR_CURRENT_HEAD", lane: lane.id, head: snap.head }, null, 2));
    process.exitCode = 7;
    return;
  }
  if (snap.baseCommit !== currentHead(CANONICAL)) {
    console.error(JSON.stringify({ error: "LANE_REBASE_REQUIRED", lane: lane.id, baseCommit: snap.baseCommit, canonicalHead: currentHead(CANONICAL) }, null, 2));
    process.exitCode = 8;
    return;
  }

  const queue = loadQueue();
  const otherEntries = queue.entries.filter((entry) => entry.lane !== lane.id);
  for (const entry of otherEntries) {
    const otherPaths = new Set(entry.changedPaths ?? []);
    const shared = snap.changedPaths.filter((file) => otherPaths.has(file));
    if (shared.length) {
      console.error(JSON.stringify({ error: "MERGE_QUEUE_PATH_CONFLICT", lane: lane.id, otherLane: entry.lane, paths: shared }, null, 2));
      process.exitCode = 9;
      return;
    }
  }

  queue.entries = otherEntries.concat([{
    lane: lane.id,
    branch: lane.branch,
    baseCommit: snap.baseCommit,
    head: snap.head,
    changedPaths: snap.changedPaths,
    sharedIntegrationPathsUsed: snap.changedPaths.filter((file) => (lane.sharedIntegrationPaths ?? []).some((rule) => matchesRule(file, rule))),
    validation: { command: snap.validation.command, validatedAt: snap.validation.validatedAt },
    note,
    queuedAt: new Date().toISOString(),
  }]);
  saveQueue(queue);
  console.log(JSON.stringify({ queued: true, entry: queue.entries.at(-1), queueLength: queue.entries.length }, null, 2));
}

function mergeNext(push = false) {
  const queue = loadQueue();
  const entry = queue.entries[0];
  if (!entry) throw new Error("Merge queue is empty");
  const lane = laneById(entry.lane);
  const snap = laneSnapshot(lane);
  const dirty = canonicalUnexpectedDirty();
  if (dirty.length) throw new Error("Canonical has unexpected tracked dirty files: " + dirty.join(", "));
  if (currentBranch(CANONICAL) !== lanesConfig.canonicalBranch) {
    throw new Error("Canonical repo is not on " + lanesConfig.canonicalBranch);
  }
  if (currentHead(CANONICAL) !== entry.baseCommit) {
    throw new Error("Canonical advanced; sync and requeue lane " + lane.id);
  }
  if (snap.head !== entry.head) throw new Error("Lane HEAD changed after queueing: " + lane.id);
  if (snap.trackedDirty.length) throw new Error("Lane became dirty after queueing: " + lane.id);
  if (!snap.validation || !snap.validation.passed) throw new Error("Lane validation is missing/stale: " + lane.id);
  if (snap.scopeViolations.length) throw new Error("Lane scope violation: " + snap.scopeViolations.join(", "));

  execFileSync("git", ["-C", CANONICAL, "merge", "--ff-only", lane.branch], { stdio: "inherit" });
  const mergedHead = currentHead(CANONICAL);
  const state = loadLaneState(lane);
  if (state) {
    state.baseCommit = mergedHead;
    state.syncedAt = new Date().toISOString();
    writeLaneState(lane, state);
    clearValidation(lane);
  }
  queue.entries.shift();
  saveQueue(queue);
  if (push) execFileSync("git", ["-C", CANONICAL, "push"], { stdio: "inherit" });
  console.log(JSON.stringify({ merged: true, lane: lane.id, head: mergedHead, pushed: push, laneBaseUpdated: Boolean(state), remainingQueue: queue.entries.length }, null, 2));
}

function publishLane(lane) {
  const target = lanePath(lane);
  execFileSync("git", ["-C", target, "push", "--set-upstream", control.remote, lane.branch], { stdio: "inherit" });
  console.log(JSON.stringify({ published: true, lane: lane.id, branch: lane.branch, head: currentHead(target) }, null, 2));
}

const [command = "status", laneArg, ...rest] = process.argv.slice(2);

try {
  if (command === "bootstrap") {
    const targetLanes = !laneArg || laneArg === "all" ? lanesConfig.lanes : [laneById(laneArg)];
    const base = currentHead(CANONICAL);
    const results = targetLanes.map((lane) => ({ lane: lane.id, state: bootstrapLane(lane, base), worktree: lanePath(lane) }));
    console.log(JSON.stringify({ bootstrapped: results.length, baseCommit: base, results }, null, 2));
  } else if (command === "status") {
    const snaps = laneArg && laneArg !== "all" ? [laneSnapshot(laneById(laneArg))] : lanesConfig.lanes.map(laneSnapshot);
    console.log(JSON.stringify({
      canonical: {
        repo: CANONICAL,
        branch: currentBranch(CANONICAL),
        head: currentHead(CANONICAL),
        unexpectedTrackedDirty: canonicalUnexpectedDirty(),
      },
      queue: loadQueue(),
      collisions: overlaps(),
      lanes: snaps,
    }, null, 2));
  } else if (command === "acquire") {
    acquireLaneLease(laneById(laneArg), rest);
  } else if (command === "release") {
    releaseLaneLease(laneById(laneArg), rest);
  } else if (command === "test") {
    const lane = laneById(laneArg);
    const divider = rest.indexOf("--");
    const commandParts = divider >= 0 ? rest.slice(divider + 1) : rest;
    if (!commandParts.length) throw new Error("test requires a command after --");
    runValidation(lane, commandParts.join(" "));
  } else if (command === "sync") {
    syncLane(laneById(laneArg));
  } else if (command === "queue") {
    queueLane(laneById(laneArg), parseNamed(rest, "note", "") ?? "");
  } else if (command === "dequeue") {
    const lane = laneById(laneArg);
    const queue = loadQueue();
    const before = queue.entries.length;
    queue.entries = queue.entries.filter((entry) => entry.lane !== lane.id);
    saveQueue(queue);
    console.log(JSON.stringify({ dequeued: before !== queue.entries.length, lane: lane.id, queueLength: queue.entries.length }, null, 2));
  } else if (command === "merge-next") {
    mergeNext(rest.includes("--push") || laneArg === "--push");
  } else if (command === "publish") {
    publishLane(laneById(laneArg));
  } else {
    throw new Error("Unknown command: " + command);
  }
} catch (error) {
  console.error(JSON.stringify({ error: "PARALLEL_EXECUTION_ERROR", message: String(error?.message ?? error) }, null, 2));
  process.exitCode = 2;
}
