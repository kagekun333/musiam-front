import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { config, currentState, readJson, REPO } from "./_shared.mjs";

const cfg = config();
const state = currentState();
const receipt = readJson(path.join(REPO, cfg.receiptPath));

assert.ok(state.head);
assert.ok(state.branch);
assert.equal(cfg.remote, "origin");
assert.equal(cfg.productionDomain, "hakusyaku.xyz");
assert.ok(Array.isArray(cfg.humanOwnedPaths) && cfg.humanOwnedPaths.length >= 2);
assert.ok(Array.isArray(cfg.protectedRoots) && cfg.protectedRoots.length >= 3);
assert.match(receipt.productionDeploymentId, /^dpl_/);
assert.match(receipt.runtimeSourceCommit, /^[a-f0-9]{40}$/);
assert.match(receipt.deployManifestSha256, /^[a-f0-9]{64}$/);
assert.equal(receipt.productionState, "READY");

const gitignore = fs.readFileSync(path.join(REPO, ".gitignore"), "utf8");
const vercelignore = fs.readFileSync(path.join(REPO, ".vercelignore"), "utf8");
assert.match(gitignore, /^\.musiam\/control-plane\/$/m);
assert.match(vercelignore, /^ops\/control-plane\/$/m);
assert.match(vercelignore, /^scripts\/control-plane\/$/m);

console.log(JSON.stringify({
  verdict: "MUSIAM_CONTROL_PLANE_LOCAL_VALIDATION=PASS",
  head: state.head,
  branch: state.branch,
  productionDeploymentId: receipt.productionDeploymentId,
}, null, 2));
