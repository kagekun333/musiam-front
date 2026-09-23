# 伯爵MUSIAM — C4-A Decommission Blocker Remediation

`C4A_BLOCKER_REMEDIATION = COMPLETE` (local commit closure is reported after the authorized commit).

`C4A_UNIQUE_SOURCE_PRESERVATION = VERIFIED_21_OF_21`.
`C4_READINESS = NOT_READY_PRIVATE_RETENTION_DECISION`. Next Gate: **C4-B PRIVATE RETENTION DECISION**.

The 21 confirmed unique operational files are now independently preserved. Sixteen private retention decisions and all three live Original Git dependencies remain blockers. Two linked worktrees require current-state preservation; the third requires a usage/ignored-content decision. This Unit stops before private preservation, worktree migration/removal, Original deletion or archive deletion.

## State Lock and authority

Canonical starting HEAD: `b53a49d52498c7f56f57d737bdcdb613bc6d2798`; branch `recovery/musiam-clean-20260920`; initially clean.
Original: `/Users/kagekun/Desktop/musiam-front` at `117379b6c61ab3fc072b6cd4b80ce1d406b0e175` / `codex/fix/stripe-metal-print-webhook-20260914`. Modified/staged/untracked status entries: **102 / 0 / 433**. Exact NUL-delimited status digest matches C4, not only counts.

Read authority: C4 review/JSON, C3-B review/JSON, C3-C execution/JSON and Recovery Plan. The unique, private and surviving worktree target sets were derived directly from C4 machine authority. Original Git commands use `--no-optional-locks -c core.fsmonitor=false`; no Original `.git` filesystem enumeration occurred.

## Part A — independent preservation

Root: `/Users/kagekun/Library/Application Support/MUSIAM/archive/cleanup-c4a-unique-source-20260923/` (outside Original and canonical application tree).

Exactly 21 files / 105,417 logical bytes: 19 daily operational records and two changed continuous-operation ledgers. Before any source payload was read, the complete target set passed metadata checks: 21 distinct existing regular files; no root escape, symlink component, private-path/inode overlap or `.git` path. Source and archive raw/NFC paths are unique, with zero normalization collisions and a one-to-one mapping.

The source manifest records exact/relative paths, logical/allocated size, type, SHA-256, C4 category/rationale, subsystem and prior evidence relationship. Every source hash matched the existing C4 hash before copying and remained unchanged afterward. The tar contains only the 21 approved regular files, retaining relative paths; no private configuration or Git payload is included.

Independent extraction into the new archive root `.verify` produced **21 files; 21 content matches; 21 size matches; 21 NFC matches; missing 0; extra 0**. Only that successful temporary extraction was removed. Archive and both manifests remain retained.

| Artifact | SHA-256 |
|---|---|
| `preserved-source.tar` | `8cda606e7a74211ab8dbfe95fb027953ee66adb6a5baccef52babe7cc86f358d` |
| `SOURCE_MANIFEST.json` | `8f842e77a82022390859a5091cfc87249467e1ead344f79a4a0121ad8daae647` |
| `RAW_PATH_MANIFEST.json` | `df4ffc4f8d4f1f433c13aa027f8bca6b904331f6645e2bf092565ccc2d568806` |

## Part B — private retention, metadata only

Thirty-five exact C4 private/local holds were classified once. Only path, type, size, Git path/status metadata, known role and prior evidence references were used. Existing R0 archive size/mtime continuity was checked without opening any private archive payload. R0 membership remains historical evidence; current sufficiency is unknown. No private content read, explicit private hash or private archive copy occurred.

| Classification | Count |
|---|---:|
| `INDEPENDENTLY_PRESERVED_PRIVATE` | 0 |
| `LOCAL_MACHINE_ONLY_RECREATABLE` | 19 |
| `REQUIRED_PRIVATE_CONFIG_NOT_PRESERVED` | 4 |
| `OWNER_SECRET_RETENTION_DECISION_REQUIRED` | 12 |

The 19 recreatable entries are the 17 generated `.husky/_/` tool files, `.vercel/project.json` (machine/project linkage) and `.vercel/README.txt` (generated tool guidance). This is a role-based planning disposition, not a claim of byte equality or authorization to unlink projects, run tools or delete files. The tracked `.husky/commit-msg` is kept separate as a potentially customized source hook.

`.env.example` is the **same file** in the 35-private set, `SECRET_OR_ENV_HOLD`, tracked and modified. It is **not** one of the 21 preservation files and was never opened or hashed. Its disposition is `OWNER_SECRET_RETENTION_DECISION_REQUIRED`.

Owner decision inputs below contain paths and questions only. Each relative path is beneath `/Users/kagekun/Desktop/musiam-front/`.

| Exact path | Decision question |
|---|---|
| `.env.stripe-sandbox.local` | この設定の現在有効な独立保管先はありますか。それとも廃止対象ですか。未保全なら、別Gateでの秘密保全を承認しますか。 |
| `.env.local.example` | このパスは既存R0コピーを保持すれば十分ですか。それとも現行版を別Gateで保全する必要がありますか。 |
| `.env.local` | この設定の現在有効な独立保管先はありますか。それとも廃止対象ですか。未保全なら、別Gateでの秘密保全を承認しますか。 |
| `.env` | この設定の現在有効な独立保管先はありますか。それとも廃止対象ですか。未保全なら、別Gateでの秘密保全を承認しますか。 |
| `.env.example` | このパスは既存R0コピーを保持すれば十分ですか。それとも現行版を別Gateで保全する必要がありますか。 |
| `src/lib/metal-print-consultation-token.server.ts` | このパスは既存R0コピーを保持すれば十分ですか。それとも現行版を別Gateで保全する必要がありますか。 |
| `src/lib/design/tokens.ts` | このパスは既存R0コピーを保持すれば十分ですか。それとも現行版を別Gateで保全する必要がありますか。 |
| `src/styles/renovation-tokens.css` | このパスは既存R0コピーを保持すれば十分ですか。それとも現行版を別Gateで保全する必要がありますか。 |
| `.vscode/settings.json` | このパスは既存R0コピーを保持すれば十分ですか。それとも現行版を別Gateで保全する必要がありますか。 |
| `.vscode/tasks.json` | このパスは既存R0コピーを保持すれば十分ですか。それとも現行版を別Gateで保全する必要がありますか。 |
| `scripts/audit-secret-hygiene.mjs` | このパスは既存R0コピーを保持すれば十分ですか。それとも現行版を別Gateで保全する必要がありますか。 |
| `public/nft/token-template.json` | このパスは既存R0コピーを保持すれば十分ですか。それとも現行版を別Gateで保全する必要がありますか。 |
| `.claude/settings.local.json` | このパスは既存R0コピーを保持すれば十分ですか。それとも現行版を別Gateで保全する必要がありますか。 |
| `.local/abi-knowledge/abi-canonical.json` | このパスは既存R0コピーを保持すれば十分ですか。それとも現行版を別Gateで保全する必要がありますか。 |
| `.vercel/.env.preview.local` | この設定の現在有効な独立保管先はありますか。それとも廃止対象ですか。未保全なら、別Gateでの秘密保全を承認しますか。 |
| `.husky/commit-msg` | このパスは既存R0コピーを保持すれば十分ですか。それとも現行版を別Gateで保全する必要がありますか。 |

All 35 file-level classifications and metadata are in the machine record. `INDEPENDENTLY_PRESERVED_PRIVATE = 0` means no current private-restoration sufficiency was established in this zero-read Unit; it does not mean the historical R0 copies are absent.

## Part C — live worktree dependencies

| Exact worktree path | HEAD | Branch/state | Dirty tracked / staged / untracked entries | Classification |
|---|---|---|---|---|
| `/Users/kagekun/.codex/worktrees/6df2/musiam-front` | `117379b6c61ab3fc072b6cd4b80ce1d406b0e175` | `DETACHED` | 62 / 0 / 143 | `WORKTREE_REQUIRES_PRESERVATION` |
| `/Users/kagekun/Desktop/musiam-front-astra` | `117379b6c61ab3fc072b6cd4b80ce1d406b0e175` | `astra-local-clean` | 0 / 0 / 0 | `WORKTREE_SEMANTIC_DECISION_REQUIRED` |
| `/Users/kagekun/Desktop/musiam-front-stripe-fix` | `117379b6c61ab3fc072b6cd4b80ce1d406b0e175` | `fix/stripe-metal-print-webhook-20260914` | 1 / 0 / 2 | `WORKTREE_REQUIRES_PRESERVATION` |

All three resolve `git-common-dir` to `/Users/kagekun/Desktop/musiam-front/.git`. None reports locked or prunable status. Worktree source contents were not opened. Dirty/untracked entries establish a preservation requirement conservatively, not confirmed per-file uniqueness. C4 history preservation is reused for HEAD/ref history only and cannot establish current working-content equality. Ignored-file coverage remains unknown.

`git worktree list --porcelain` additionally reports **six missing/prunable historical registrations**. They are recorded separately and are not additional surviving checkouts. They were not pruned. Future execution must re-audit and resolve applicable stale registrations under its explicit scope before the final Original deletion review.

Classification totals: disposable 0; preservation-required 2; must-remain-active 0; semantic-decision-required 1. Active-use status cannot be inferred from branch names. In particular, clean Astra Git status alone does not prove ignored value is absent or disposal is desired.

### Exact per-worktree execution plans (not executed)

#### `/Users/kagekun/.codex/worktrees/6df2/musiam-front`

Proposed independent preservation: `/Users/kagekun/Library/Application Support/MUSIAM/recovery/c4b-worktree-remediation/codex-6df2/preservation`.
Proposed standalone repository: `/Users/kagekun/Library/Application Support/MUSIAM/recovery/c4b-worktree-remediation/codex-6df2/repository`.
These paths are proposed only, not created. The execution Gate must recheck destination absence and owner scope.

1. Freeze and recheck exact worktree /Users/kagekun/.codex/worktrees/6df2/musiam-front, HEAD 117379b6c61ab3fc072b6cd4b80ce1d406b0e175, branch/detached state and NUL status digest 6fe2d379fdc5ca720746df334cc7d6b744aca5929de2ade59dc7485d60aebd6e; stop on drift or active writers.
2. Inventory tracked dirty, staged, expanded untracked and ignored paths using metadata. Separate secret/local holds; obtain the private retention decision before any protected bytes are copied. Current status entries in this record are scope evidence, not a complete ignored-file inventory.
3. In a separately authorized preservation Gate, preserve exact approved working state to /Users/kagekun/Library/Application Support/MUSIAM/recovery/c4b-worktree-remediation/codex-6df2/preservation; independently extract and compare non-sensitive files, modes and paths. Account for index/unstaged layers, ignored value and detached HEAD; do not substitute Original snapshots for current worktree proof.
4. If continued use is chosen, create standalone Git authority at /Users/kagekun/Library/Application Support/MUSIAM/recovery/c4b-worktree-remediation/codex-6df2/repository from the verified independent R0 history authority, supplement any missing current worktree history only under explicit authority. Require a full local object copy, no shared alternates, no Original dependency; validate HEAD and branch (or detached state) against this record.
5. Restore approved dirty/untracked state and index layer to the standalone repository; compare the exact preserved content/status and metadata. Handle approved secrets separately without displaying values.
6. Verify standalone git rev-parse --git-common-dir resolves inside the new repository, object alternates and references do not point at Original, and all required objects are available. Verify project-specific regression checks under separate scope; no provider/deploy calls by inference.
7. Only after preservation and standalone checks pass and owner scope explicitly allows it, remove the old linked-worktree dependency/registration in a separate execution Gate. Re-enumerate Original worktrees and prove no live dependency remains before any deletion review.
8. If disposal is chosen instead, prove remaining unique value is zero with independent preservation, explicitly resolve ignored/private and future-use decisions, obtain scoped owner decommission authority, then remove only this worktree and its registration in a separate Gate. No branch/ref deletion is implied.

Stop on state drift, unresolved private retention, incomplete working-content/history coverage, lingering Original dependency, or missing active/disposable decision. No `remove`, `prune`, detach, migration, replacement clone, pointer rewrite, branch deletion or ref deletion was executed.

#### `/Users/kagekun/Desktop/musiam-front-astra`

Proposed independent preservation: `/Users/kagekun/Library/Application Support/MUSIAM/recovery/c4b-worktree-remediation/astra-local-clean/preservation`.
Proposed standalone repository: `/Users/kagekun/Library/Application Support/MUSIAM/recovery/c4b-worktree-remediation/astra-local-clean/repository`.
These paths are proposed only, not created. The execution Gate must recheck destination absence and owner scope.

1. Freeze and recheck exact worktree /Users/kagekun/Desktop/musiam-front-astra, HEAD 117379b6c61ab3fc072b6cd4b80ce1d406b0e175, branch/detached state and NUL status digest e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855; stop on drift or active writers.
2. Inventory tracked dirty, staged, expanded untracked and ignored paths using metadata. Separate secret/local holds; obtain the private retention decision before any protected bytes are copied. Current status entries in this record are scope evidence, not a complete ignored-file inventory.
3. In a separately authorized preservation Gate, preserve exact approved working state to /Users/kagekun/Library/Application Support/MUSIAM/recovery/c4b-worktree-remediation/astra-local-clean/preservation; independently extract and compare non-sensitive files, modes and paths. Account for index/unstaged layers, ignored value and detached HEAD; do not substitute Original snapshots for current worktree proof.
4. If continued use is chosen, create standalone Git authority at /Users/kagekun/Library/Application Support/MUSIAM/recovery/c4b-worktree-remediation/astra-local-clean/repository from the verified independent R0 history authority, supplement any missing current worktree history only under explicit authority. Require a full local object copy, no shared alternates, no Original dependency; validate HEAD and branch (or detached state) against this record.
5. Restore approved dirty/untracked state and index layer to the standalone repository; compare the exact preserved content/status and metadata. Handle approved secrets separately without displaying values.
6. Verify standalone git rev-parse --git-common-dir resolves inside the new repository, object alternates and references do not point at Original, and all required objects are available. Verify project-specific regression checks under separate scope; no provider/deploy calls by inference.
7. Only after preservation and standalone checks pass and owner scope explicitly allows it, remove the old linked-worktree dependency/registration in a separate execution Gate. Re-enumerate Original worktrees and prove no live dependency remains before any deletion review.
8. If disposal is chosen instead, prove remaining unique value is zero with independent preservation, explicitly resolve ignored/private and future-use decisions, obtain scoped owner decommission authority, then remove only this worktree and its registration in a separate Gate. No branch/ref deletion is implied.

Stop on state drift, unresolved private retention, incomplete working-content/history coverage, lingering Original dependency, or missing active/disposable decision. No `remove`, `prune`, detach, migration, replacement clone, pointer rewrite, branch deletion or ref deletion was executed.

#### `/Users/kagekun/Desktop/musiam-front-stripe-fix`

Proposed independent preservation: `/Users/kagekun/Library/Application Support/MUSIAM/recovery/c4b-worktree-remediation/stripe-fix/preservation`.
Proposed standalone repository: `/Users/kagekun/Library/Application Support/MUSIAM/recovery/c4b-worktree-remediation/stripe-fix/repository`.
These paths are proposed only, not created. The execution Gate must recheck destination absence and owner scope.

1. Freeze and recheck exact worktree /Users/kagekun/Desktop/musiam-front-stripe-fix, HEAD 117379b6c61ab3fc072b6cd4b80ce1d406b0e175, branch/detached state and NUL status digest e1830c9d9cd43ccebd985573647643a40874b2719d59c3b25856da3743ec1973; stop on drift or active writers.
2. Inventory tracked dirty, staged, expanded untracked and ignored paths using metadata. Separate secret/local holds; obtain the private retention decision before any protected bytes are copied. Current status entries in this record are scope evidence, not a complete ignored-file inventory.
3. In a separately authorized preservation Gate, preserve exact approved working state to /Users/kagekun/Library/Application Support/MUSIAM/recovery/c4b-worktree-remediation/stripe-fix/preservation; independently extract and compare non-sensitive files, modes and paths. Account for index/unstaged layers, ignored value and detached HEAD; do not substitute Original snapshots for current worktree proof.
4. If continued use is chosen, create standalone Git authority at /Users/kagekun/Library/Application Support/MUSIAM/recovery/c4b-worktree-remediation/stripe-fix/repository from the verified independent R0 history authority, supplement any missing current worktree history only under explicit authority. Require a full local object copy, no shared alternates, no Original dependency; validate HEAD and branch (or detached state) against this record.
5. Restore approved dirty/untracked state and index layer to the standalone repository; compare the exact preserved content/status and metadata. Handle approved secrets separately without displaying values.
6. Verify standalone git rev-parse --git-common-dir resolves inside the new repository, object alternates and references do not point at Original, and all required objects are available. Verify project-specific regression checks under separate scope; no provider/deploy calls by inference.
7. Only after preservation and standalone checks pass and owner scope explicitly allows it, remove the old linked-worktree dependency/registration in a separate execution Gate. Re-enumerate Original worktrees and prove no live dependency remains before any deletion review.
8. If disposal is chosen instead, prove remaining unique value is zero with independent preservation, explicitly resolve ignored/private and future-use decisions, obtain scoped owner decommission authority, then remove only this worktree and its registration in a separate Gate. No branch/ref deletion is implied.

Stop on state drift, unresolved private retention, incomplete working-content/history coverage, lingering Original dependency, or missing active/disposable decision. No `remove`, `prune`, detach, migration, replacement clone, pointer rewrite, branch deletion or ref deletion was executed.

## Readiness and next Gate

- `UNPRESERVED_UNIQUE_SOURCE = 0` for the exact C4 21-file set.
- Private blocker: **4 required-current-config + 12 owner-decision = 16 unresolved**.
- Worktree blocker: **WORKTREE_DEPENDENCY_REMEDIATION_REQUIRED**, 3 dependencies; 2 additional preservation requirements and 1 semantic decision.
- Readiness by required priority: **NOT_READY_PRIVATE_RETENTION_DECISION**.
- Next Gate: **C4-B PRIVATE RETENTION DECISION**. Subsequent worktree remediation must include current-state preservation and usage decisions, then explicitly authorized dependency execution.

## Validation and safety boundary

Run `node scripts/validate-cleanup-c4a-blocker-remediation.mjs`, `git diff --check`, and `git status --short`. The validator uses Node built-ins, derives the exact authority sets, verifies the small approved tar and manifests, checks current source hashes after sensitive-path preflight, private metadata accounting, Git state/dependencies, allowed canonical changes and readiness. It does not open private payloads or extract additional archives.

Pre-commit validation: **PASS (541 checks)**; `git diff --check`: **PASS**. The final handoff records the authorized commit and working-tree closure. Only this document, the C4-A JSON, the C4-A validator and Recovery Plan are authorized canonical changes. Local commit message: `recovery: remediate C4 decommission blockers`; push is prohibited.

Original writes/Git mutations/deletion, source deletion/move, private content reads/explicit hashes/copies, worktree mutations, destructive source operations, archive deletion, application changes, provider/payment/data/deploy/push and dependency reinstalls: **0**. One authorized archive was created and 21 files copied into it. Removal of the successful temporary `.verify` is recorded separately from destructive source/archive operations.

Zero-operation declarations describe this Unit’s executed actions; they are not an OS-wide syscall audit. Authorized Git status may internally inspect files; zero-read here means no explicit private payload read, hash or copy. Unchanged Git status is not a proof of all untracked-file bytes or external-process inactivity.

## Truth boundary

Preservation PASS proves only the exact 21-file archive and review accounting. It does not authorize deletion, migration, private preservation, adoption, production/provider/payment/data actions, deploy or push. It does not establish production parity, paid/fulfilled/non-refunded revenue, demand or rights. Historical R0 path membership is not current private-content equality; worktree status is not content equality. Unknown remains unknown.

Recommended next model: current parent for private retention, Git dependency and final integration. No configuration or external provider change is implied.
