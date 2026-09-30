import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const CONFIG_PATH = path.join(REPO, "ops/control-plane/config.json");

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function config() {
  return readJson(CONFIG_PATH);
}

export function git(args, options = {}) {
  return execFileSync("git", ["-C", REPO, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

export function gitMaybe(args) {
  try {
    return { ok: true, stdout: git(args) };
  } catch (error) {
    return {
      ok: false,
      stdout: String(error?.stdout ?? "").trim(),
      stderr: String(error?.stderr ?? "").trim(),
      status: error?.status ?? null,
    };
  }
}

export function currentState() {
  return {
    repo: REPO,
    branch: git(["branch", "--show-current"]),
    head: git(["rev-parse", "HEAD"]),
  };
}

export function isTrackedObject(sha) {
  return gitMaybe(["cat-file", "-e", `${sha}^{commit}`]).ok;
}

export function relation(localHead, remoteHead) {
  if (!remoteHead) return "REMOTE_BRANCH_MISSING";
  if (localHead === remoteHead) return "SYNCED";
  if (!isTrackedObject(remoteHead)) return "REMOTE_OBJECT_NOT_LOCAL";
  if (gitMaybe(["merge-base", "--is-ancestor", remoteHead, localHead]).ok) return "LOCAL_AHEAD";
  if (gitMaybe(["merge-base", "--is-ancestor", localHead, remoteHead]).ok) return "LOCAL_BEHIND";
  return "DIVERGED";
}

export function lsRemoteHeads(remote, refs) {
  const result = execFileSync("git", ["-C", REPO, "ls-remote", "--heads", remote, ...refs], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  const map = new Map();
  if (!result) return map;
  for (const line of result.split("\n")) {
    const [sha, ref] = line.trim().split(/\s+/);
    if (sha && ref) map.set(ref.replace(/^refs\/heads\//, ""), sha);
  }
  return map;
}

export function classifyRuntimePath(file, cfg) {
  if (cfg.deploymentControlPaths.includes(file)) return "DEPLOY_CONTROL";
  if (cfg.nonRuntimePrefixes.some((prefix) => file.startsWith(prefix))) return "NON_RUNTIME";
  return "RUNTIME_OR_UNKNOWN";
}
