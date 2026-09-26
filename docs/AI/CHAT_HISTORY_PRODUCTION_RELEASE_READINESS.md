# 伯爵MUSIAM — Chat history Production release readiness

`CHAT_HISTORY_PRODUCTION_RELEASE_READINESS = READY_FOR_STAGED_PRODUCTION_HUMAN_GATE`

This Gate completes the user-authorized separation of raw deploy input, deploy-control changes, and application/runtime payload. It authorizes no Production operation. No deployment, traffic/domain/alias change, environment change, secret-value access, customer Redis operation, normal Chat provider call, payment operation, or push occurred.

## State Lock and historical observations

Canonical repository: `/Users/kagekun/Desktop/musiam-front-clean`.
Starting HEAD: `d745c61f9f3817a6c32ac82716b3948c9fb95eb7`.
Branch: `recovery/musiam-clean-20260920`.

The expected existing tracked diff was `.vercelignore` only; staged paths were 0. The three readiness records, `.pnpm-store/`, and the two protected daily roots were the only untracked paths. No reset, restore, clean, stash, checkout rollback, protected-data modification or deletion was performed.

The original `BLOCKED_SOURCE_PARITY` observation remains in the machine record's `historicalObservation`. It measured 3,210 entries / 214,069,826 bytes with two added audit validators in the deploy input. The subsequent `BLOCKED_DEPLOY_INPUT_PARITY` observation is retained separately in `previousRemediation`: 3,208 entries / 214,053,275 bytes / `a669040d9a05b72c5b6001dd318a2b5690bfdaed672457d2163ffa46b66cc498`. Neither historical failure is relabeled as a PASS.

## Independent release contracts

| Contract | Current result |
| --- | --- |
| `APPLICATION_RUNTIME_DRIFT` | `0` |
| `RUNTIME_DEPLOY_PAYLOAD_PARITY` | `PASS` |
| `DEPLOY_CONTROL_DELTA` | `SAFE_MINIMAL_AUDIT_ONLY` |
| `PROTECTED_OPERATIONAL_DATA_EXPOSURE` | `0` |
| `FULL_RAW_DEPLOY_INPUT_PARITY` | `NOT_EQUAL_BY_REVIEWED_DEPLOY_CONTROL_DELTA` |

The Preview source `b92a3c43e223e08dcd76fcb5869dc3244f460714` differs from the starting HEAD only in the Preview retry report, machine record, and audit validator. No application/runtime source changed during this Gate.

The two audit scripts have no references in application/build entry points or package scripts. They are governance checks, not application runtime imports or build/runtime source of truth:

- `scripts/validate-chat-history-preview-deployment-retry.mjs`
- `scripts/validate-chat-history-production-release-readiness.mjs`

## Deploy-control review and protected roots

`.vercelignore` adds exactly four paths; no existing rule is removed, no broad wildcard is added, and no application/runtime source is excluded:

- `scripts/validate-chat-history-preview-deployment-retry.mjs`
- `scripts/validate-chat-history-production-release-readiness.mjs`
- `ops/market-learning/daily-20260926`
- `ops/market-learning/daily-20260925`

The first three lines are the previous 157-byte remediation. The final 35-byte line is necessary for this Gate's stricter no-enumeration boundary. Vercel CLI's recursive collector enters a directory before excluding its descendants when the rule has a trailing slash. The existing `daily-20260925/` rule is preserved, while the additional exact root rule prevents entry into that directory. Both roots are now pruned before traversal.

The canonical roots received only existence/type metadata checks. Fail-closed filesystem guards prohibit their directory enumeration, file/content reads, open/readlink operations and hashing. Guards throw on access; they do not return artificial empty listings or modify collector output. Protected roots and `.pnpm-store/` were not modified, moved, deleted, staged or committed.

| Root | Descendant file entries | Payload bytes | Content IDs | Symlink/special payload | Directory metadata entries |
| --- | ---: | ---: | ---: | ---: | ---: |
| `ops/market-learning/daily-20260925` | 0 | 0 | 0 | 0 | 0 |
| `ops/market-learning/daily-20260926` | 0 | 0 | 0 | 0 | 0 |

The historical Preview contained one zero-byte, no-content-ID directory marker for the first root (`EMPTY_DIRECTORY_ENTRY_NO_DATA_EXPOSURE`). Current input excludes it entirely. This is an explicit deploy-control/metadata delta, not a hidden runtime-payload deletion.

`.pnpm-store/` is `KNOWN_LOCAL_GENERATED_ARTIFACT`: deploy inclusion, Git tracked count, staged count and runtime relevance are all 0. Its task-generated provenance is carried forward without content inspection; it remains in place and is not a readiness blocker. `.env*`, private/secret configuration, Chat fixtures, and `docs/AI/` / `ops/product/` file payload inclusion are also 0.

## Reproducible payload proof

The validator uses the installed **Vercel CLI 59.23.2** offline `inspectDeploymentFiles`. Raw SHA-256 is computed from the collector-ordered JSON `[path, mode, sha]` tuples. Actual collector results are not rewritten or normalized.

1. Collect current canonical input under fail-closed protected-root guards.
2. Reconstruct the baseline in new temporary storage from Preview Git blobs, only for actual safe deploy payload paths. Preserve observed filesystem modes, since Git retains executable bits but not `0600` versus `0644`. Reproduce the known historical protected-root directory marker using a new empty scratch directory; no real protected root is copied or explored.
3. Run the same unmodified collector on this reconstruction and require the **complete historical raw manifest** to match the independently fixed Preview count, bytes and hash. A Git-mode-only reconstruction initially failed and was rejected; retaining filesystem modes reproduced the historical hash exactly. No canonical permission was changed.
4. Replay the previous `.vercelignore` in scratch and reproduce `a669040d…` exactly. A complete tuple comparison proves that its only difference from Preview is `.vercelignore`, with precisely 157 additional bytes.
5. Classify `.vercelignore` as deploy control and the one historical zero-byte protected directory marker as excluded operational metadata. Audit validators are confirmed absent from actual input. Compare **every remaining entry**, including conservative non-application entries, without additional filtering: exact path, mode, content ID and size equality; counts and bytes also match.

The reconstructed baseline is a local replay anchored by the original approved full raw digest. It is not a new remote deployment, an arbitrary replacement expected SHA, or a counterfactual presented as canonical actual input.

| Measurement | Entries | Regular files | Directory metadata | Bytes | SHA-256 |
| --- | ---: | ---: | ---: | ---: | --- |
| Verified Preview raw, reproduced | 3,208 | 3,200 | 8 | 214,053,118 | `c86dad16b2fdac9a11a08bf4daa3f0680037baa9a63e19f10f152e00f95d5284` |
| Previous remediation raw, reproduced | 3,208 | 3,200 | 8 | 214,053,275 | `a669040d9a05b72c5b6001dd318a2b5690bfdaed672457d2163ffa46b66cc498` |
| Current actual raw | 3,207 | 3,200 | 7 | 214,053,310 | `8e6aa088f101e59e036be170609634488937455df64404c25d2ce1045904c493` |
| Runtime/conservative payload, equal on both sides | 3,206 | 3,199 | 7 | 214,051,977 | `205e6492b7db9dba03c4c4527775390b4a04677bf9a12f95c62625704d16d6b9` |

The only current raw delta paths are `.vercelignore` (1,141 → 1,333 bytes) and the removed protected empty-directory marker. `DEPLOY_INPUT_DRIFT = 0` is deliberately not claimed.

## Live continuity and environment boundary

Read-only Vercel deployment metadata was refreshed in this attempt; the exact timestamp and responses are recorded in `continuity` of the machine record.

- Preview `dpl_Bc9YHMTXaqgV9qnxHbrmLZRW16pT`: exists, READY, Preview target (`null`), no aliases, source SHA `b92a3c43e223e08dcd76fcb5869dc3244f460714`.
- Production `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX`: exists, READY, target `production`; aliases remain `www.hakusyaku.xyz`, `hakusyaku.xyz`, `musiam-front.vercel.app`, and `musiam-front-hakusyakus-projects.vercel.app`.
- A direct metadata lookup of `www.hakusyaku.xyz` resolves to that same Production deployment.
- The deployment list still marks that Production deployment as a rollback candidate. It is the retained rollback target; rollback execution is untested.

Previous bounded Preview smoke evidence is carried forward without another remote smoke. Existing Production has not received the current Chat history contract.

`PRODUCTION_ENV_CONTRACT = PRESENT_METADATA_ONLY` remains based on the user-reported human Dashboard confirmation that `KV_REST_API_URL` and `KV_REST_API_TOKEN` target All Environments. No environment-value API, secret value, or Redis connection was used. Redis connectivity and real customer-history behavior remain unverified. Concurrent PUT lost-update and bearer UUID query-string risks remain deferred.

## Local validation

| Validation | Result and scope |
| --- | --- |
| Typecheck | PASS; direct TypeScript, original config extended only to exclude protected roots and local store from traversal, incremental writes disabled |
| Scoped lint | PASS, 0 errors / 0 lint warnings for relevant Chat source and the current readiness validator; existing tool notice about legacy `.eslintignore` remains |
| Strengthening 01 / 02 | PASS 13 / 16 checks |
| R7-C1 / C2 | PASS 24 / 20 checks |
| R7-A Catalog | PASS, primary 450 / merged 514 |
| R7-B Chat recommendation | PASS, 15 cases, providerless |
| R7-D1 Exhibition | PASS, 514 displayed / 0 missing, Oracle inactive by design |
| Historical runtime-safety validator in canonical tree | BLOCKED at its old worktree allowlist after 2 checks; retained as a real failure, not relabeled |
| Unchanged runtime-safety validator in isolated sparse worktree/index | PASS 28 checks on current source; real clean isolated status, no Git-output mocking, canonical Git index unchanged |
| Runtime-safety HTTP fixture | PASS safe logging, invalid-ID 400 and oversized 413 using actual Next apiResolver/current route; customer-data/provider calls 0 |
| Current production-readiness validator | PASS; full contract, continuity, local evidence and prohibited-operation checks |
| `git diff --check` | PASS |

The HTTP fixture initially hit sandbox `listen EPERM`. A reviewed escalation allowed a loopback-only rerun, which passed. It ran with an empty inherited environment and fail-closed `.env`/protected-root reads, without `next dev` or dotenv loading. The unchanged fixture sent only invalid-ID PUTs and an oversized synthetic body, rejected before storage. No valid history GET/PUT/DELETE or normal Chat POST occurred.

The unchanged historical validator's old `BLOCKED_ENV_METADATA_UNVERIFIED` verdict remains a historical record assertion, not the current Gate's environment assessment. Its canonical worktree assertion is outside its original applicability; the isolated replay and current Gate's own worktree checks supply distinct evidence. Local fixtures and source audits do not prove Production persistence.

## Staged Production strategy and Human Gates

Recommended method: `STAGED_PRODUCTION_BUILD_THEN_PROMOTE`. The superseded recommendation was direct `VERCEL_PROMOTE_PREVIEW_TO_PRODUCTION`, which can rebuild with Production environment variables rather than serve the exact verified Preview artifact.

Next Gate: `CHAT_HISTORY_STAGED_PRODUCTION_DEPLOYMENT`.
Required approval: `APPROVE_CHAT_HISTORY_STAGED_PRODUCTION_DEPLOYMENT`.

Only after that separate approval, plan one `vercel --prod --skip-domain` deployment: Production environment settings and a Production-target build, without automatic custom Production domain assignment or changing current traffic. Validate that actual artifact before any traffic switch. See [CLI skip-domain](https://vercel.com/docs/cli/deploy#skip-domain) and [staged Production promotion](https://vercel.com/docs/deployments/promoting-a-deployment#staging-and-promoting-a-production-deployment). The local Skill's broad Preview/no-rebuild claim is not the authority.

Future permitted smoke candidates: `/`, `/chat`, invalid history GET/DELETE/PUT, oversized PUT, unsupported Chat GET, invalid Chat POST, and bounded deployment-scoped fatal/error/5xx counts. Valid history operations, normal Chat POST, Redis customer data, LLM providers and payments remain forbidden.

Only a PASS-verified staged Production deployment may later enter the separate `CHAT_HISTORY_PRODUCTION_TRAFFIC_PROMOTION` Human Gate. That promotion targets the staged deployment and does not rebuild it. Preview is not the promotion target. Reconfirm the existing Production/rollback target and aliases before either future operation.

## Local handoff

Only `.vercelignore`, this report, its machine record and the current readiness validator belong in the local Gate commit, with normal Husky/commitlint. The commit is a direct child of the starting HEAD; its identity is the containing Git commit, avoiding self-referential hash fields. No push is authorized. Protected roots and `.pnpm-store/` remain untracked and preserved.

Stop at `READY_FOR_STAGED_PRODUCTION_HUMAN_GATE`. The approval token above is recorded, not received. No staged build or Production traffic change is executed by this Gate.

Recommended next model: GPT-6 Astra / High.
