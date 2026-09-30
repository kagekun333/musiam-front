import path from "node:path";
import { classifyRuntimePath, config, currentState, git, readJson, REPO } from "./_shared.mjs";

const cfg = config();
const state = currentState();
const receipt = readJson(path.join(REPO, cfg.receiptPath));
const runtimeCommit = receipt.runtimeSourceCommit;

let changedPaths = [];
try {
  const out = git(["diff", "--name-only", `${runtimeCommit}..HEAD`]);
  changedPaths = out ? out.split("\n").filter(Boolean) : [];
} catch {
  changedPaths = [];
}

const classified = changedPaths.map((file) => ({ file, class: classifyRuntimePath(file, cfg) }));
const runtimeDelta = classified.filter((item) => item.class === "RUNTIME_OR_UNKNOWN");
const deployControlDelta = classified.filter((item) => item.class === "DEPLOY_CONTROL");
const nonRuntimeDelta = classified.filter((item) => item.class === "NON_RUNTIME");

const verdict = runtimeDelta.length
  ? "PRODUCTION_RUNTIME_BEHIND_LOCAL"
  : deployControlDelta.length
    ? "RUNTIME_PARITY_WITH_DEPLOY_CONTROL_DELTA"
    : changedPaths.length
      ? "RUNTIME_PARITY_WITH_NON_RUNTIME_LOCAL_AHEAD"
      : "LOCAL_EQUALS_RECORDED_RUNTIME_SOURCE";

console.log(JSON.stringify({
  verdict,
  ...state,
  recordedProductionDeploymentId: receipt.productionDeploymentId,
  recordedRuntimeSourceCommit: runtimeCommit,
  recordedManifestSha256: receipt.deployManifestSha256,
  changedPathCount: changedPaths.length,
  runtimeDelta,
  deployControlDelta,
  nonRuntimeDelta,
}, null, 2));

if (runtimeDelta.length) process.exitCode = 3;
