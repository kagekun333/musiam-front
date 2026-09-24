# 伯爵MUSIAM — C4-F Final Blocker Preservation & Final Re-Review

`C4F_FINAL_BLOCKER_REMEDIATION = VERIFIED_COMPLETE` (authorized local commit closure is derived by the validator).
`C4F_FINAL_UNIQUE_PRESERVATION = VERIFIED_7_OF_7`.
`C4F_FINAL_DELETION_REVIEW = READY_FOR_HUMAN_DELETION_GATE`.

Seven exact current operational records / **35,049 logical bytes** now survive independently. Original remains present. **C4-G is closed and unstarted; deletion is not authorized.**

## State Lock and authority

Canonical starting HEAD: `d4259ba8b131aebf77766303b95740a9dae026b2`; branch `recovery/musiam-clean-20260920`; initially clean.
Original: `/Users/kagekun/Desktop/musiam-front`; HEAD `117379b6c61ab3fc072b6cd4b80ce1d406b0e175`; branch `codex/fix/stripe-metal-print-webhook-20260914`.
Before/after/live status: **102 modified / 0 staged / 433 untracked entries**, digest `602c7495aa6747521bdf758daae04ac42ad7cb19c1e19a20e0e7b2fcd7d95d89`; external linked worktrees=0.

Targets came only from `uniqueLossIfOriginalDeletedFinal` in the committed C4-F machine record. The old C4-F report/record/validator remain unchanged historical authority. C4-A/C4-C/C4-D/C4-E, C3-C, R0 STATE_LOCK/completion/extraction/mode records and Recovery Plan were read. Before preservation, the old C4-F validator passed **26,147 checks**, confirming its historical seven-file blocker and complete preservation continuity.

## Exact preservation

| Original-relative path | Logical bytes |
|---|---:|
| `ops/continuous-operation/experiments.json` | 16,409 |
| `ops/continuous-operation/state.json` | 12,667 |
| `ops/market-learning/daily-20260924/market-0730.json` | 746 |
| `ops/market-learning/daily-20260924/observation-0730.json` | 2,487 |
| `ops/market-learning/daily-20260924/reconciliation-0730.json` | 658 |
| `ops/market-learning/daily-20260924/state-lock.json` | 1,346 |
| `ops/market-learning/daily-20260924/stripe-0730.json` | 736 |
| **Total** | **35,049** |

Before any target content/hash/copy, the entire set passed path/stat screening: seven distinct regular files, no missing targets, root escapes, symlink components, C4-C private-path/inode overlap, `.env*`, credential/secret/key/token configuration or `.git` overlap. **SENSITIVE_OVERLAP=0**. This was metadata screening, not a secret-content scan.

The destination did not exist and was created exclusively:
`/Users/kagekun/Library/Application Support/MUSIAM/archive/cleanup-c4f-final-unique-20260924/`.

Only the exact seven files were placed in `preserved-source.tar`, retaining relative structure. No entire operational root, private file, `.git`, unrelated record or previously sufficient cross-path copy was added. Source snapshots retain path/type/logical size/mtime plus SHA-256 and ctime/inode/device/mode. Raw UTF-8 spellings and hex bytes are retained in the path sidecar. Raw unique=7; NFC unique=7; source/archive normalization collisions=0; mapping one-to-one.

| Artifact | SHA-256 |
|---|---|
| `preserved-source.tar` | `dbdea377ee6853a6c6a9b7cb14d99e8d550dca2dc26e0b0bcbe42548affa03d9` |
| `SOURCE_MANIFEST.json` | `4715840b67db75f263cc6378bfa710d6c954628e8a188d95312a4c668b53da09` |
| `RAW_PATH_MANIFEST.json` | `c982729f42caa39f5145b581492eaf3bc141e2969e0ecca2bd6a572adbfb31d3` |

The Python USTAR writer and independent `/usr/bin/tar` extractor were different implementations. Extraction beneath the new root's `.verify` yielded **7 files, 7/7 SHA-256, 7/7 size, 7/7 NFC paths; missing=0, extra=0**, and independent destination inodes. Only after all checks passed was that temporary `.verify` removed. The Node built-in-only validator additionally parses the retained USTAR bytes, verifies headers, exact membership and each payload digest without writing another extraction.

All seven sources matched their before-copy snapshots and C4-F identities after preservation, including type/size/mtime/SHA-256: **source drift=0**. No changed source was recopied or substituted.

## Current accounting and final unique-loss simulation

`ops/continuous-operation`: **37/37** current files accounted.
`ops/market-learning`: **190/190** current files accounted.

Before/after/current tracked, untracked and ignored path sets were compared using Git-generated NUL-separated paths. All **227 current content hashes** were refreshed against C4-F observations. New files=0; removed paths=0; updates=0; new meaningful unpreserved records=0. The two new `experiments-before.json` / `state-before.json` cross-path bindings to old C4-A ledger bytes remain unchanged; neither was copied again.

The machine record retains every one of the 102 modified and 433 untracked status entries, descendant counts and derived preservation dispositions. The exact seven-file accounting delta is overlaid on the old 8,164-file inventory; each status root is re-derived from meaningful contents rather than its continued directory existence.

- `UNACCOUNTED_MODIFIED_TRACKED = 0`.
- `UNACCOUNTED_UNTRACKED_ENTRIES = 0` (including both operational roots).
- `IGNORED_MEANINGFUL_STATE_UNRESOLVED = 0`.
- `UNIQUE_LOSS_IF_ORIGINAL_DELETED_FINAL = []`.
- `MEANINGFUL_UNIQUE_LOSS_COUNT = 0`; meaningful unique-loss bytes=0.

## Preservation and independence

R0 and C2 retained archive/hash/extraction authority remains valid with current existence/metadata continuity; enormous mixed archives were not rehashed or opened. The historical R0 v2 extraction summary contains mode issues; STATE_LOCK and the subsequent v3 summary document the separate full-mode pass (`mode_issues=0`). That earlier partial result is not presented as an independent full pass.

C3-C **383/383**, historical C4-A **21/21**, C4-C private **8/8**, C4-D ten artifacts and prior **321/321 + 3/3** reconstructions, C4-E dependency=0, and current C4-F **7/7** remain supported. C3-C/C4-A/C4-D normal artifacts are digest-checked. C4-C payloads are not read or hashed: current private metadata, owner-only modes and absence of ACLs support continuity of its recorded opaque 8/8 equality.

R5: **1,000/1,000** prior current-source identities and independent R0 authority remain continuous; `PRESERVE_HOLD / SEPARATE_BUSINESS_SCOPE` stays unchanged. No new 1,000-file hash pass is claimed. Future-product unpreserved source=0 for 伯爵Chat, Shaman Art, Drone Art, Letters, Intelligence Underground, Shop / Rare Objects and Analytics / Funnel. Those per-file authorities are carried forward with live inventory/metadata checks.

Git/history: **41/41 persistent refs**, **24/24 reflog-only commits**, all **10,893** readable ref/reflog-reachable objects independently retained; specified HEAD closure **7,549 objects, missing 0**; persistent-ref closure missing=0. Repaired blob A remains in R0. The pre-existing missing blob B and earlier external forensic gaps remain limitations, with additional meaningful history loss=0. No recursive Original `.git` payload enumeration occurred.

Canonical runtime dependency=0; canonical Git dependency=0; external linked worktree dependency=0. Live Git storage/alternates/shallow checks and canonical symlink/static-path checks are retained. Historical cleanup validators intentionally require Original before deletion; the new validator has the same classification. They cannot serve as post-deletion tests. Every preservation authority is outside Original; no application change, provider call or production check was performed.

## Exact future scope, allocation and Human Gate

Future deletion candidate remains **only** `/Users/kagekun/Desktop/musiam-front`: existing directory, not symlink, exact real path, expected repository/HEAD/branch, distinct from Canonical. No parent, sibling or preservation root is included.

Current read-only `du -sk` allocated size: **7,353,495,552 bytes** (7,181,148 KiB), unchanged from C4-F. This is an estimate of path allocation, not achieved filesystem reclaim.

Next Human Gate: **C4-G ORIGINAL REPOSITORY DELETION EXECUTION**.
Required later approval: **`APPROVE_C4G_ORIGINAL_REPOSITORY_DELETION`**.
That approval is absent. READY is review readiness only. A later approved C4-G must re-lock state and revalidate independent preservation before any deletion, and use Original-independent post-deletion checks.

## Validation, scope and truth boundary

Run `node scripts/validate-cleanup-c4f-final-blocker-remediation.mjs`, `git diff --check`, `git status --short`. No dependency reinstall or application tests are required for these four governance records.

The new validator reuses the old C4-F evidence kernel in an isolated scope; only historical commit/report closure is replaced by the current four-file closure, and this new historical validator is included in static dependency classification. The kernel still confirms the old BLOCKED result as historical evidence. The outer validator proves the new seven-file authority, refreshes all 227 root content checks, and derives the final zero-loss accounting. It does not rewrite the old review or merely trust a READY string.

Pre-commit validation: **PASS (1,719 current checks + 26,138 historical continuity checks)**; `git diff --check`: **PASS**; read-only validator/accounting review: no actionable findings. Current changed scope is exactly the four allowed records.

Only this report, `ops/recovery/cleanup-c4f-final-blocker-remediation-20260924.json`, `scripts/validate-cleanup-c4f-final-blocker-remediation.mjs` and appended `docs/AI/RECOVERY_PLAN.md` may change. Authorized local commit: `recovery: preserve final original-repo deltas`; push prohibited. Committed closure is derived from direct parent, exact scope, message and clean tree.

Original deletion/writes/source moves, branch/ref/archive deletions, private-preservation changes, application changes and provider/payment/deploy/push=0. One new archive was created; only its fully verified temporary extraction was removed.

Validator PASS is not deletion permission, production parity, demand, payment, fulfillment, rights or product adoption. Private payloads and large mixed archives were not newly byte-verified. Metadata/hash observations are point-in-time evidence, not a guarantee against future writers. Scoped operation counters are not an OS-wide syscall audit; authorized Git status may internally inspect tracked files. Same-disk independent preservation is not disaster backup. Recommended next model: current parent **GPT-6 Astra / High**, with no configuration or provider change.
