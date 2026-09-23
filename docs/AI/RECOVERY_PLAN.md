# 伯爵MUSIAM — Recovery Map（Final Integration）

この文書はRecoveryの経緯と、2026-09-21のローカル正本を併記する地図である。過去のPhase 1記録は下記に保存し、最終状態は本節と末尾のFinal Integrationをcanonicalとする。これはdeploy、production設定、provider操作、HOLD解除、又はhistorical candidateの採用を許可しない。

## Recovery Units

|ID|Unit / 所在|方針・採用状態|依存 / 次の最小検証|
|---|---|---|---|
|R0|原本snapshot（tracked、untracked、ignored、Git metadata）|`VERIFIED_PRESERVATION` / `VERIFIED_HISTORY_COPY`|fixed private recovery copy、readable HEAD tree、verified self-contained HEAD history/bundleを確認。`HISTORY_RECOVERY=VERIFIED_COPY`、`PHASE2_GATE=READY_HISTORY_BASED`。`OTHER_REFS=INCOMPLETE`は維持。|
|R1|Metal Print webhook: main、stripe-fix、6df2|`RECOVERED` / local validation PASS|識別guardのみを限定救出。fixture validator・typecheck・最終diff確認済み。local commitを作成。|
|R2|Phase 5 r8: `ops/simulation-refinement/phase5-generalization-20260913/`|`RECOVERED_PRESERVED_HOLD` / 凍結候補|`freeze-r8.json`、preservation record、26-file source archive/patch、compact evaluation summaryを限定復元。HOLDのまま、R3はこのfreezeを比較baselineとして参照する。|
|R3|Phase 6: `ops/simulation-refinement/phase6-three-lanes-20260913/`|`RECOVERED_PRESERVED_EXPERIMENT` / 未適用|R2凍結baselineへ binding 済み。Lane A は provider failure を含む部分的 diagnostic、Lane B は未実行、Lane C c1 は `PRESERVED_CANDIDATE`。application には未適用。|
|R4|Music Evidence Factory: scriptとPhase 5/6 music records|`RECOVERED_EVIDENCE_BOUNDARY` / source-scoped historical evidence|canonicalは`batch-r3`の10 uniquely runtime-bound measured sources。9 historical public metadata rows、local full candidates 2、full-track verified 0。`docs/AI/R4_MUSIC_EVIDENCE_RECOVERY.md` とclaims matrixを参照し、販売/全曲理解/推薦可否へ昇格しない。|
|R5|Shaman 999: `SHA_collection_999_unique/`（1,000 untracked）|`PRESERVE_HOLD` / `SEPARATE_BUSINESS_SCOPE`|アプリ基盤と分離。source/provenance/採用意図が揃うまで移動・公開・再生成しない。|
|R6|営業・公開・継続運用台帳: untracked `ops/` 1,338件、`operational/`等|`RECOVERED` / canonical truth in `R6_OPERATIONAL_TRUTH.md`|G0観測/G1実注文・納品の根拠をlocal/synthetic/provider/productionで分離。production current observationの保証ではなく、old zeroをcurrent zeroとして扱わない。|
|R7-A|Catalog / Knowledge Foundation|`RECOVERED` / local validator PASS|`works.json`を一次masterとして保持し、ID/explicit mapping/UUIDのみでruntime mergeする。`docs/AI/R7A_CATALOG_KNOWLEDGE_RECOVERY.md`を参照。|
|R7-B|Chat / Recommendation Core|`RECOVERED`|current request優先、session-scoped opt-out、one-work catalog recommendation、recorded public action guardをlocal fixture/typecheckで確認。provider/network 0、`PRODUCTION_PARITY=UNVERIFIED`。|
|R7-C1|Chat UI / History / Card Wiring|`RECOVERED`|active v3 response、anonymous history、stable workId card/action、stale/retry guardをlocal fixture/typecheckで確認。`docs/AI/R7C1_CHAT_UI_HISTORY_RECOVERY.md`を参照。15-turn/payment/accessは含まない。|
|R7-C2|15-turn / paid continuation|`BLOCKED_PRODUCT_CONTRACT` / `PAID_CONTINUATION_NOT_ACTIVATED`|旧dirtyの15-turn/Redis候補は確認したが、Chat継続用のcanonical product、price、Stripe binding、delivery/entitlement意味が成立しない。active routeは20-turn abuse/cost guardのまま。`docs/AI/R7C2_PAID_CONTINUATION_RECOVERY.md`を参照。|
|R7-D1|Exhibition / Oracle / Omikuji Alignment|`RECOVERED` / local validator PASS|Exhibition は R7-A canonical server projection へ最小 adapter で接続し、全514件の explicit released work を表示対象としてcoverage確認。Oracle / Omikuji は current intentional redirect を維持（`ORACLE_INACTIVE_BY_DESIGN`）。`docs/AI/R7D1_EXHIBITION_ORACLE_RECOVERY.md`を参照。|
|R7-D2|Realm / Letters / Broadcast / secondary revisit surfaces|`RECOVERED` / local validator PASS|Home / Realm、Letters、Broadcast、Now Playingをinventoryし、title-only display identity fallbackだけをstable work-ID fallbackへ最小修正。historical Letters/Broadcast hunksはcurrent cleanに既存のため非採用。`docs/AI/R7D2_SECONDARY_SURFACES_RECOVERY.md`を参照。|
|R7-D|Secondary discovery / revisit surfaces|`RECOVERED`|R7-D1とR7-D2のlocal gateを完了。Exhibitionはcanonical server projection adapter、Oracleは`ORACLE_INACTIVE_BY_DESIGN`、secondary surfacesはstable work-ID/canonical server projectionを維持。|
|HISTORY-DELTA|R7-D前のCodex History V2差分監査|`AUDITED_HANDOFF_CONSUMED`|監査記録は`docs/AI/HISTORY_DELTA_AUDIT.md`に保存。R7-D1/D2とFinal Integrationでhandoffを消化した。`chat-analysis`は`PRESENT_IN_PRESERVATION_ONLY`であり、current cleanへは復活しない。|

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

## Recovery Final Integration（2026-09-21 UTC）

`RECOVERY_FINAL_INTEGRATION = LOCAL_RECOVERY_INTEGRATED_WITH_KNOWN_BLOCKER`。R0、R1、R2、R3、R4、R6、R7-A、R7-B、R7-C1、R7-C2、R7-D1、R7-D2、HISTORY-DELTAのローカル状態と回帰validatorを統合確認した。R5は`PRESERVE_HOLD / SEPARATE_BUSINESS_SCOPE`のまま別案件である。既存`next/font`のGoogle Fonts DNS取得によりlocal buildはBLOCKEDであり、workaroundやretryは行わない。

Final Integrationはローカル復旧の完了記録であり、production parity、deploy readiness、payment activation、Oracle activation、R2 HOLD解除、R3 candidate採用、R5統合を意味しない。`PRODUCTION_PARITY=UNVERIFIED`を維持する。詳細、validation matrix、root typecheck裁定、known blocker/解消、次Gateは`docs/AI/RECOVERY_FINAL_INTEGRATION.md`をcanonicalとする。

## PRODUCTION-PARITY Gate（2026-09-21 CEST）

`PRODUCTION_PARITY = PARTIAL`、`PRODUCTION_PARITY_STATUS = RC_SOURCE_PROVENANCE_INCOMPLETE`。現行alias `www.hakusyaku.xyz` は Vercel deployment `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX`（READY）へ向くことをread-onlyで確認した。しかしそのmetadataにGit provider/repository/branch/SHAがなく、`DIRECT_DEPLOY_SOURCE`である。従ってRecovery `3f34aac`とのexact tree diff、production-only変更の採否、migration要否は確定していない。env name contractは`COMPATIBLE_NAMES_ONLY`、local buildは既知の`next/font` DNSにより`BLOCKED_BY_FONT_DNS`、public GET smokeは`PASS_READ_ONLY`である。

このGateはRecovery Final Integrationを再開せず、deploy/push/promote/rollback/merge/source copy/config変更/provider/payment/data操作を行っていない。次の最小Human Gateはreproducibleな現行production source（verified Git SHA又は承認済みimmutable artifact）を確立し、その後に別Unitでexact diffとmerge planだけをレビューすること。詳細は`docs/AI/PRODUCTION_PARITY_RELEASE_CANDIDATE.md`、機械可読recordは`ops/recovery/production-parity-20260921.json`を参照する。

### Production Source Provenance sub-Gate（2026-09-21 CEST）

`PRODUCTION_SOURCE_PROVENANCE = EXACT_REPRODUCIBLE_SOURCE`。current deployment
`dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX` のVercel input manifestと、isolated local
candidateのnon-mutating dry-runが3,150件のrelative path、mode、content IDで
完全一致した。candidateはoriginal deploy cwdとしては未証明であり、Git SHAも
ないが、complete included source treeのreproducible identityは確立した。

`PRODUCTION_PARITY = PARTIAL`、`RC_SOURCE_PROVENANCE_INCOMPLETE`、env/value、data、
provider、payment、production-vs-Recovery diff、merge classification、RC assemblyは
未実施のままである。historical small webhook-hotfix leadはfull prior-to-current
deltaの証明ではない。次Gateは **Exact Production vs Recovery Diff / Merge Plan**
だけであり、本sub-Gateでは開始していない。詳細は
`docs/AI/PRODUCTION_SOURCE_PROVENANCE.md` と
`ops/recovery/production-source-provenance-20260921.json` を参照する。

### Exact Production vs Recovery Diff / Merge Plan（2026-09-21 CEST）

`DIFF_STATUS = RC_BASE_READY_WITH_MERGE_UNITS`。Recovery
`c76c138f7258096e1a606235e89107782eb1ebc0` をRC baseとして維持し、production
sourceの一括採用・source copy・merge・RC assembly・deploy・pushは行わない。

保存済みproduction deploy input 3,150件とRecovery deploy input 3,199件を、path・mode・
content ID単位で比較した。結果は identical 2,987、modified 40、mode-only 1、
production-only 122、recovery-only 171、total differing paths 334。requested
`vercel deploy --dry --format=json` はRecoveryがproject-linkedでないため
`BLOCKED_PROJECT_NOT_LINKED`だが、Vercel CLI 59.23.2のoffline collectorを保存済み
production dry manifestで校正し、production側3,150件の完全一致を確認した。
provider mutationは0件である。

全334パスのhash・mode・分類・subsystem・runtime relevance・review status・decision・
evidenceは `ops/recovery/production-vs-recovery-diff-20260921.json` に保存した。
application/configurationの156パスは全件review済み。production-onlyの候補は
M1 Digital Commerce / Delivery PreservationとM2 Privacy / Analytics / Funnel
Preservationの2 merge unitsに限定し、9 conflictsと8 UNKNOWN operational pathsは
owner decisionがない限り採用しない。

R7-A、R7-B、R7-C1、R7-D1、R7-D2、R1、ORACLE inactive、およびR7-C2 blocked contractは
Recovery側canonicalのまま維持する。`R7-C2 = BLOCKED_PRODUCT_CONTRACT`、
`PAID_CONTINUATION_NOT_ACTIVATED`、`history != entitlement`、
`chat-analysis = PRESENT_IN_PRESERVATION_ONLY`を継続する。

次の最小Gateは、M1/M2と9 conflictsのRC Assembly reviewだけである。database/env/provider/
payment/data/customer stateはこの比較からは確定せず、migration assessmentも
database UNKNOWN、Redis/route/catalog/paymentMetadata POSSIBLEのまま保持する。
詳細とtruth boundaryは `docs/AI/PRODUCTION_VS_RECOVERY_DIFF_MERGE_PLAN.md`、機械可読
recordは上記JSON、validatorは `scripts/validate-production-vs-recovery-diff.ts` を参照する。

Terra semantic decision auditは `TERRA_DECISION_AUDIT = REVISED`。334-path computationを
再実行せず、26 `PRODUCTION_ONLY_VALID`、original 12 conflicts、8 UNKNOWNをsource semanticsで
独立reviewした。M1のnew order/delivery pathは`approvedAt: null`によりfail-closedであり、
legacy hosted Checkout linkの存在は決済成功・納品・customer usageの証拠ではない。M2は
DNT/GPC/local opt-out、bounded event schema、fail-closed provider/storage behaviorを持つが、
analytics availabilityを意味しない。production Chat/Metal Print flowだけに従属する3 helperは
`SUPERSEDED_BY_RECOVERY`へ裁定し、remaining conflictは9件。Vercel CLI 59.23.2 internal collectorは
保存production manifestを3150/3150 tupleで再現した固定snapshot用としてACCEPTし、internal APIゆえ
version-boundであることを記録する。次GateはM1/M2と**9 conflicts**のRC Assembly reviewのみ。

### RC-ASSEMBLY-REVIEW（2026-09-22 CEST）

`RC_ASSEMBLY_REVIEW = READY_WITH_OWNER_DECISIONS`。Recovery
`86356c80c84efb7f1650465f8b1ea35c6d064e86` をRC baseとして維持し、M1の13
Digital Commerce / Delivery pathsは全件 `DEFER_SEPARATE_PRODUCT_GATE`、M2の13
Privacy / Analytics / Funnel pathsは全件 `ADOPT_WITH_MODIFICATION` と裁定した。
9 conflictsも全件裁定済みで、catalog-counts、LLM router、shop configはRecoveryを維持する。

M2はDNT/GPC/local opt-out、bounded schema、aggregate storage、provider/storage
fail-closedを保つ統合候補だが、privacy owner decisionなしには採用しない。M1は全releaseの
`approvedAt: null`を含むfail-closed sourceであり、Payment Linkの存在はpayment、delivery、
customer useの証拠ではない。M1/D1/D2はR7-C2を有効化せず、`history != entitlement` と
`PAID_CONTINUATION_NOT_ACTIVATED` を維持する。

このsub-Gateではapplication code変更、production source copy、merge、RC assembly、deploy、
push、provider/payment/data operation、secret access、migrationをいずれも行っていない。
exact decisions、adoption units、dependency graph、env-name dependencies、migration
requirements、owner choicesは `ops/recovery/rc-assembly-plan-20260921.json`、human reviewは
`docs/AI/RC_ASSEMBLY_REVIEW.md` をcanonicalとする。次の最小Gateはownerが選ぶA1-A3
Privacy adoption、D1/D2 Digital Product Gate、又はRecovery-only RC assemblyのいずれかであり、
このreview自身はRCをassembledとは記録しない。

### RECOVERY-ONLY-RC（2026-09-22 CEST）

`RECOVERY_ONLY_RC = ASSEMBLED_LOCAL_CANDIDATE`。Owner Decisions は
`OD1 = KEEP_RECOVERY_FOR_THIS_RC`、`OD2 = KEEP_DIGITAL_SHOP_DEFERRED`、
`OD3 = KEEP_CURRENT_LLM_ROUTER` として確定した。従って `RC_PATH = RECOVERY_ONLY`。
Recovery application tree を `a918b05` で freeze し、application source変更は `0` である。

base HEADのdeploy-inputは校正済みの offline Vercel CLI 59.23.2 collectorで記録した。
Next.js、3,205 entries、214,340,721 bytes、46 ignored entries、SHA-256
`75db759db2d18348a53e56c90f0222f638ab675f88d3001875d12db7996ad260` である。これは
deploy-input inventoryであり、production env/data/provider/payment/customer stateの証明ではない。

A1-A3 Privacy / Analytics / Funnel、D1-D2 Digital Commerce / Delivery、LLM provider policy
redesignは post-RC enhancementとして保全し、今回採用しない。R7-C2は
`BLOCKED_PRODUCT_CONTRACT / PAID_CONTINUATION_NOT_ACTIVATED`、Oracleは
`ORACLE_INACTIVE_BY_DESIGN`、R2 HOLD、R3 preserved、R5 separate scopeを維持する。
Catalog runtime 514、Exhibition 514 / missing 0、active Chat v3、`history != entitlement`も維持する。

local build statusは既知の `BLOCKED_BY_FONT_DNS` をcarry forwardし、production parityは
`PARTIAL / RC_SOURCE_PROVENANCE_INCOMPLETE`（runtime/configuration/data等はUNVERIFIED）のまま。
deploy、push、production source copy、provider/payment/data operationは `0`。
次Gateは **Preview / RC Validation**（not started、別scope/Human Gate必須）である。

### RECOVERY-ONLY-RC-VALIDATION（2026-09-22 CEST）

`RECOVERY_ONLY_RC_VALIDATION = LOCAL_VALIDATION_PASS_PREVIEW_GATE_REQUIRED`。
governance HEAD `a5a374d` と application base `a918b05` の間にruntime/application
driftはなく、RC governance recordの4ファイルだけが追加・更新された。
`APPLICATION_DRIFT = 0`、owner decisionsと `RC_PATH = RECOVERY_ONLY` は不変である。

Root typecheck、targeted lint、`git diff --check`、current Recovery validators、R7-A/B/C1/C2/D1/D2、
R1 webhook validatorはPASS。base-state-only RC validatorはそのrequired base stateのPASSを
governance-only deltaで継続確認した。Catalog 514、Exhibition 514/missing 0、Chat v3、R7-C2
blocked、Oracle inactive、secondary surfacesとR1 boundaryを維持する。

local buildはCinzel/EB Garamond/Inter/Noto Serif JPの `fonts.googleapis.com` DNSだけで
`BLOCKED_BY_FONT_DNS`。application failureではなく、修正は行わない。offline deploy-inputは
3,208 entries、SHA-256 `27027cd4fa82597b2d8b4d87b79a26b5a26f2c207b87df7aff8cddae6f0994ee`。
旧manifestとの差は `NON_RUNTIME_GOVERNANCE_MANIFEST_DRIFT` でありapplication driftではない。

Preview deploymentは作成していない。production domain/env/alias、provider/payment/data、deploy、pushは
すべて未変更。次Gateは **Preview-only smoke / Human Gate** であり、Preview作成・promotion・payment
実行を含めない。詳細は `docs/AI/RECOVERY_ONLY_RC_VALIDATION.md` と
`ops/recovery/recovery-only-rc-validation-20260922.json` を参照する。
+
### RECOVERY-ONLY-RC-PREVIEW（2026-09-22 CEST）

`RC_PREVIEW_VALIDATION = PASS_READY_FOR_CLEANUP`。明示承認された2回目の
Preview deployment `dpl_9eB9h2AgwwyUZ5k7nmLEBkfZNKaT` を既存
`hakusyakus-projects/musiam-front` linkageだけで1回作成し、READYを確認した。
Next.js 15.5.12 / Node 22.x、build durationは2m 51s。開始HEADと検証HEADは
`cad8c6c473612d12286868e541e4624545d1250b`、`.env.local` はdeploy前後とも
不在で値の読取りは0である。

Preview-only GET/HEAD smoke は `/`, `/chat`, `/exhibition`, `/letters`, Letter
detail, `/classic`, stable work detail がいずれも200/redirect 0/fatalなし。
`/exhibition` は最終path `/exhibition` で直接renderし、legacy
`/exhibition -> /works` redirectは再発しなかった。GET-only
`/api/exhibition` は514 items / 514 unique stable IDs、local canonical
projectionは displayed 514 / missing released 0 を維持した。Oracle/Omikujiの
`/` へのredirectは設計どおり維持される。

Chat provider、payment、data write、forced playback はすべて0。今回のPreview
と検証時間帯に限定したerror/fatal/500 log query は該当logなし。
Production `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX` と
`www.hakusyaku.xyz` はread-onlyでbefore/after一致、Previewにproduction aliasはなく
`PRODUCTION_MUTATION = 0`。application files changed during validation = 0。

Cleanupは開始しない。次Gateは `SEPARATELY_AUTHORIZED_CLEANUP` であり、この
Preview PASSはproduction parity、公開、payment/provider/customer-dataの正しさ、
またはGit commitを承認しない。

### EXHIBITION-ROUTING-FIX（2026-09-22 CEST）

`EXHIBITION-ROUTING-FIX = PREVIEW_VALIDATED_COMPLETE`。legacy
`/exhibition -> /works` redirect は削除済みで、route authority は
`src/pages/exhibition.tsx` に復元されている。Preview再検証では
`/exhibition` が200/redirect 0、GET-only `/api/exhibition` が514 itemsを返した。
`PRODUCTION_MUTATION = 0` を維持する。

### CLEANUP-AUDIT（2026-09-22 CEST）

`CLEANUP_AUDIT = AUDITED_PARTIAL_READY_FOR_C1_HUMAN_GATE`。Canonical cleanup State Lock は
`9b0f265b764eec4373842ae1676cbe734286784f` / clean で通過した。R0 completion と
R0 history preservation は現存し、R2 HOLD、R3 preserved experiment、R4
source-scoped evidence、R5 separate business scope はすべて `EVIDENCE_HOLD` のまま
である。SAFE candidate は canonical/original の `node_modules`、`.next`、canonical
TypeScript cache のみ（77,707 files / 2,293,411,840 bytes）で、削除は0件である。

一方で、production provenance/diff records が参照する exact source tree と三つの
manifest は既知 `/private/tmp` path に現存しなかった。これは deletion の証拠でも
zero-size reclaimable でもなく `UNKNOWN_REFERENCE_ONLY` であり、代替取得・provider操作・archive作成は
行っていない。production provenance report、normalized manifest hash、3150/3150 identity result、
production-vs-Recovery diff manifest は現存Recovery evidenceとして保持する。したがって original dirty repo は
`NOT_READY`。次Gateは **C1 SAFE_TO_DELETE Cleanup** のHuman Gateであり、今回C1は開始していない。
Historical fixed-HEAD RC validatorsは `NOT_APPLICABLE_TO_CURRENT_GOVERNANCE_HEAD` として扱う。
Cleanup、Final Integration、R7-D1、R7-Aの各validator、root typecheck、targeted lint、diff checkを通過し、
`src/**`、`public/**`、runtime/config/package/lockfileのapplication changesは0である。
削除・移動・archive作成などのdestructive operationは0件。
詳細は `docs/AI/CLEANUP_AUDIT.md` と
`ops/recovery/cleanup-audit-20260922.json` をcanonicalとする。

### CLEANUP-C1（2026-09-22 CEST）

`CLEANUP-C1 = C1_REGENERABLE_CACHE_CLEANUP_COMPLETE`。Human Gate
`APPROVE_C1_SAFE_TO_DELETE_CLEANUP`を受領し、Cleanup Auditで確定した7 exact paths
(77,707 regular files)だけを削除した。canonicalとoriginal dirty repoのtracked、staged、
untracked状態は実行前後で不変。保護されたsource、R0/R2/R3/R4/R5、ARCHIVE、
EVIDENCE_HOLD、UNKNOWN、production provenanceは変更していない。

`DEPENDENCY_RESTORE_REQUIRED_BEFORE_APP_DEVELOPMENT = true`を維持する。
canonical `node_modules`削除後のapplication validatorsは依存関係を再導入せず、
`POST_DELETE_APP_VALIDATORS = NOT_RUN_DEPENDENCIES_REMOVED_BY_AUTHORIZED_C1`として記録した。
execution evidenceは`docs/AI/CLEANUP_C1_EXECUTION.md`と
`ops/recovery/cleanup-c1-20260922.json`を参照する。Git commitは別Gateであり未承認。

### CLEANUP-C2（2026-09-23 CEST）

`C2_ARCHIVE = VERIFIED_ARCHIVES_CREATED_SOURCE_REMOVAL_NOT_AUTHORIZED`。Cleanup Auditの4
`ARCHIVE` source group / 3,054 filesを指定archive rootへ複製した。展開後のsize/SHA-256は
3,054/3,054一致し、NFC pathsも3,054/3,054一致。source/extracted normalization collisionsは0、
mappingはone-to-one。raw exact pathsは2,954/3,054で、tar member listingは
`NORMALIZED_EQUIVALENT`。source raw path spellingをsidecarに保存し、そのSHA-256を記録した。

全sourceは再manifestで不変、original sourcesは現存し、元dirty repoのGit状態は102 modified /
0 staged / 433 untrackedのまま。collisions・one-to-one・content identity検証後に`.verify`を削除した。
application changes/provider/deploy/pushは0。C2記録とvalidatorを更新し、条件を満たした場合は
指定の4 recordsだけをlocal commitする。次Gateは`C2_SOURCE_REMOVAL_HUMAN_GATE`。
source removalは許可されていない。

### CLEANUP-C2 SOURCE REMOVAL FINALIZATION（2026-09-23 CEST）

`C2_SOURCE_REMOVAL = PARTIAL_COMPLETE_TRACKED_SOURCES_RETAINED`。
初回削除で誤って発生したcanonical `アウトプット`内のtracked deletion 1,126件は、
Gitが返したNUL区切りpath listだけをHEADからrestoreし、`CANONICAL_INTEGRITY = RESTORED`。
canonical sourceは1,126 files、468,794,580 bytes、C2 source manifest SHA-256一致、
content/NFC path 1,126/1,126、normalization collision 0。canonical HEADとworking treeは
復旧済みでclean。

Final retained roots: canonical `アウトプット`とdirty `アウトプット`はtracked sourceとして保持、
dirty `outputs`はuntracked baseline 433維持のため保持。唯一のremoved rootはdirty `_archive`
(791 files)。最終actual reclaimはdirty repository allocation差分111,738,880 bytes。
4 archivesとraw path manifestのhashは維持。dirty repoはHEAD/branch不変、102 modified / 0 staged /
433 untracked。R0-R5、EVIDENCE_HOLD、UNKNOWN、application/runtime、provider、deploy、pushに変更なし。
C3は未開始、`C2_FURTHER_SOURCE_DELETION = NOT_REQUIRED`。

Incident evidence、validator、final recordを含む指定4記録ファイルだけを更新し、local commitで閉じる。
次GateはC4 dirty repository decommission。詳細は`docs/AI/CLEANUP_C2_SOURCE_REMOVAL.md`と
`ops/recovery/cleanup-c2-source-removal-20260923.json`を参照。


## C3-A UNKNOWN TRIAGE — current governance

`C3A_UNKNOWN_TRIAGE = COMPLETE_COMMITTED` at starting HEAD `4e1f8c491acfa9ffaf8fa3f7f6a40518839d071c`. UNKNOWN reconciles to 22,238 files / 3,463,835,648 allocated bytes; `.git` remains opaque, with 17,801 files derived and 3,136,348,160 allocated bytes reused from Cleanup Audit authority. Non-Git UNKNOWN is 4,437 files / 327,487,488 allocated bytes.

Sol handoff contains 300 grouped items covering 2381 files; `C4_READINESS = NOT_READY_SOL_REVIEW_REQUIRED`. Next Gate is C3-B Sol semantic review. This is the current governance order; historical C2 next-Gate text remains unchanged. C3-B/C4, deletion, archive cleanup, Original writes, provider operations, deploy, and push were not started.

## C3-B SEMANTIC REVIEW — current governance

`C3B_SEMANTIC_REVIEW = COMPLETE_COMMITTED` from starting HEAD `ce25a6f80d552f9689e7c1b2707d3bcd3d501152`. The 300 handoff groups / 2,381 unique paths split into 1,091 UNKNOWN decision targets (69 dirty deltas + 1,022 semantic-review entries) and 1,290 context-only `ops/` paths already under Cleanup Audit `EVIDENCE_HOLD`; duplicate paths and target/context overlap are 0.

Final targets: 383 `PRESERVE_REQUIRED_BEFORE_C4`, 702 `ALREADY_PRESERVED_NO_EXTRA_ACTION`, 5 `RECOVERY_SUPERSEDES_CONFIRMED`, 1 `REGENERABLE_NO_PRESERVATION_REQUIRED`, and 0 historical-only/future-product-as-decision/owner-decision. Future-product relevance is recorded separately. The verified R0 HEAD bundle suffices for 700 tracked-clean Omikuji cards and 2 tracked-clean tools. For the 383 changed or Original-only sources/assets, broad R0 preservation does not establish exact current-file sufficiency for C4. See `docs/AI/CLEANUP_C3B_SEMANTIC_REVIEW.md` and `ops/recovery/cleanup-c3b-semantic-review-20260923.json` for file-level decisions and evidence.

`C4_READINESS = NOT_READY_PRESERVATION_REQUIRED`; next Gate is **C3-C PRESERVATION EXECUTION**. C3-B did not copy, archive, delete, move, change application/runtime source, write to Original, inspect Original `.git` internals, read sensitive/private content, call providers, deploy, push, or start C4. This does not authorize C3-C execution or Original decommission in the current Gate.
