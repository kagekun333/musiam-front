# 伯爵MUSIAM — C4-G Original Repository Deletion Execution

`C4G_ORIGINAL_REPOSITORY_DELETION = COMPLETE`
`ORIGINAL_REPOSITORY = DECOMMISSIONED`
`MUSIAM_RECOVERY_CLEANUP = COMPLETE`
`DEPENDENCY_RESTORE_REQUIRED_BEFORE_APP_DEVELOPMENT = true`

The authorized four-record local commit closes `COMPLETE_COMMITTED`, derived by the post-delete validator from its direct parent, exact file scope, message and clean tree.

## State Lock and approval

Owner approval: `APPROVE_C4G_ORIGINAL_REPOSITORY_DELETION` in the current attached execution request. Historical C4-F statements that approval was absent remain historical facts; this request supplies the new authority.

Canonical starting HEAD `6c5ea76dee4d8d6f990d28ee1f231e546123ab85`, branch `recovery/musiam-clean-20260920`, working tree clean. Original HEAD `117379b6c61ab3fc072b6cd4b80ce1d406b0e175`, branch `codex/fix/stripe-metal-print-webhook-20260914`; modified/staged/untracked **102 / 0 / 433**; NUL status SHA-256 `602c7495aa6747521bdf758daae04ac42ad7cb19c1e19a20e0e7b2fcd7d95d89`. External linked worktrees=0.

C4-F remediation replay immediately before deletion: **PASS (1,721 current + 26,139 historical checks)**, `VERIFIED_COMPLETE_COMMITTED`, `READY_FOR_HUMAN_DELETION_GATE`. Meaningful unique loss, unaccounted modified/untracked entries, ignored meaningful unresolved state, future-product unpreserved source, Canonical runtime/Git dependencies and external worktree dependencies all zero. Private retention/worktree blockers resolved; persistent refs 41/41 and meaningful reflog-only commits 24/24 independently retained.

## Exact deletion

Only `/Users/kagekun/Desktop/musiam-front` was removed. Directory, non-symlink, exact realpath, own Git/common directory, expected HEAD/branch/status and allocation were checked. Explicit parent/root/Canonical exclusions, metadata-only nested-mount refusal and fd-based symlink-attack-resistant Python `shutil.rmtree` guarded the single exact-root operation. No wildcard, parent deletion, separate ref deletion or symlink traversal.

Started `2026-09-24T23:40:48.790305+00:00`; finished `2026-09-24T23:40:50.714652+00:00`. Attempts=1; result=success. Exact path has no directory, file or dangling symlink. Canonical remained present, immediately clean and at the starting HEAD/branch. Desktop sibling root inode/device identities remained intact; unrelated paths deleted=0. These are task-scoped observations, not a system-wide audit.

## Preservation and history continuity

All **46 preservation checkpoints** retained exact before/after/live metadata: R0 source/history authority, C2 archives/path manifest, C3-C 383/383 authority, C4-A 21/21 authority, C4-C private preservation, C4-D ten artifacts and C4-F final three artifacts. C3-C/C4-A/C4-D/C4-F normal artifact hashes are rechecked. R0/C2 large mixed archive verification reuses prior digest/extraction authority with current metadata continuity.

C4-C: exact **8 private payloads + 1 non-secret sidecar**, directories 0700, files 0600, owner-only and no ACL entries. Payload open/hash/print=0; recorded C4-C equality is not represented as a fresh byte comparison.

C4-F archive SHA-256: `dbdea377ee6853a6c6a9b7cb14d99e8d550dca2dc26e0b0bcbe42548affa03d9`.
SOURCE_MANIFEST: `4715840b67db75f263cc6378bfa710d6c954628e8a188d95312a4c668b53da09`.
RAW_PATH_MANIFEST: `c982729f42caa39f5145b581492eaf3bc141e2969e0ecca2bd6a572adbfb31d3`.

Independent R0 repair/readback repositories retain their own common Git directories, no alternates and no shallow state. The post-delete validator checks 41 persistent ref tips, 24 reflog-only commits, the self-contained HEAD closure (7,549 objects, missing 0), persistent-ref closure (missing 0), repaired blob A, and the previously recorded missing blob B limitation. Independent repair currently exposes 10,894 readable objects, including repaired A; Original had 10,893 readable objects. Pre-deletion C4-F verified complete readable-object membership; the new count does not replace that evidence. C4-D 321/321 and 3/3 reconstructions remain historical restoration evidence supported by the retained artifact hashes.

`ORIGINAL_GIT_PHYSICAL_REPOSITORY = DELETED_BY_AUTHORIZATION`
`MEANINGFUL_GIT_HISTORY_SURVIVES_INDEPENDENTLY = true`
`PRIVATE_RETENTION_BLOCKER = RESOLVED`
`WORKTREE_DEPENDENCY_BLOCKER = RESOLVED`
`MEANINGFUL_UNIQUE_LOSS_COUNT = 0`

## Reclaim measurement

`DELETED_ORIGINAL_ALLOCATED_BYTES = 7353495552` from pre-delete `du -sk` (known allocation matched).
`OBSERVED_FILESYSTEM_FREE_SPACE_DELTA_BYTES = 1667072` from immediately adjacent same-filesystem available-byte counters. This is **not exact reclaim**: concurrent processes and filesystem behavior affect free-space deltas. No post-delete Original `du` result is claimed.

## Validation and scope

Run `node scripts/validate-cleanup-c4g-original-repository-deletion.mjs`, `git diff --check`, `git status --short`. The new Node built-in-only validator expects Original absence and invokes Git only on Canonical and independent R0 repositories. Original-dependent historical validators are `NOT_APPLICABLE_POST_DELETION`; none are rerun after deletion. Dependency install/build/npm/pnpm=0. Application/runtime changes=0; provider/payment/deploy/push=0. No external-volume exploration or SSD requirement.

Two pre-existing Canonical-owned prunable registrations point to absent /private/tmp worktrees. They are not Original dependencies and were not pruned or modified. The initial validator assumed only one Canonical registration; this was corrected without mutating Git.

Pre-commit post-delete validation: **PASS (1,364 checks)**; `git diff --check`: **PASS**; exact changed scope: **four authorized records**.

Only this report, the C4-G machine record and validator, and appended Recovery Plan change. Local commit message: `recovery: complete original repo decommission`; no push. Canonical HEAD is unchanged by deletion; only the authorized governance commit advances it.

## Recovery truth and next Gate

Recovery/Cleanup complete does not establish production deployment, payment activation, completed product contracts, R2 HOLD release, R3 candidate adoption, R5 integration, Oracle activation or completed post-RC enhancements. R7-C2 = BLOCKED_PRODUCT_CONTRACT; PAID_CONTINUATION_NOT_ACTIVATED; Oracle = ORACLE_INACTIVE_BY_DESIGN; R2 HOLD; R3 preserved; R5 separate scope. post-RC Privacy / Digital Commerce / LLM redesign remains unstarted. No production parity, payment/fulfillment/demand, rights or adoption claim. Private payloads and large mixed R0/C2 archives were not newly opened or hashed; prior byte/extraction evidence is reused with current metadata continuity. Pre-existing missing Git blob B and external forensic gaps remain limitations; no additional meaningful history loss. Same-disk preservation is not disaster backup. Operation counters describe this task, not an OS-wide syscall audit.

Next Gate: `POST_RECOVERY_DEVELOPMENT_BASELINE`. Recommended model: **GPT-6 Luna**. That separate Gate restores Canonical dependencies, establishes the development validation baseline and clean application starting point, then prioritizes 伯爵Chat. None of that work begins here.
