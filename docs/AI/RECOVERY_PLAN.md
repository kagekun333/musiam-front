# 伯爵MUSIAM — Recovery Map（Phase 1終了時点）

この文書は救出順の地図であり、Phase 2の実装、diff編集、HOLD解除、テスト再実行、commit、外部操作を許可しない。

## Recovery Units

|ID|Unit / 所在|方針・採用状態|依存 / 次の最小検証|
|---|---|---|---|
|R0|原本snapshot（tracked、untracked、ignored、Git metadata）|`PRESERVE_HOLD` / 作業中|他の全Unitの基点。archive hash、個別展開、Git object欠損の切り分け。|
|R1|Metal Print webhook: main、stripe-fix、6df2|`UNKNOWN` / 作業中|決済・Redis・offer境界とSHARED。3ファイルの限定diffを人間/高リスクレビュー後にfixtureだけで検証。|
|R2|Phase 5 r8: `ops/simulation-refinement/phase5-generalization-20260913/`|`PRESERVE_HOLD` / 凍結候補|`freeze-r8.json`とpreservation record。HOLDのまま、候補source/patch/hashの対応を再確認。|
|R3|Phase 6: `ops/simulation-refinement/phase6-three-lanes-20260913/`|`PRESERVE_HOLD` / 未確認|R2とは別。lane A/B比較とlane C本体候補を混同せず、authorization/checkpointと各laneの入力・出力を照合。|
|R4|Music Evidence Factory: scriptとPhase 5/6 music records|`PRESERVE_HOLD` / 限定測定記録|R2/R3の記録に依存。対象音源・generator・hash manifestを対応付け、販売/全曲理解へ昇格しない。|
|R5|Shaman 999: `SHA_collection_999_unique/`（1,000 untracked）|`PRESERVE_HOLD` / 別案件候補|アプリ基盤と分離。source/provenance/採用意図が揃うまで移動・公開・再生成しない。|
|R6|営業・公開・継続運用台帳: untracked `ops/` 1,338件、`operational/`等|`UNKNOWN` / 作業中|R0に依存。G0観測/G1実注文・納品の根拠を、local/synthetic/provider/productionで分離して分類。|
|R7|カタログ・UI・Chat・scripts: tracked dirtyとuntracked `src/`、`public/`、`scripts/`|`UNKNOWN` / 作業中|`works.json`、`globals.css`、`chat-reco.ts`はSHARED保護面。機能別に限定diffを読み、移植・formatはしない。|

SHARED/高リスク: `public/works/works.json`、`src/app/globals.css`、`src/pages/api/chat-reco.ts`、Metal PrintのStripe/Redis/offer関連、承認・evidence台帳。いずれも本Recoveryでは編集禁止。

## Phase 2基点候補

ローカル復旧の候補は、保全済みのcurrent working-tree snapshotとHEAD `117379b6`である。理由は本体、6df2、stripe-fixが同じHEADを指し、現working treeの全tracked/untracked必要実体をprivate archiveへ保存済みだからである。ただし、Git object欠損のためbundle生成が失敗しており、これはGit健全な基点ではない。`PRODUCTION_PARITY_UNVERIFIED` のまま、既存本番の代替でも公開根拠でもない。

Phase 2を開始する前に必要な最小GateはR0のarchiveから孤立した検証領域へ再展開して、対象Unitで必要なbaselineファイルとpatch適用可否を確認すること。その後も、最初の救出対象はR1（決済境界）ではなく、リスクが低く独立したR5またはR6の具体的に識別できる1 Unitとする。R1は高リスクレビューと明示承認なしに進めない。

## 実行境界

このPhaseで行った書込みはこの2文書とprivate preservation/verification directoryのみ。reset、restore、clean、stash、checkout、stage、commit、branch切替、削除、移動、format、test/build、provider/API、認証、push/pull/fetch/merge/deployは行っていない。

R0補完後の判定: `PRESERVATION=VERIFIED_FOR_DECLARED_SCOPE`（固定copyと3 archive実体）、`HEAD_TREE=VERIFIED`、`HEAD_HISTORY=INCOMPLETE`、`OTHER_REFS=INCOMPLETE`、`PRODUCTION_PARITY=UNVERIFIED`。従って `PHASE2_GATE=NEEDS_HISTORY_RECOVERY`。次の最小作業は、明示承認後に欠損blob 2件の復元元を既知の独立local sourceまたは既存remoteから特定することだけである。object補充・履歴修復・Phase 2は本Phaseの範囲外。

R0履歴回復後の判定: `HISTORY_RECOVERY=VERIFIED_COPY`。対象HEADの自己完結bundleと独立読戻しが成功したため、`PHASE2_GATE=READY_HISTORY_BASED`。ただしBがother refsに残るため `OTHER_REFS=INCOMPLETE`、本番は引き続き `PRODUCTION_PARITY=UNVERIFIED`。これはPhase 2開始や既存原本への採用を実行した意味ではない。

以前の「R5またはR6を低リスクで先に」という案は未採用の暫定案であり、Unit順序はPhase 2が明示的に許可された後、MUSIAM本体の依存関係から決める。商品化、営業、Webhook変更はこの履歴回復の範囲外。

## Phase 2 — Independent Clean Baseline（2026-09-20 UTC）

検証済みの自己完結bundleから独立repositoryを作成し、`recovery/musiam-clean-20260920` を指定HEAD `117379b6c61ab3fc072b6cd4b80ce1d406b0e175` から開始した。`COMMITTED_BASELINE` はこの指定HEADであり、application codeは変更していない。AI Recovery docsのみを原本の現行版から引き継ぐ。

`HISTORY_RECOVERY=VERIFIED_COPY`、`PHASE2_GATE=READY_HISTORY_BASED`。`WORKING_SNAPSHOT` は未移植であり、OTHER_REFSに残る古い欠損blobは指定HEADの自己完結履歴・Phase 2基点を阻害しない。`PRODUCTION_PARITY=UNVERIFIED` は継続する。Recovery Unitの実行順はこの記録で確定しない。
