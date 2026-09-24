# 伯爵MUSIAM — C4-B Private Retention Owner Decision

`C4B_PRIVATE_RETENTION_DECISION = COMPLETE`。local commit成功後に `COMPLETE_COMMITTED` として報告する。

Owner decisionを固定し、未解決16件を **A=4 / B=4 / C=8** に重複・欠落なく分類した。private 8件は次Gateで現行版を保全する。通常source 8件は全件の現行SHA-256/sizeがR0保存manifestと一致した。追加source保全は **0件**。

`C4_READINESS = NOT_READY_PRIVATE_PRESERVATION_REQUIRED`。`SOURCE_PRESERVATION_REQUIRED = false`。次Gateは **C4-C PRIVATE PRESERVATION EXECUTION**、その次は **C4-D WORKTREE DEPENDENCY REMEDIATION**。今回はいずれも実行しない。

## State Lock / authority

Canonical starting HEAD: `eabf76a5cb35b7b3c973c3b4b7a9dc75eb9e932c` / `recovery/musiam-clean-20260920` / clean。
Original: `/Users/kagekun/Desktop/musiam-front` / `117379b6c61ab3fc072b6cd4b80ce1d406b0e175` / `codex/fix/stripe-metal-print-webhook-20260914`。modified/staged/untracked status entries = **102 / 0 / 433**。C4-AとNUL status digestを含め一致し、照合前後で不変。

C4 review、C4-A machine record、C3-B/C3-C、R0 preservation records、STATE_LOCK、Recovery Planを確認。対象はC4-Aの `REQUIRED_PRIVATE_CONFIG_NOT_PRESERVED` と `OWNER_SECRET_RETENTION_DECISION_REQUIRED` のexact 16 pathsから取得した。現在のowner指示によりGroup Cの8件だけを通常sourceとして扱う。過去のC4-A本文は履歴として保持する。

## Group A / B — fixed retention

全8件のdecision: `RETAIN_CURRENT_PRIVATE_COPY_BEFORE_C4`。exact path、存在、regular type、size、Git categoryおよび既存metadataだけを確認。open/parse/grep/preview/hash/secret scan/content diff/copyは行っていない。

| Group | Exact Original-relative path | Result |
|---|---|---|
| A | `.env` | `RETAIN_CURRENT_PRIVATE_COPY_BEFORE_C4` |
| A | `.env.local` | `RETAIN_CURRENT_PRIVATE_COPY_BEFORE_C4` |
| A | `.env.stripe-sandbox.local` | `RETAIN_CURRENT_PRIVATE_COPY_BEFORE_C4` |
| A | `.vercel/.env.preview.local` | `RETAIN_CURRENT_PRIVATE_COPY_BEFORE_C4` |
| B | `.vscode/settings.json` | `RETAIN_CURRENT_PRIVATE_COPY_BEFORE_C4` |
| B | `.vscode/tasks.json` | `RETAIN_CURRENT_PRIVATE_COPY_BEFORE_C4` |
| B | `.claude/settings.local.json` | `RETAIN_CURRENT_PRIVATE_COPY_BEFORE_C4` |
| B | `.local/abi-knowledge/abi-canonical.json` | `PRIVATE_KNOWLEDGE_PRESERVE_REQUIRED` |

Aの過去R0 copyやprovider側の設定の可能性はcurrent authorityとしない。Bのlocal workflow/permissions/tasksとABI knowledgeはownerの価値判断により保持する。ABIは **PRIVATE_KNOWLEDGE_PRESERVE_REQUIRED**。A/Bの現行bytes同一性は未確認であり、保全済みとはしない。

## Group C — exact current source identity

全件 `NON_SECRET_SOURCE` / `VERIFY_CURRENT_SOURCE_PRESERVATION`。本文の引用・表示なし。各SHA-256、Original/canonical HEAD blob IDとSHA、current modified state、R0 exact-path SHAとmanifest/archive参照はmachine recordに保存。

| Exact path | Current Git state | Independent match | Decision |
|---|---|---|---|
| `.env.local.example` | ignored | R0_VERIFIED_SNAPSHOT | `CURRENT_VERSION_ALREADY_PRESERVED` |
| `.env.example` | tracked modified | R0_VERIFIED_SNAPSHOT | `CURRENT_VERSION_ALREADY_PRESERVED` |
| `src/lib/metal-print-consultation-token.server.ts` | tracked clean | CANONICAL_CURRENT, R0_VERIFIED_SNAPSHOT, CANONICAL_HEAD | `CURRENT_VERSION_ALREADY_PRESERVED` |
| `src/lib/design/tokens.ts` | tracked clean | CANONICAL_CURRENT, R0_VERIFIED_SNAPSHOT, CANONICAL_HEAD | `CURRENT_VERSION_ALREADY_PRESERVED` |
| `src/styles/renovation-tokens.css` | tracked clean | CANONICAL_CURRENT, R0_VERIFIED_SNAPSHOT, CANONICAL_HEAD | `CURRENT_VERSION_ALREADY_PRESERVED` |
| `scripts/audit-secret-hygiene.mjs` | untracked ?? | R0_VERIFIED_SNAPSHOT | `CURRENT_VERSION_ALREADY_PRESERVED` |
| `public/nft/token-template.json` | tracked clean | CANONICAL_CURRENT, R0_VERIFIED_SNAPSHOT, CANONICAL_HEAD | `CURRENT_VERSION_ALREADY_PRESERVED` |
| `.husky/commit-msg` | tracked clean | CANONICAL_CURRENT, R0_VERIFIED_SNAPSHOT, CANONICAL_HEAD | `CURRENT_VERSION_ALREADY_PRESERVED` |

**CURRENT_VERSION_ALREADY_PRESERVED = 8** / **CURRENT_VERSION_PRESERVATION_REQUIRED = 0**。preservation-required exact paths: `[]`。

`.env.example` は引き続きtracked modifiedで、Original HEAD/canonicalとは異なるが、現行1528 bytesのSHA-256がR0 `tracked-working-tree.pax` の検証済みmanifestと一致した。exampleという名前による免除ではなく現行bytes比較で解決した。

`metal-print-consultation-token.server.ts`、design/CSS/NFTのtokenファイルもowner指定に従う通常sourceであり、filenameによるcredential HOLDは解除した。内容をapplicationへ採用した意味ではない。

### R0 evidence boundary

R0の既存full extractionはtracked 4,442、untracked 2,896、ignored 1,585件。v2の8,091 issuesは全件MODEのみで、path/type/size/SHA issueはなく、その後のmode-preserving extractionは0 issue。本GateはGroup Cのexact manifest SHA/sizeと現行bytesを比較し、3 archivesと2 manifestsのsize/mtime/real pathがC4記録から継続していることを確認した。privateを含むmixed archive payloadを再open/hash/extractしていない。R0の過去検証を再利用した証拠であり、現在のarchive全体を再検証したとは主張しない。

## C4-C private preservation plan — not executed

提案先: `/Users/kagekun/Library/Application Support/MUSIAM/private-preservation/cleanup-c4c-current-private-20260924`。未作成・未予約。次Gateで正確な保存先と権限を再確認する。Original/Canonical外、C2/C3/C4-A generic archivesとも分離したprivate storageとする。

1. At separately authorized C4-C, re-lock Canonical/Original HEAD, branch and status. Re-derive exactly the eight Group A/B paths. Confirm regular files, no symlink escapes and no concurrent edits. Current C4-B metadata does not prove bytes unchanged.
2. Use the proposed private root only after destination/scope recheck. It must be outside Original and Canonical, apart from C2/C3/C4A generic archives. Stop on a pre-existing destination; do not overwrite. Use owner-only directory permissions (0700) and file permissions (0600), with umask 077 and ACL checks.
3. Copy only the exact approved private allowlist through an opaque local process. Do not emit payloads, diffs, secret scans, hashes or values to model, terminal, logs or Git. Do not use external storage/provider transfer under inferred authority.
4. Under explicit C4-C verification authority, verify current source/destination byte identity in-process and report only per-path equality booleans and metadata. Recheck source stability around the copy; stop on mismatch. No digest/value output and no raw private files in canonical Git.
5. Before any later Original deletion review, confirm all eight private copies exist, permissions and path mapping are intact, and current-version equality evidence is valid. Record path/count/size/type and success metadata only, with no secret values.
6. Keep private preservation distinct from any ordinary-source artifact. Carry worktree remediation forward to C4-D; successful private preservation still does not authorize migration or deletion.

Stop: source/destination drift、unsafe/missing path、permission不足、部分copy・不一致、想定外の値出力、scope逸脱。private copyの成功だけでOriginal deletionを許可しない。

Group C extra-source plan: 今回0件のため追加artifact不要。次Gateで現行版にdriftがあり通常source保全が必要になった場合は、private 8件と**別artifact**にする。

## Worktree blocker / readiness

`WORKTREE_DEPENDENCY_REMEDIATION_REQUIRED` をcarry forwardする。C4-Aの3 linked worktrees（保全必要2 / semantic decision必要1）および6 missing/prunable historical registrationsは未変更。本Gateではworktreeの再監査・migration・remove・pruneをしていない。C4-Aに残る旧「C4-B worktree remediation」の提案名より、今回の **C4-D WORKTREE DEPENDENCY REMEDIATION** を現行Gate順序とする。

private preservation未実行8件のため必ず **NOT_READY_PRIVATE_PRESERVATION_REQUIRED**。C4 Human deletion Gateは閉じたまま。

## Validation / truth boundary

実行: `node scripts/validate-cleanup-c4b-private-retention-decision.mjs`、`git diff --check`、`git status --short`。validatorはexact partition、scope、live Group C identity、R0 metadata continuity、Original不変、decision/readiness/planを再確認する。privateの内容やmixed archivesには触れない。Pre-commit validator **633 checks PASS**、`git diff --check` **PASS**。commit後もHEAD・4-file scope・clean状態を確認する。

Zero-operation fields attest scoped executed commands and artifacts, not an OS-wide syscall audit. Authorized Git status may inspect tracked files internally. A/B zero-read/hash means no explicit private payload read, parse, grep, preview, diff, scan, hash or copy by this Gate. Reading previously recorded R0 manifest metadata is not a private payload read. Group C payloads were hashed in memory only, never printed.

Original writes、destructive operations、private/source copies、worktree mutations、application changes、provider/payment/deploy/push、C4 deletionはすべて0。zero操作はscope内の実行記録に基づき、OS全体の監査ではない。Git statusによる内部読取とexplicit private content inspectionは区別する。

Local decision/identity validation is not deletion readiness and does not authorize C4-C execution, Original deletion, worktree migration/removal, source adoption, archive deletion, production/provider/payment/deploy/push actions. It does not prove production parity, demand, payment, fulfillment or rights. R0 recorded full extraction and live metadata continuity support the declared snapshot scope; metadata continuity alone is not a new full archive integrity test. A/B current identity remains UNKNOWN until separately authorized private preservation. Worktree evidence is carried forward from C4A, not freshly re-audited. Unknown remains unknown.

変更・local commitはこの文書、machine record、validator、Recovery Planの4ファイルのみ。commit message: `recovery: decide C4 private retention`。次Gateは開始せず停止する。推奨next model: current parent `gpt-6-astra`。
