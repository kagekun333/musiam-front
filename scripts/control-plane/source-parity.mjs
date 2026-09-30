import { config, currentState, git, lsRemoteHeads, relation } from "./_shared.mjs";

const cfg = config();
const state = currentState();
const heads = lsRemoteHeads(cfg.remote, [`refs/heads/${state.branch}`, "refs/heads/main"]);
const branchHead = heads.get(state.branch) ?? null;
const mainHead = heads.get("main") ?? null;
const remoteUrl = git(["remote", "get-url", cfg.remote]);

let mainRelation = "UNKNOWN";
if (mainHead) mainRelation = relation(state.head, mainHead);

const result = {
  verdict: branchHead === state.head ? "SOURCE_PARITY_REMOTE_SYNCED"
    : branchHead ? "SOURCE_PARITY_REMOTE_DRIFT"
      : "SOURCE_PARITY_REMOTE_BRANCH_MISSING",
  ...state,
  remote: cfg.remote,
  remoteUrl,
  remoteBranchHead: branchHead,
  remoteMainHead: mainHead,
  currentBranchRelation: relation(state.head, branchHead),
  mainRelation,
};

console.log(JSON.stringify(result, null, 2));
if (result.currentBranchRelation === "LOCAL_BEHIND" || result.currentBranchRelation === "DIVERGED") process.exitCode = 2;
