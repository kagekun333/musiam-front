# C1 SAFE_TO_DELETE Cleanup Execution

`C1_CLEANUP = COMPLETE_PENDING_RECORD_COMMIT`

## Authorized Scope

User authorization: `APPROVE_C1_SAFE_TO_DELETE_CLEANUP`.
Only the five audited SAFE_TO_DELETE groups are in scope: canonical `node_modules`,
canonical `.next`, the three manifest-resolved canonical TypeScript caches, and
original-dirty `node_modules` and `.next`.

## Deleted Targets

Seven exact targets were removed in the approved order: canonical `.next`, three
canonical TypeScript caches, original dirty `.next`, original dirty `node_modules`,
and canonical `node_modules` last. All seven paths are absent. No other path was
removed.

## Before Metrics

The 77,707-file / 2,293,411,840-byte target snapshot matches the Cleanup Audit.
Allocated repository sizes (`du -sk`, converted from KiB): canonical 2,147,266,560
bytes and original dirty 8,977,616,896 bytes.

## After Metrics

Canonical after size: 1,362,038,784 bytes. Original dirty after size:
7,469,453,312 bytes.

## Actual Reclaim

Allocated target snapshot total: 2,293,411,840 bytes. Repository `du` size delta:
canonical 785,227,776 bytes and original dirty 1,508,163,584 bytes, total
2,293,391,360 bytes (20,480 bytes lower than the per-target allocation sum because
whole-repository `du` accounting differs slightly and the C1 records remain in the
canonical tree). The target trees are absent.

## Canonical Integrity

Starting HEAD `1e181bd2e8465af16885193ac3549e1312e33718`, branch
`recovery/musiam-clean-20260920`; working tree was clean before these C1 records.
Pre-delete cleanup audit (44 checks), final integration (45), R7-A, R7-D1, root
typecheck, targeted validator lint with `--no-ignore`, and `git diff --check` passed.
Repository-wide `pnpm lint` reported existing errors in the preserved R3 draft and
unrelated application files; those files were not changed. Post-delete application
validators were not run because authorized C1 removed dependencies.

Post-delete `node scripts/validate-cleanup-c1.mjs` passed all 40 checks. Canonical application
changes = 0. The only pending tracked change is this C1 addition to Recovery Plan;
the other three C1 records are new files. Nothing is staged.

## Dirty Repo Integrity

Starting HEAD `117379b6c61ab3fc072b6cd4b80ce1d406b0e175`, branch
`codex/fix/stripe-metal-print-webhook-20260914`; 102 tracked modified, 0 staged,
433 untracked, and ignored count 47,983 before / 1,587 after. Tracked, staged, and
untracked counts remained 102 / 0 / 433. Dirty repository allocated size changed
from 8,977,616,896 to 7,469,453,312 bytes.

## Protected Categories Untouched

R0, R2, R3, R4, R5, EVIDENCE_HOLD, ARCHIVE, UNKNOWN, production provenance records,
application source, environment files, `.git`, and `.vercel` are outside the target
list and must remain untouched.

## Dependency Restore Boundary

Canonical dependencies are intentionally removed last. Do not reinstall dependencies
after C1. `DEPENDENCY_RESTORE_REQUIRED_BEFORE_APP_DEVELOPMENT = true`.

## Next Gate

Complete C1 verification, then stop. C2 Archive Cleanup and Git commit are not
authorized by this execution request.

## Truth Boundary

Local deletion and disk-reclaim measurements do not establish production parity,
publication, customer demand, or provider state. No provider, deploy, push, payment,
or production operation is authorized or performed.
