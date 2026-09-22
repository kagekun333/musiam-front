# 伯爵MUSIAM — Non-destructive Cleanup Audit

## Executive Result

`CLEANUP_AUDIT = AUDITED_PARTIAL_READY_FOR_C1_HUMAN_GATE`。

Canonical repository was clean at the State Lock and exactly at
`9b0f265b764eec4373842ae1676cbe734286784f`. This audit made no destructive
operation. R0 preservation is present and protected; however, all four known
production-forensic artifacts under `/private/tmp` are absent at observation.
Their absence is `UNKNOWN`, never a deletion authorization. Consequently the
original dirty repository is `NOT_READY` for decommission.

Cleanup Audit, Final Integration, R7-D1 Exhibition, and R7-A Catalog
validators, root typecheck, targeted lint, and `git diff --check` pass for this
governance HEAD. The inherited RC local-validation and RC Preview validators
are historical fixed-HEAD validators for `a5a374d` and `cad8c6c`;
`HISTORICAL_FIXED_HEAD_VALIDATOR = NOT_APPLICABLE_TO_CURRENT_GOVERNANCE_HEAD`.
Their exact-HEAD assertion is scoped to those recorded historical commits, not
current application health. Their historical PASS evidence remains in its
original commit records; no validator or prior evidence was changed.

All byte figures below are allocated `du` bytes. The accountable inventory is
172,076 files / 41,244,823,552 bytes (38.41 GiB); nested reference-only entries
are deliberately excluded to avoid double-counting the canonical core.

## Canonical Active Repository

`/Users/kagekun/Desktop/musiam-front-clean` is `KEEP_ACTIVE`. It was clean on
branch `recovery/musiam-clean-20260920` at the stated State Lock. Its tracked
file count was 4,585; untracked count was 0; ignored count was 35,491.

The ignored `node_modules` (32,629 files / 604,340,224 bytes), `.next` (223 /
180,424,704), and three TypeScript build-info files (483,328 bytes) are the
only `SAFE_TO_DELETE` candidates inside the canonical checkout. The original
dirty checkout also has `node_modules` and `.next` candidates. All five entries
remain candidates only: none was removed. `.vercel` is retained as local
linkage metadata; no values or credentials were read.

## Original Dirty Repository

`/Users/kagekun/Desktop/musiam-front` remains untouched on
`codex/fix/stripe-metal-print-webhook-20260914` at
`117379b6c61ab3fc072b6cd4b80ce1d406b0e175`.

| Measure | Observation |
|---|---:|
| Tracked modified | 102 |
| Staged | 0 |
| Untracked | 433 |
| Ignored | 47,983 |
| Total files | 71,594 |
| Total size | 8,977,616,896 bytes (8.36 GiB) |
| `.git` | 3,136,348,160 bytes |
| `node_modules` | 869,621,760 bytes |
| `.next` | 638,541,824 bytes |
| `ops` | 247,599,104 bytes |
| `public` | 252,715,008 bytes |

Environment-file presence was never treated as content authorization: values
were not read and those files remain within the unresolved `UNKNOWN` core.

## KEEP_ACTIVE

| Entry | Files | Bytes | Basis |
|---|---:|---:|---|
| Canonical core, excluding individually classified generated/output entries | 3,933 | 890,785,792 | Current application, Git metadata, docs and validators |

## ARCHIVE

| Entry | Files | Bytes | Basis |
|---|---:|---:|---|
| Canonical `アウトプット` | 1,126 | 471,072,768 | Historical/generated distribution assets |
| Dirty `アウトプット` | 1,134 | 1,491,312,640 | Historical distribution assets |
| Dirty `_archive` | 791 | 111,738,880 | Historical snapshot/export material |
| Dirty `outputs` | 3 | 8,880,128 | Historical generated output |

Archive means retain for a future approved transfer; it is not a move request.

## EVIDENCE_HOLD

| Entry | Files | Bytes | Basis |
|---|---:|---:|---|
| R0 completion preservation | 44,677 | 25,044,283,392 | verified archive, manifests, hashes, worktree snapshots and diagnostics |
| R0 history recovery | 17,891 | 5,075,816,448 | verified HEAD bundle, recovered blob and readback records |
| R5 `SHA_collection_999_unique` | 1,000 | 2,146,086,912 | `PRESERVE_HOLD / SEPARATE_BUSINESS_SCOPE` |
| Dirty `ops` | 1,576 | 247,599,104 | R6/working-snapshot evidence pending semantic triage |

R2 (`RECOVERED_PRESERVED_HOLD`), R3 (`RECOVERED_PRESERVED_EXPERIMENT`), and
R4 (`RECOVERED_EVIDENCE_BOUNDARY`) are individually held inside the canonical
core. They are not added again to the physical-byte total. R0 source archives,
manifest and SHA-256 records were observed. R5 is specifically prohibited from
`SAFE_TO_DELETE`.

## SAFE_TO_DELETE

| Entry | Files | Bytes | Regeneration basis |
|---|---:|---:|---|
| Canonical `node_modules` | 32,629 | 604,340,224 | `pnpm-lock.yaml` |
| Canonical `.next` | 223 | 180,424,704 | Next.js build/dev |
| Canonical TypeScript caches | 3 | 483,328 | TypeScript |
| Dirty `node_modules` | 44,380 | 869,621,760 | dependency install |
| Dirty `.next` | 472 | 638,541,824 | Next.js build/dev |

Total possible reclaim after a separate Human Gate: **77,707 files / 2,293,411,840 bytes (2.14 GiB)**. No candidate was removed.

## UNKNOWN

The unresolved original core has 22,238 files / 3,463,835,648 bytes. It contains
original Git metadata, changed tracked files, untracked source and ignored
material whose recovery relationship was not semantically reconciled.

The exact production source tree and three manifest artifacts referenced by the
provenance/diff records are all absent:

- `/private/tmp/musiam-production-hotfix-20260921`
- `/private/tmp/musiam-current-deployment-files-20260921.json`
- `/private/tmp/musiam-production-hotfix-20260921-dry.json`
- `/private/tmp/musiam-recovery-dry-offline-20260921.json`

They are `UNKNOWN_REFERENCE_ONLY` entries with zero observed bytes, not safe
deletion entries. The committed production provenance report, normalized
manifest hash, 3150/3150 identity result, and production-vs-Recovery diff
manifest remain in Recovery evidence. No replacement, retrieval, or provider
operation was made.

## Duplicate Groups

One full subtree group was hash-verified. All 1,126 files in canonical
`アウトプット` match same-relative-path SHA-256 and size in the dirty output tree:
468,794,580 byte-content bytes. The dirty output copy is only a historical
archive candidate, not an approved authoritative archive. Reclaimable bytes
from this group are therefore **0** today.

## Disk Reclaim Estimate

| Category | Files | Bytes |
|---|---:|---:|
| KEEP_ACTIVE | 3,933 | 890,785,792 |
| ARCHIVE | 3,054 | 2,083,004,416 |
| EVIDENCE_HOLD | 65,144 | 32,513,785,856 |
| SAFE_TO_DELETE | 77,707 | 2,293,411,840 |
| UNKNOWN | 22,238 | 3,463,835,648 |

## Dirty Repo Decommission Readiness

`NOT_READY`. R0 remains protected, but the unresolved original core and missing
production forensic artifacts prevent a decommission decision. Prunable Git
worktree records for the old backport and webhook-guard paths were inventoried;
no branch deletion or worktree removal was performed.

## Application Drift

From starting HEAD `9b0f265` through these four governance artifacts,
application/runtime paths (`src/**`, `public/**`, `next.config.*`, package and
lockfiles, and runtime configuration) changed by **0**. `APPLICATION_CHANGES = 0`.

## Proposed Cleanup Phases

1. C1 — Recheck lockfiles and references, then remove only approved cache entries.
2. C2 — Create and verify approved archives for historical outputs/snapshots.
3. C3 — Reverify R0/R2/R3/R4/R5 and resolve the missing forensic-artifact disposition.
4. C4 — Reconcile all unresolved original material, then request a distinct original-repo decommission gate.

## Human Gates

The next Gate is **C1 SAFE_TO_DELETE Cleanup**. The inventory is ready for that
Human Gate; this Unit did not begin C1. Any delete, move, archive creation,
worktree/branch removal, forensic recovery, provider access, or decommission
action requires separate explicit approval.

## Truth Boundary

- Hash equality is not retention authority.
- Missing evidence is `UNKNOWN`, not zero or safe-to-delete.
- Local audit does not prove production parity, rights, payment, fulfillment, or customer state.
- `SAFE_TO_DELETE` is a candidate classification only; this Unit performed no deletion.
