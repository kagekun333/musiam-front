# MUSIAM CONTROL PLANE RUNBOOK

Status: ACTIVE v1
Authority: `MUSIAM_MASTER_STRATEGY_LOCK_2026-09-30.md` の Phase 0 を実装する運用runbook。

## 1. Canonical source

Canonical local repo:

`/Users/kagekun/Desktop/musiam-front-clean`

各作業開始時に必ず確認:

```bash
git rev-parse HEAD
git branch --show-current
git status --porcelain=v1 --untracked-files=no
node scripts/control-plane/source-parity.mjs
node scripts/control-plane/drift-check.mjs
node scripts/control-plane/lease.mjs status
```

plain `git status` やglobal untracked enumerationは、Gateで明示許可されていない限り使わない。

## 2. Single-writer lease

Chat / Work / Codex / agentは、repoへ書く前にleaseを取る。

例:

```bash
node scripts/control-plane/lease.mjs acquire \
  --task CATALOG_INTELLIGENCE_GRAPH_V1 \
  --owner chatgpt \
  --allow src/lib/catalog-intelligence.ts,scripts/validate-catalog-intelligence.ts \
  --ttl-minutes 120
```

競合中は同じrepoへ書かない。別worktreeを使うか、既存task終了を待つ。

作業終了:

```bash
node scripts/control-plane/lease.mjs release --task CATALOG_INTELLIGENCE_GRAPH_V1
```

Active leaseは `.musiam/control-plane/active-lease.json` に保存され、GitおよびVercel payloadには入らない。

## 3. Change envelope

各taskは最低限以下を明示する。

- task ID
- owner agent
- starting HEAD
- allowed paths
- denied paths
- human-owned files
- protected roots
- network/data policy
- production policy
- success criteria
- rollback / stop criteria

「この例だけ直す」ではなく、要求を一般化できる場合は一般化した設計を優先する。

## 4. Protected / Human-owned

Current Human-owned:

- `ops/continuous-operation/experiments.json`
- `ops/continuous-operation/state.json`

Current protected roots:

- `ops/market-learning/daily-20260925`
- `ops/market-learning/daily-20260926`
- `ops/market-learning/daily-20260927`

Gateがzero-touchを要求する場合、NO_READ / NO_STAT / NO_LIST / NO_HASH / NO_TRAVERSE / NO_STAGE / NO_DEPLOY。

## 5. Local / Remote / Production are separate truths

Never infer:

- local commit == remote
- remote commit == Production
- Preview == Production
- deployment alias metadata == source proof

Use:

```bash
node scripts/control-plane/source-parity.mjs
node scripts/control-plane/drift-check.mjs
```

Production truth is recorded in:

`ops/control-plane/latest-production-receipt.json`

The receipt must be refreshed after each successful Production release.

## 6. Safe deploy

Do not deploy raw dirty working tree.

Preferred pipeline:

```
committed authority
→ safe synthetic source
→ protected/human/env/private exclusion
→ manifest + hash
→ Preview
→ smoke
→ Production
→ receipt
```

Control-plane scripts and records are excluded from Vercel deploy input.

## 7. Production release receipt

A successful Production release records at least:

- runtime source commit
- deploy manifest SHA-256
- Preview deployment ID
- Production deployment ID
- previous Production deployment ID
- rollback availability
- critical route smoke
- error/fatal count
- 5xx count

A local HEAD can legitimately be ahead of Production when the delta is only docs/control-plane records. `drift-check.mjs` classifies this separately from runtime drift.

## 8. Repair protocol

When drift or a bad agent action is detected:

1. Stop new writes.
2. Read active lease.
3. Capture starting/current HEAD.
4. Classify changed paths.
5. Compare against latest Production receipt.
6. Determine mutation scope: local / remote / Preview / Production / data.
7. Do not overwrite remote or Production blindly.
8. Repair in an isolated change envelope.
9. Add a regression guard for repeatable failure classes.
10. Refresh receipt after successful release.

## 9. Incident classes

Track at minimum:

- WRONG_SCOPE
- LOCAL_PATCH_ONLY
- OVERFIT_TO_EXAMPLE
- BROAD_SEARCH_BOUNDARY_VIOLATION
- DEPLOY_INPUT_CONTAMINATION
- STALE_PRODUCTION_ASSUMPTION
- BAD_IDENTITY_MERGE
- PROVIDER_TIMEOUT
- TOOL_PERMISSION_FAILURE
- PARTIAL_GATE
- UNVERIFIED_SUCCESS_CLAIM
- DATA_NAMESPACE_LEAK
- UI_API_PARITY_GAP

## 10. "次" protocol

For routine work, “次” means continue through:

design → implementation → targeted tests → critic → repair → Preview → smoke → next safe Gate.

Stop only for a real Human Gate or a safety blocker.

## 11. Current source-parity goal

At initial Control Plane rollout:

- `origin/main` is an ancestor of Canonical local HEAD.
- Canonical recovery branch is not yet present on remote.
- Safe action: publish the current recovery branch as a new remote branch and set upstream after local validation.
- Do not force-push or overwrite `main`.
