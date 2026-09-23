# 伯爵MUSIAM — C4 Original Dirty Repository Decommission Review

`C4_DECOMMISSION_REVIEW = BLOCKED_UNPRESERVED_SOURCE`

Review is complete. Original deletion is not authorized and the Human deletion Gate remains closed. There are **21 confirmed meaningful unpreserved operational files (105,417 logical bytes)**, **35 unresolved private/local-configuration holds**, and **3 surviving linked worktrees dependent on Original's Git directory**. These are separate findings; validator PASS validates this blocked review, not deletion readiness.

## State Lock

| Item | Verified observation |
|---|---|
| Canonical starting HEAD | `233abd0cc6ef938ca5856ca646aaf7547b4beef6` |
| Canonical branch / initial tree | `recovery/musiam-clean-20260920` / clean |
| Original | `/Users/kagekun/Desktop/musiam-front` |
| Original HEAD | `117379b6c61ab3fc072b6cd4b80ce1d406b0e175` |
| Original branch | `codex/fix/stripe-metal-print-webhook-20260914` |
| Modified / staged / untracked status entries | **102 / 0 / 433** |
| Expanded untracked files / ignored files | 2,919 / 796; these are not the 433 status entries |
| Allocated size / estimated decommission reclaim | **7,357,771,776 bytes** (`du -sk`: 7,185,324 KiB; approximately 6.85 GiB) |

The exact status path set is checked against C3-A and its NUL-delimited digest is retained. Original Git queries used `--no-optional-locks` and disabled fsmonitor. No recursive Original `.git` filesystem enumeration, object-file parsing or file-by-file Git hashing occurred. The explicitly permitted aggregate `du` measurement is separate from Git inventory.

## Authorities and verification

The Recovery Plan, Cleanup Audit, C2 source-removal finalization, C3-A, C3-B and C3-C were read first. `STATE_LOCK.md`, R0 manifest/extraction/history reports, and the existing independent archives supplement them. Historical assertions were not rewritten as current observations.

R0 root: `/Users/kagekun/Library/Application Support/MUSIAM/recovery/20260920T-r0-completion-01a0beba/`. R0 history root: `/Users/kagekun/Library/Application Support/MUSIAM/recovery/20260920T-r0-history-recovery-01a0beba/`. Both are outside Original. R0's prior full pax extraction verification (4,442 tracked, 2,896 untracked, 1,585 preserved ignored files) remains the snapshot authority. Current non-sensitive files needing that authority were compared with its per-file hashes. R0 archive payloads containing private configuration were not reopened or rearchived.

During this C4 observation, SHA-256 was recalculated once for all four C2 archives, C2's raw path manifest, C3-C's archive and two manifests, and R0's HEAD bundle; every digest matched its authority. These live observations are recorded with file size and mtime. Subsequent validator runs check C2/bundle metadata continuity and those recorded digests, rather than repeating their large hash reads; C3-C's smaller artifacts are rehashed. The archives are physical files outside Original. Prior full extraction verification is reused; the large C2 sources were not rehashed. R0/HEAD bundle hash: `40e1c86b7cc580e82882318b1dfa4b52ab6b58c89e51f671eb79573de21b20b5`.

## Git history, OTHER_REFS and reflog

`HISTORY_RECOVERY = VERIFIED_COPY`. The R0 HEAD readback has 7,549 reachable objects and zero missing objects. Canonical and the independent R0 repair/readback repositories use their own Git directories and no alternates to Original.

`OTHER_REFS = ALL_CURRENT_PERSISTENT_REFS_INDEPENDENTLY_PRESERVED`.

The current inventory is **41 refs**: 20 branches, 12 remote-tracking refs, 3 tags, 1 stash ref and 5 Codex checkpoint-tree refs. All 41 exact ref tips exist independently in R0's repair copy. Every currently readable Original object reachable from each ref is present there, with no missing object in these persistent-ref closures. Twenty-seven tips are reachable in canonical; the other 14 are preserved in R0. All potentially meaningful history and checkpoint sources are retained; none were dismissed as expendable. Per-ref object/commit counts and preservation results are in the machine record.

There are **24 reflog-only commits**. All 24 are reachable from the independent repair copy's reflog. All **10,893 readable objects** reached through Original refs/reflogs are present independently: unique history loss = **0**, unpreserved persistent refs = **0**.

The historical `OTHER_REFS=INCOMPLETE` label is preserved in earlier records but is now narrowed: missing blob `445c5df9b9533971eb4d21810d70219b8d59955a` (`snapshot_20251006_020843.zip`) is in the reflog-only closure and missing from both Original and repair copy. It is a pre-existing recovery limitation, not additional information that deleting Original would destroy. R0 repaired the other missing Original blob for HEAD history. No Original Git repair, pruning, repacking, ref mutation or branch deletion occurred. Unreferenced objects outside persistent-ref/reflog reachability were not independently semantically audited; the existing R0 raw Git archive remains retained.

## Survivability matrix

The JSON expands each row with Original scope, independent destination, preservation authority, verification level, restoration status, unresolved uniqueness and blocker boolean.

| Category | Independent survival / verification | C4 blocker |
|---|---|---|
| Committed HEAD/history | R0 self-contained HEAD bundle/readback, live archive digest and Git closure | No |
| Non-HEAD refs/history | R0 repair copy, 41/41 exact refs and complete current persistent-ref closures | No |
| Tracked working-tree modifications | 65 C3-C, 32 current-content R0 matches, 4 Recovery supersessions; 1 private hold | Yes |
| Untracked files | All 433 entries classified; 430 restoration-accounted, 3 unresolved entries/roots | Yes |
| Ignored files | 796 classified; R0/C2/C3-C and regenerable scope; 25 private/local holds | Yes |
| R0 preservation material | Fixed private external archives, manifests, patches and history records | No for the recorded snapshot |
| R2/R3/R4 evidence | Canonical recovery evidence plus R0 source preservation; HOLD/experiment boundaries maintained | No |
| R5 Shaman | 1,000/1,000 current source files match independent R0 manifest size/SHA-256 | No; separate business HOLD remains |
| R6 operational truth | 1,583 current `ops` files: 1,379 same-path R0 matches, 181 HEAD files, 2 cross-path R0 matches, 21 unpreserved | Yes |
| C2 archive sources | Original output 1,134, former `_archive` 791, outputs 3 covered by external verified C2 archives | No |
| C3-C dirty-only sources | 383/383 preserved; archive/manifests digest match; current-source subreview matches | No |
| Environment/private/local config | 13 secret/env and 22 local holds; R0 membership only, current-content equality unknown | Yes |
| Regenerated/cache material | C1 caches remain absent; 7 remaining cache/nonessential files classified | No |
| Other Original state | Reflog preserved; 3 surviving worktrees share Original `.git`; missing external forensic files are pre-existing gaps | Yes, dependency |

## Status-entry and source accounting

All 102 modified and 433 untracked status entries have explicit per-entry dispositions in the JSON; **unclassified inventory entries = 0 / 0**. This must not be confused with verified restoration coverage:

- `UNACCOUNTED_MODIFIED_TRACKED = 1`: `.env.example` has only private R0 metadata evidence, with no current-content equality claim. The other 101 are mapped to C3-C preservation, exact R0 preservation, or Recovery supersession.
- `UNACCOUNTED_UNTRACKED_ENTRIES = 3`: `ops/continuous-operation`, `ops/market-learning`, and `scripts/audit-secret-hygiene.mjs`. The first two contain unpreserved operational evidence; the last is a conservative C3-A sensitive-path hold and was not reopened.
- Current ignored inventory: 733 R0 current-content matches, 22 C3-C files, 10 C2 files, 6 nonessential/cache files and 25 private/local holds = 796. No ignored entry is unclassified.

The non-Git review covered 7,020 current files outside C2 roots. Current C2 Original roots add 1,137 files. C3-B's 1,091 decisions remain fully accounted: 702 HEAD-preserved, 5 superseded, 1 regenerable and 383 resolved by C3-C. Those decisions do not cover every `ops` descendant: C3-B explicitly treated its `ops` handoff rows as context under `EVIDENCE_HOLD`. **EVIDENCE_HOLD is a retention rule, not proof of an independent current copy.**

R5 retains `PRESERVE_HOLD / SEPARATE_BUSINESS_SCOPE`. Its 1,000 current files match the R0 untracked manifest and prior verified archive exactly. The provenance records remain in R0/canonical. No application integration, public use, rights or quality approval follows from this preservation finding.

## UNIQUE_LOSS_IF_ORIGINAL_DELETED

Confirmed meaningful loss: **21 files / 105,417 bytes** within the audited preservation authorities. The JSON lists every path, role, uniqueness basis, existing preservation, recoverability, severity, required action and current hash.

| Scope | Confirmed unique files |
|---|---:|
| `ops/market-learning/daily-20260921/` | 5 |
| `ops/market-learning/daily-20260922/` | 7 |
| `ops/market-learning/daily-20260923/` | 7 |
| `ops/continuous-operation/state.json`, `experiments.json` | 2 |

The first pass found 23 current files not preserved at the same path. Cross-path content comparison proved that the September 21 `state-before.json` and `experiments-before.json` are identical to R0/canonical's older continuous-operation files; their path mapping is now retained in this review, so they are excluded from confirmed loss. The remaining 19 daily files postdate the R0 snapshot, and the two live ledgers differ from their R0/canonical copies. They retain operational observations and reconciliation history even where observation status is unavailable or blocked. They are not evidence of current sales, successful provider execution or current zero activity.

The current `ops` file count is 1,583 versus the prior Audit/C3-A count of 1,576. Seven additional September 23 files can coexist with the unchanged 433 directory-level status entries. The review therefore did not infer immutability from status counts alone. Current hashes of the 21 unresolved files are checked again by the validator.

Potential additional loss remains **unknown for 35 private/local-config files**; it is not counted as zero or asserted as 35 confirmed unique files. C3-A's conservative roles were retained without opening or hashing Original sensitive content. All have R0 path-member metadata, but their current restoration sufficiency and retention requirements need an owner decision. No new secret archive is proposed or authorized by this review.

## Dependency boundary

Canonical runtime/build dependency on Original = **0 observed**. Canonical has no worktree symlinks. Runtime loaders import canonical data or use `process.cwd()`; Next tracing remains local. The active Recovery final-integration validator has no Original dependency. Historical docs/provenance path mentions are not runtime dependencies.

Four historical cleanup validators (`validate-cleanup-c1.mjs`, `validate-cleanup-c2.mjs`, `validate-cleanup-c2-source-removal.mjs`, `validate-cleanup-c3c-preservation.mjs`) explicitly check the then-present Original source. Their old source-presence PASS is historical and cannot be replayed after deletion. This C4 validator likewise validates a pre-decommission review. No existing validator was modified; a future deletion plan must specify archive-based post-deletion checks instead of claiming these source-presence tests still run.

Three surviving checkouts have an actual shared-Git dependency that blocks decommission:

- `/Users/kagekun/.codex/worktrees/6df2/musiam-front`
- `/Users/kagekun/Desktop/musiam-front-astra`
- `/Users/kagekun/Desktop/musiam-front-stripe-fix`

All resolve `git-common-dir` to `/Users/kagekun/Desktop/musiam-front/.git`. Removing Original would break their Git functionality. Historical R0 worktree snapshots preserve history but do not remove this live dependency. Their files, pointers, branches and refs were not changed.

## Verdict and next Gate

The single primary verdict is `BLOCKED_UNPRESERVED_SOURCE`, derived using history → source → secret → dependency precedence. Independent secondary blockers are `OWNER_SECRET_RETENTION_DECISION_REQUIRED` and `SURVIVING_LINKED_WORKTREES_REQUIRE_ORIGINAL_GIT`. The target `meaningful unique loss = 0` is not attained.

Next work requires a separate, narrowly defined authorization for preservation of the 21 operational files, an owner decision for the private/local roles, and resolution of the three linked-checkout dependencies. Then C4 must be reviewed again. No preservation execution or dependency changes were made during this review. Even a future READY verdict requires separate `APPROVE_C4_ORIGINAL_REPOSITORY_DELETION`; that deletion Gate has not begun.

## Validation and Truth boundary

Pre-commit result: **validator PASS (179 checks)** and **`git diff --check` PASS**. The staged scope is exactly the four authorized review files. The authorized local commit message is `recovery: review original repo decommission`; no push is permitted.

Run `node scripts/validate-cleanup-c4-decommission-review.mjs`, `git diff --check`, and `git status --short`. The validator derives the verdict from blockers, checks live Git scope/ref/reflog/linked-worktree state, reconciles exact entry sets and source evidence, and verifies archive authority. Existing large-archive digest observations are tied to unchanged artifact metadata; C3-C's smaller artifacts and the 21 unresolved source files are freshly hashed. R0's earlier full archive extraction proof is reused. No dependency reinstall or application test is required for this record-only review.

Original writes, Original Git mutations, destructive operations, source copy/move/deletion, archive creation/deletion, application changes, provider/payment/deploy/push operations and dependency installs are **0**. The only canonical changes are the four allowed review files. Temporary review scripts and metadata were written under `/private/tmp`; they are not additional preservation archives. Only the authorized canonical record commit may mutate canonical Git metadata.

Local review PASS does not establish production parity, payment, fulfillment, demand, rights, adoption or deletion readiness. Missing evidence remains unknown. The pre-existing missing ZIP blob and four absent external production-forensic artifacts remain limitations; this review neither repairs them nor treats their absence as deletion permission. Recommended next model: the current parent, `gpt-6-astra`, for preservation scope, private-retention and Git-dependency decisions.
