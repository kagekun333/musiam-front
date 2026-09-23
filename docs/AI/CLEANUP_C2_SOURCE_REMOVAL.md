# 伯爵MUSIAM — C2 Source Removal Finalization

## Executive Result

`C2_SOURCE_REMOVAL = PARTIAL_COMPLETE_TRACKED_SOURCES_RETAINED`.
The only source root removed in the final state is the original dirty repository's
`_archive`. The canonical and dirty `アウトプット` roots remain present because both
contain 1,126 tracked files. The dirty `outputs` root remains present to preserve the
dirty repository's untracked count of 433.

`CANONICAL_INTEGRITY = RESTORED` and `C2_FURTHER_SOURCE_DELETION = NOT_REQUIRED`.
No further source deletion was performed after the integrity incident.

## Initial Removal Attempt

The first C2 removal pass deleted the canonical `アウトプット` source root and the
original dirty repository's `_archive` root. It also left dirty `outputs` and dirty
`アウトプット` untouched. A pathspec classification error caused the canonical
root's tracked status to be undercounted before deletion.

## Unicode Path Classification Failure

The canonical source path in the C2 JSON uses a Unicode spelling that did not match
Git's indexed path spelling when passed through the earlier literal pathspec counter.
That counter reported zero tracked files. Post-deletion status exposed 1,126 tracked
deletions. The dirty repo's separate tracked `アウトプット` root was not changed.

## Accidental Canonical Tracked Deletion

The incident affected exactly 1,126 deleted tracked paths beneath the canonical
archive source root. No other deleted tracked path was present. The deletion set was
matched by NFC path identity to the C2 canonical source manifest and HEAD's tracked
set before recovery.

## NUL-safe Git Restore

Git emitted the deleted paths as a NUL-delimited list at
`/private/tmp/c2-canonical-deleted-paths.zlist`. The list contains 1,126 entries and
has SHA-256 `125869551d85e443910c514134201cf0aa2b60dcec4d86300a60e18eb1e5635f`.
Those exact paths were restored from HEAD to the worktree using a literal,
NUL-safe Git pathspec. Nothing was staged.

## Canonical Integrity Restored

Canonical HEAD is `e29b6e4db3bf0ce546926d2046d0d6884b391882` on branch
`recovery/musiam-clean-20260920`. The worktree and staging area are clean. All 1,126
restored files match the C2 source manifest: 468,794,580 content bytes, manifest
SHA-256 `2519b446cf69fd53439c22b01d1be582374aa36f97f8ba87506cb085481b586c`,
1,126/1,126 content matches, 1,126/1,126 NFC path matches, and zero normalization
collisions.

## Final Retained Roots

| Source root | Final status | Evidence |
|---|---|---|
| canonical `アウトプット` | `RETAIN_TRACKED_ARCHIVE_SOURCE` | Present; 1,126 tracked files restored from HEAD; C2 source manifest matches |
| dirty `アウトプット` | `RETAIN_TRACKED_ARCHIVE_SOURCE` | Present; 1,126 tracked files; original dirty repository state preserved |
| dirty `outputs` | `RETAIN_UNTRACKED_ARCHIVE_SOURCE` | Present; includes one untracked file; dirty repo count remains 433 |

## Successfully Removed Root

Only the original dirty repository's `_archive` root remains removed. It contained
791 files and 110,150,890 content bytes. Its archive file remains in the immutable
C2 archive root.

## Final Disk Reclaim

The original dirty repository allocation was 7,469,510,656 bytes before removal and
7,357,771,776 bytes after removal. The final reclaim attributable to the removed
`_archive` root is 111,738,880 allocated bytes. This is the measured repository-size
delta; the earlier combined estimate that included the subsequently restored
canonical root is not used as final reclaim.

## Archive Authority

All four archive files remain present and match their C2 SHA-256 records. The raw
source path manifest remains present with SHA-256
`4d4185fba3a1995576ae9dbef8ebf5e93e3e5c17a7cae983e88de1105cbf09f0`.
The archive is retained as evidence and was not modified during restoration.

## Dirty Repo Integrity

Original dirty repo HEAD remains `117379b6c61ab3fc072b6cd4b80ce1d406b0e175` on
`codex/fix/stripe-metal-print-webhook-20260914`. Tracked modified, staged, and
untracked counts remain `102 / 0 / 433`.

## Protected Categories

R0-R5, EVIDENCE_HOLD, UNKNOWN, application/runtime source files, providers,
payments, deployments, and pushes were not changed or invoked. C3 was not started.
No dependency installation was performed.

## Incident Lessons

Git path classification for Unicode paths must be validated against Git's NUL-safe
tracked path set and a normalized manifest mapping. A filesystem path that is
canonically equivalent to a source label is not sufficient evidence that a Git
pathspec count is complete.

## Next Gate

C2 is closed with tracked archive sources retained. No further C2 source deletion is
required. The tracked dirty source is handed to the separate C4 dirty repository
decommission gate. C3 remains not started.

## Truth Boundary

This record proves local filesystem, Git, and manifest state at finalization. Archive
integrity and local restoration do not establish production state, product rights,
or cross-platform raw Unicode filename identity beyond the recorded path manifest.
