# 伯爵MUSIAM — Recovery Map（Phase 1終了時点）

この文書は救出順の地図であり、Phase 2の実装、diff編集、HOLD解除、テスト再実行、commit、外部操作を許可しない。

## Recovery Units

|ID|Unit / 所在|方針・採用状態|依存 / 次の最小検証|
|---|---|---|---|
|R0|原本snapshot（tracked、untracked、ignored、Git metadata）|`PRESERVE_HOLD` / 作業中|他の全Unitの基点。archive hash、個別展開、Git object欠損の切り分け。|
|R1|Metal Print webhook: main、stripe-fix、6df2|`RECOVERED` / local validation PASS|識別guardのみを限定救出。fixture validator・typecheck・最終diff確認済み。local commitを作成。|
|R2|Phase 5 r8: `ops/simulation-refinement/phase5-generalization-20260913/`|`RECOVERED_PRESERVED_HOLD` / 凍結候補|`freeze-r8.json`、preservation record、26-file source archive/patch、compact evaluation summaryを限定復元。HOLDのまま、R3はこのfreezeを比較baselineとして参照する。|
|R3|Phase 6: `ops/simulation-refinement/phase6-three-lanes-20260913/`|`RECOVERED_PRESERVED_EXPERIMENT` / 未適用|R2凍結baselineへ binding 済み。Lane A は provider failure を含む部分的 diagnostic、Lane B は未実行、Lane C c1 は `PRESERVED_CANDIDATE`。application には未適用。|
|R4|Music Evidence Factory: scriptとPhase 5/6 music records|`RECOVERED_EVIDENCE_BOUNDARY` / source-scoped historical evidence|canonicalは`batch-r3`の10 uniquely runtime-bound measured sources。9 historical public metadata rows、local full candidates 2、full-track verified 0。`docs/AI/R4_MUSIC_EVIDENCE_RECOVERY.md` とclaims matrixを参照し、販売/全曲理解/推薦可否へ昇格しない。|
|R5|Shaman 999: `SHA_collection_999_unique/`（1,000 untracked）|`PRESERVE_HOLD` / 別案件候補|アプリ基盤と分離。source/provenance/採用意図が揃うまで移動・公開・再生成しない。|
|R6|営業・公開・継続運用台帳: untracked `ops/` 1,338件、`operational/`等|`UNKNOWN` / 作業中|R0に依存。G0観測/G1実注文・納品の根拠を、local/synthetic/provider/productionで分離して分類。|
|R7-A|Catalog / Knowledge Foundation|`RECOVERED` / local validator PASS|`works.json`を一次masterとして保持し、ID/explicit mapping/UUIDのみでruntime mergeする。`docs/AI/R7A_CATALOG_KNOWLEDGE_RECOVERY.md`を参照。|
|R7-B|Chat / Recommendation Core|`RECOVERED`|current request優先、session-scoped opt-out、one-work catalog recommendation、recorded public action guardをlocal fixture/typecheckで確認。provider/network 0、`PRODUCTION_PARITY=UNVERIFIED`。|
|R7-C1|Chat UI / History / Card Wiring|`RECOVERED`|active v3 response、anonymous history、stable workId card/action、stale/retry guardをlocal fixture/typecheckで確認。`docs/AI/R7C1_CHAT_UI_HISTORY_RECOVERY.md`を参照。15-turn/payment/accessは含まない。|
|R7-C2|15-turn / paid continuation|`BLOCKED_PRODUCT_CONTRACT` / `PAID_CONTINUATION_NOT_ACTIVATED`|旧dirtyの15-turn/Redis候補は確認したが、Chat継続用のcanonical product、price、Stripe binding、delivery/entitlement意味が成立しない。active routeは20-turn abuse/cost guardのまま。`docs/AI/R7C2_PAID_CONTINUATION_RECOVERY.md`を参照。|
|R7-D1|Exhibition / Oracle / Omikuji Alignment|`RECOVERED` / local validator PASS|Exhibition は R7-A canonical server projection へ最小 adapter で接続し、全514件の explicit released work を表示対象としてcoverage確認。Oracle / Omikuji は current intentional redirect を維持（`ORACLE_INACTIVE_BY_DESIGN`）。`docs/AI/R7D1_EXHIBITION_ORACLE_RECOVERY.md`を参照。|
|R7-D2|Realm / Letters / Broadcast / secondary revisit surfaces|`NOT_STARTED`|R7-D1から分離。Home / Realm、Letters、Broadcast、Now Playing等はこのUnitで変更しない。|
|HISTORY-DELTA|R7-D前のCodex History V2差分監査|`AUDITED_R7D_HANDOFF_REQUIRED`|`docs/AI/HISTORY_DELTA_AUDIT.md`を参照。R7-Dは開始していない。R6 plan rowの旧`UNKNOWN / 作業中`表記はFinal IntegrationでR6 Operational Truthと正規化するhandoffであり、live/provider/current productionの証拠ではない。|

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
