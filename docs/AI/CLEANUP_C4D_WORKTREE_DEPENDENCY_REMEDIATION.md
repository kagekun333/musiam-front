# C4-D Worktree Dependency Remediation — complete

`WORKTREE_STATE_PRESERVATION = COMPLETE`
`WORKTREE_DECOMMISSION_READY = true`
`C4_READINESS = NOT_READY_WORKTREE_DECOMMISSION_REQUIRED`

Both dirty worktrees were independently reconstructed from R0 history and retained C4-D artifacts with **100% identity**. Astra is clean with independently preserved branch/history and is disposable. All three live worktrees still depend on Original `.git` and remain physically unchanged. C4-E has not started. The authorized local commit closes `C4D_WORKTREE_REMEDIATION = COMPLETE_COMMITTED`; the validator derives that closure from the commit parent, message, exact four-file scope and clean canonical status.

## State Lock and authority

Canonical starting HEAD: `723f14f73e00cf0b793a8dd89b7d38125eb4ac30`, branch `recovery/musiam-clean-20260920`. Initial C4-D began clean; this resume began with exactly the four authorized governance files unstaged. Original stays at `117379b6c61ab3fc072b6cd4b80ce1d406b0e175`, branch `codex/fix/stripe-metal-print-webhook-20260914`, **102 modified / 0 staged / 433 untracked status entries**. Original and all worktree HEAD/branch/NUL status digests match C4-A before and after preservation. Source target metadata and normal-source hashes were stable around reconstruction.

Authorities: C4 decommission review, C4-A machine worktree inventory, C4-B private retention, C4-C preservation, R0 history/preservation sections in `STATE_LOCK.md`, Recovery Plan, and the owner's successive C4-D instructions. C4-C private root remains present without content access or mutation; `PRIVATE_RETENTION_BLOCKER = RESOLVED` is carried forward. Six missing/prunable historical registrations remain untouched and are separate from three live dependencies.

## Final worktree dispositions

| Worktree | Modified / staged / untracked status entries | Expanded preserved untracked | Ignored artifact | Final disposition |
|---|---|---|---|---|
| `/Users/kagekun/.codex/worktrees/6df2/musiam-front` | 62 / 0 / 143 | 257 regular files + 1 symlink | 1 XLSX | `WORKTREE_STATE_INDEPENDENTLY_PRESERVED` |
| `/Users/kagekun/Desktop/musiam-front-stripe-fix` | 1 / 0 / 2 | 2 regular files | 0 | `WORKTREE_STATE_INDEPENDENTLY_PRESERVED` |
| `/Users/kagekun/Desktop/musiam-front-astra` | 0 / 0 / 0 | 0 | 0 ignored entries | `WORKTREE_DISPOSABLE_AFTER_PRESERVATION` |

6df2 is detached; stripe-fix source branch is `fix/stripe-metal-print-webhook-20260914`; Astra branch is `astra-local-clean`. Each source is at the required `117379b6...` HEAD. Fresh verification repositories checked out that HEAD detached; source branch names/detached state are explicitly retained in manifests, and source branch refs remain independently available in R0. No source branch/ref was mutated or deleted.

## Prior failure and permission remediation

The first attempt stopped on the ignored XLSX; the owner then authorized opaque preservation. The second attempt created valid partial artifacts but failed an additional exact-mode check. The executor used `umask 077` without normalizing tracked regular-file modes: 62 files were reconstructed as `0600` versus source `0644`; one symlink had `0700` versus source `0755`. Diagnostics found zero type/size differences across 321 targets. This was an executor permission-policy defect, not source corruption. Full reconstruction was not claimed at that point.

On this resume, the owner authorized artifact reuse, verify-only regular mode normalization and type-specific identity:

- **Regular files:** source POSIX mode and executable bits are retained in metadata and matched after normalization. Exactly 62 regular files in 6df2 and 1 in stripe-fix needed normalization, all inside new temporary repositories.
- **Directories:** path, type and traversability govern ordinary reconstruction directories; umask permission differences are not payload failure.
- **Symlink:** path, type, exact target string and NFC identity govern. `SYMLINK_MODE = NON_AUTHORITATIVE_FOR_C4D`. No `chmod` was applied to a symlink.

The failed temporary copy was not reused as success evidence. New standalone repositories were constructed and fully verified. Source worktree permissions and contents were not changed.

## Path safety, sensitive scope and SSD

Metadata screening covered **63 tracked dirty + 260 expanded untracked + 1 approved ignored = 324 targets**. Sensitive candidates = 0; raw/NFC collisions = 0; payload-read and write root escapes = 0. Regular sources were confined to the worktrees with no symlink ancestors or hardlink ambiguity. Screening is path metadata only, not a secret-content scan.

The only symlink is 6df2 `outputs/metal-print-cost-simulation/node_modules`, pointing absolutely to `/Users/kagekun/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules`. Its path/type/target string was preserved and matched in fresh reconstruction. The archive stores the link itself, without following the referent and without archive descendants through that path.

Symlinks = **1**; external-volume symlinks = **0**; external target payload verifications required = **0**; `SSD_REQUIRED = false`. The external local runtime payload is outside C4-D preservation scope and is not deleted by removing these worktree directories. Its mounted/existing status is not required for link-state reconstruction. No SSD scan, bulk copy, external referent hash or provider call was used.

Other ignored paths retain conventional generated/cache roles: 6df2 `.next/`, `next-env.d.ts`, `node_modules/`, `tsconfig.tsbuildinfo`; stripe-fix `node_modules/`. Their payloads were not preserved. Astra has no ignored paths.

## Opaque ignored XLSX

Source: `/Users/kagekun/.codex/worktrees/6df2/musiam-front/outputs/metal-print-cost-simulation/metal-print-global-cost-simulation.xlsx`.

Preserved at `codex-6df2/ignored-artifacts/outputs/metal-print-cost-simulation/metal-print-global-cost-simulation.xlsx` beneath the C4-D root. It is a regular **12,058-byte** artifact. Source, retained copy and fresh reconstruction hashes/sizes match. Source metadata remains unchanged.

`IGNORED_ARTIFACT_PRESERVED`; `REGENERABILITY = NOT_REQUIRED_FOR_DECOMMISSION`; `CONTENT_SEMANTICS = NOT_REVIEWED`; content reviewed = **false**; ignored blocker = **RESOLVED**. The OS read bytes solely for copy/hash. No spreadsheet parser/application, rendering, cell/value extraction or semantic review occurred. No product/pricing/cost-model adoption follows.

## Independent preservation and verification

Root: `/Users/kagekun/Library/Application Support/MUSIAM/archive/cleanup-c4d-worktrees-20260924/`.

Each `codex-6df2/` and `stripe-fix/` retains:

- `tracked-delta.patch`: binary/full-index diff from source HEAD, external diff and textconv disabled.
- `untracked.tar`: exact NUL-safe expanded Git authority, no symlink dereferencing.
- `RAW_PATH_MAPPING.json`: raw UTF-8, kind/type and NFC mapping.
- `WORKTREE_STATE.json`: source metadata/hashes/modes, source branch/detached state, base authority, artifact hashes, normalization mapping and full reconstruction evidence.

The root also retains `PRESERVATION_RESULT.json`; 6df2 retains its ignored XLSX. **10 regular preservation artifacts total.** Existing 6df2 patch/tar/mapping/XLSX hashes remained unchanged; regenerated artifacts = 0. The only new payload preservation in this resume was stripe-fix, started after 6df2 fully passed.

Base authority: `/Users/kagekun/Library/Application Support/MUSIAM/recovery/20260920T-r0-history-recovery-01a0beba/verification/head-117379b6.bundle`. Its 640,344,677-byte content matched C4 SHA-256 `40e1c86b7cc580e82882318b1dfa4b52ab6b58c89e51f671eb79573de21b20b5` and passed bundle verification in an empty repository. Each fresh reconstruction fetched only this local bundle, confirmed the required HEAD, 7,549 reachable objects and zero missing objects, own `.git` common-dir, no alternates and no shallow state.

Preserved patches and exact untracked tar members were restored; ignored XLSX was restored separately. Extraction used explicit member allowlists, no existing target overwrite, no `..`/absolute member names, no traversal through symlinks, and no generic recursive archive extraction. Source regular modes were normalized only in fresh copies.

| Verification | 6df2 | stripe-fix |
|---|---:|---:|
| Tracked dirty paths | 62 / 62 | 1 / 1 |
| Expanded untracked paths | 258 / 258 | 2 / 2 |
| Ignored XLSX | 1 / 1 | N/A |
| Total preserved-state targets | 321 / 321 | 3 / 3 |
| Missing / extra targets | 0 / 0 | 0 / 0 |
| Regular content/size/mode, symlink identity, NFC, status digest | PASS | PASS |
| Reconstruction match | **100%** | **100%** |

The complete reconstructed filesystem inventory matched committed base paths plus the exact preserved targets. Source metadata and regular-file hashes were rechecked after reconstruction. Raw source and actual reconstructed filesystem paths remain mapped one-to-one through NFC.

After both full PASSes and final Astra/history/source checks, fresh `/private/tmp/musiam-c4d-verify-pav9awvg` and superseded failed `/private/tmp/musiam-c4d-verify-9fvsrzul` were removed. This removed three temporary reconstructed repositories in two containers, not source worktrees or preservation data. Prior failure diagnostics remain in canonical records.

## Astra semantic decision

Astra is clean with zero untracked/ignored state, required HEAD and `astra-local-clean` branch. R0 repair copy independently retains the exact branch tip and its 7,549-object closure, with zero missing objects, own Git storage, no alternates/shallow state/replace refs. The owner's unique-state/ref-preserved criterion is satisfied. No additional archive is required; Astra's physical directory and branch remain untouched.

## C4-E plan — not executed

1. Final state lock of canonical, Original and the exact three worktrees.
2. Recheck C4-D current preservation and R0 independent history authority.
3. Under separate C4-E execution authority, decommission exactly the three recorded linked worktrees; retain branch/ref history.
4. Inspect six stale historical registrations without inferring broad prune authority.
5. Re-enumerate registrations and prove live external Original Git dependency count is zero.
6. Keep Original and all preservation archives; return to C4 final deletion review.

Current independent dirty preservations = 2; disposable clean worktrees = 1; live Original `.git` dependencies = 3. Preservation makes worktree decommission ready, while Original deletion remains blocked pending the separate dependency execution and final deletion review.

## Validation, commit and truth boundary

Run `node scripts/validate-cleanup-c4d-worktree-remediation.mjs`, `git diff --check`, and `git status --short`. The validator checks live source metadata/hashes, patch identity, tar member/content/mode identity without extracting, raw/NFC mappings, full persisted fresh reconstruction evidence, Astra history closure, artifact integrity, temporary-root absence and exact canonical scope. R0 bundle full hash/verify was performed during reconstruction; subsequent validator runs check metadata continuity and recorded hash authority rather than rehashing the large bundle.

Pre-commit validation: **PASS (2,904 checks)**; `git diff --check` **PASS**; canonical scope exactly the four allowed records.

Only this report, C4-D JSON, validator and Recovery Plan are authorized changes. Commit message: `recovery: preserve linked worktree state`. The validator accepts the starting HEAD before commit, then requires its direct child with the exact message/four-file scope and clean canonical tree to report `COMPLETE_COMMITTED`. No dependency install or application test is needed for governance records.

Original writes/Git mutations, linked-worktree mutations, source permission changes, destructive source operations, preservation deletion, private reads/hashes/mutations, SSD scans/copies, symlink referent copies/chmod, application changes, provider/deploy/push = **0**. Temporary verify cleanup is separately authorized and recorded.

These counters attest scoped actions, not an OS-wide syscall audit. Exact declared worktree preservation is proven; application correctness, production parity, demand, payment, fulfillment and rights are not. All three live Git dependencies still exist. C4-E and Original deletion are unstarted. Recommended next model: current parent GPT-6 Astra / High; no model/config/provider change was performed.
