# 伯爵MUSIAM — Recovery Phase 1 State Lock

観測: 2026-09-20 UTC。これはローカル実体の記録であり、本番稼働・売上・デプロイ同一性を示さない。

## 原本と同時書込み

|所在|HEAD / 状態|扱い|
|---|---|---|
|`/Users/kagekun/Desktop/musiam-front`|`117379b6`; branch `codex/fix/stripe-metal-print-webhook-20260914`; tracked 102、untracked 2,896、staged 0|原本・変更禁止|
|`/Users/kagekun/.codex/worktrees/6df2/musiam-front`|`117379b6`; detached; tracked 62、untracked 143|別成果物、読取のみ|
|`/Users/kagekun/Desktop/musiam-front-stripe-fix`|`117379b6`; branch `fix/stripe-metal-print-webhook-20260914`; tracked 1、untracked 2|Webhook照合元、読取のみ|

CodexでこのRecovery taskのみがactive、同一cwdの他Codex taskはidleだった。対象プロセス確認では、保全処理以外のMUSIAM/Next実行は観測されなかった。従ってこのsnapshotでは `QUIESCE_REQUIRED` を検出していない。ただし観測外の書込みは否定しない。

開始・保全後とも、原本のHEADは `117379b6c61ab3fc072b6cd4b80ce1d406b0e175`、index SHA-256は `c002b3cda1addf27e5c8ab169944438dbbb9782a87040ca56f7448db1105fde9`、status集合SHA-256は `1c02748debcf3a0a631862de8c40b09c8224f76d5a22333cce0d66ea886eafca` だった。差分集計は unstaged `+15,505/-11,822`、staged `0/0`。

## 保全

本人専用（mode 700）の保全先: `/private/tmp/musiam-recovery-phase1-20260920-01a0beba/`。このパスは同一ローカルディスク上であり、ディスク故障対策ではない。

- `tracked-working-tree.pax`: 4,442 tracked実体（676,377,426 bytes）。Git object欠損時にも現working treeを復元するための主コピー。
- `untracked.pax`: 2,896 untracked実体（2,310,391,660 bytes）。
- `ignored-preserved.pax`: `node_modules/`、`.next/`、`.DS_Store`、`tsconfig.tsbuildinfo`を除いた1,585 ignored実体（1,325,358,328 bytes）。秘密を含み得る`.env*`は通常docsに露出させず、private archive内だけに保全した。
- `git-dir.raw.tar`、`index.bin`、staged/unstaged binary patch、開始時status/worktree一覧、SHA-256 manifestを保存。source-file manifestは種別・size・mode・hash・symlink先を記録し、保全対象のsymlinkは0件。

別の一時検証先でuntracked archiveから `docs/AI/PROJECT_STATE.md` を展開し、内容SHA-256一致を確認した。全archiveの一覧読取とarchive自身のSHA-256も保存済み。LFS/submodule実体、外部symlink先、SSD raw、モデル重みは本snapshotの対象外（該当symlinkは0、SSDは未mount）。

`git bundle --all` と `git bundle HEAD` は object `ed77db6020119caae3f992b7a70d41dfd1c86b76` を読めず失敗した。raw `.git` は保存したが、Gitとしての完全復元は未検証である。tracked実体archiveにより現在のファイル状態は別経路で保全した。このGit object欠損は `BASELINE_GIT_INTEGRITY_UNVERIFIED` とする。

## R0補完（2026-09-20 UTC）

旧保全は削除せず、本人専用・非一時の `/Users/kagekun/Library/Application Support/MUSIAM/recovery/20260920T-r0-completion-01a0beba/source-preservation/` へコピー固定した。旧manifest一致、主要archiveの再計算SHA-256一致、代表4 archiveのinode非共有を確認した。同一ディスクのため耐障害バックアップではない。

3 pax は安全なパス一覧を確認して別々に展開し、全件を機械照合した。tracked 4,442、untracked 2,896、preserved ignored 1,585 はパス・種別・size・SHA-256が一致した。通常展開のmode差はumaskによるものと分離し、`pax -p e` の別展開で全件modeも一致した（0 issue）。

6df2 とstripe-fixは共通Git directoryを共有するため独立Git保全とは数えない。各worktreeのtracked実体、untracked、preserved ignored、index、patch、状態を `worktrees/` 配下の別snapshotとして保存し、各snapshotの前後statusは一致した。astraは現時点でdirty 0 / untracked 0で、同じcommon Git directoryを共有するため追加実体はない。

raw Git診断コピーは alternatesなし、shallowなし、replace refなし、core.worktreeなしだった。HEADの現在tree 4,442 blobは読取可能。しかし親履歴を含むobject走査は失敗し、fsckは欠損blob 2件（`ed77db…` と `445c5d…`）を記録した。どちらも過去treeのzip artifactを指す。従って、HEAD現在treeとWORKING_SNAPSHOTは別々に復元可能だが、COMMITTED_BASELINEの完全履歴は未復元である。

## R0履歴回復（2026-09-20 UTC）

新規の非一時private作業領域 `/Users/kagekun/Library/Application Support/MUSIAM/recovery/20260920T-r0-history-recovery-01a0beba/` にdonor、recovered-blobs、repair-candidate、verification、reportsを分離した。原本・既存worktree・前回固定保全には書き戻していない。

`ed77db…` は固定保全内のZIPを `git hash-object --no-filters -t blob` で完全ID一致確認後、repair-candidateだけへ補充した。type=blob、size=48,932,680、全バイトSHA-256も回収元と一致する。正式originから新規bare donorを1回取得し、Aは存在したが、`445c5df9b9533971eb4d21810d70219b8d59955a` は存在しなかった。Bは補充していない。

repair-candidateの補充後fsckはBだけをmissing blobとして残した。指定HEAD `117379b6` は全到達objectを読取可能で、自己完結bundle（640,344,677 bytes）のverify、空bare repositoryへの読戻し、HEAD/root tree一致を確認した。補充前後でrepair-candidateのHEADとrefsは不変。これは復旧用コピーの履歴回復であり、原本Git修復・本番同一性・アプリ正常性の証明ではない。

## 所在と本番対応

`git worktree list` は本体、6df2、stripe-fix、astra及びprunableな過去worktreeを示す。Phase 5/6の既定一時候補（`/private/tmp/musiam-quality-phase5-r8-20260913`、`...phase6-c1...`、`/private/tmp/musiam-shaman-999`）は現存しない。一方、mainの `ops/simulation-refinement/phase5-generalization-20260913/` と `phase6-three-lanes-20260913/` は現存し、上記archiveに含まれる。

Phase 5 r8の `operational/preservation-r8-final.json` は `candidateStatus: HOLD` を記録する。Phase 6はA/B比較記録とlane C実装記録が同居するため、採用済みとは扱わない。Music Evidence Factory scriptとその限定音源のmanifestも現存するが、全曲理解・販売承認ではない。

HEAD、branch、local release/freeze manifestは本番の証明ではない。Vercel認証欠測と現在の本番・売上は未確認であり、`PRODUCTION_PARITY_UNVERIFIED`。

## Webhook現物照合

|ファイル|main|6df2|stripe-fix|
|---|---|---|---|
|`webhook/route.ts`|present, `929d395b…f7221`|present, `a31737da…ecce5`|present, `fd6836c…9a016`|
|`metal-print-webhook-identity.ts`|present, `3f086ac0…98b4`|absent|present, same hash|
|`validate-metal-print-webhook-routing.ts`|present, `e4a4b7c0…ee47`|absent|present, same hash|

この差異は現物hashだけの観測であり、移植済み・正しさ・本番反映の判断ではない。
