# 月商300万円 Goal — Completion Evidence Matrix

更新日: 2026-07-26
総合判定: `INCOMPLETE / HOLD`

| Requirement | 完了証拠 | 現在のEvidence | 判定 |
|---|---|---|---|
| 商品proof | vendor仕様と人間承認済み実物 | 4原画preflight PASS。Deus sive Natura入稿TIFFはSHA-256・3000px角・RGB・alphaなしを再確認。2026-07-23のWhiteWall実画面は未ログイン・表示カート0点だったため旧motif/cartを履歴へ降格し、60cm角を再構成する機械検証済みorder packetへ固定。ログイン・再見積・支払・到着後Human ACCEPT待ち | MASTER_AND_ORDER_PACKET_READY_CART_REBUILD_REQUIRED |
| 採算stress test | JP/US/EUの現行見積、税・手数料・FX・再製造reserve、CAC上限による60%以上の限界利益 | WhiteWall実カート3/3地域＋CAC 20,000円hard capでJP 71.23%、US 64.09%、EU 61.43% | LAUNCH_STRESS_TEST_PASS |
| 実測採算 | 実注文のvendor invoice、Stripe settlement、実測CAC、replacement実績 | paid fulfilled 0/1、Stripe settlement 0/1、matured paid CAC cohort 0/3、fulfilled replacement cohort 0/10。CAC 20,000円は制御上限であり実測値ではない | OBSERVED_ACTUALS_MISSING |
| 需要 | 同意済み相談の予算・設置場所・90日以内・決裁権によるqualified記録 | 本番Redis再集計でdurable記録0件。日本語・英語各4 Edition、JP/EN hreflang、schema、sitemapに加え、既存ホームの入領ゲートと近道を別contentで匿名計測する所有メディア導線を本番`dpl_7KrfZvHDqs9ZCQtbTRa6JWD2tqK6`へ公開 | GLOBAL_OWNED_ACQUISITION_LIVE_PIPELINE_MISSING |
| 安全pipeline | 実測前は10%成約率で100 qualified。成熟30件以降は95% Wilson下限から必要数を自動再計算 | 0 / 100 qualified。日本語60＋英語60の計120配置、24画像、行単位承認・公開URL・実費台帳を整備。匿名ファネルと相談pipelineをJP/EN・source・content別にRedis集計。日次controllerは100 Dossier＋3 qualified未満を増幅せず、明確な失敗母数だけを停止候補化。本番`dpl_ADbYFA2SGbCxbyhKmWiFZV7DSjbv`のdry-runは配置0、増幅候補なし。qualified 0件時はCACを0円と誤判定しない | GLOBAL_DISTRIBUTION_READY_LIVE_PIPELINE_MISSING |
| POD供給 | 12点capacity、SLA、破損再製造 | WhiteWall一品注文、JP約12日・US約9日・DE約7日、公式damage/satisfaction policy、公開POD capacity floor 12点 | PROVEN_PLATFORM |
| 販売可能Offer容量 | 10点以上かつ300万円以上のHuman承認済みOffer | NATURAのみ3点承認済み。最大売上99万円。IGNITION / HOME / BALIANは原本mount、hash lock、digital preflight、作品別Human approval待ち | 3/10 UNITS / MAX 990,000 YEN / BLOCKING |
| Checkout | Stripe provider E2E | live Stripe API到達、qualified相談token→承認済みOffer→Checkout UIを本番接続。Edition・33万円Human token・承認日時をruntime必須化。同一Edition proof・見積・供給条件をdeploy前照合。新規Checkout後の再ロックでも既存正当Sessionを履行するsnapshot検証を本番`dpl_14CTENGXpry28Rb4TkmxVa4t4zzC`へ反映。現在4件すべて未承認 | CONNECTED_UI_READY_LOCKED |
| Webhook | 署名検証・再送・順序逆転 | 2026-07-23にlive APIを再確認。有効endpoint 1件と必要3 event購読、SDK署名contract PASS。Stripe実配送eventは未受信 | CONNECTED_EVENT_PENDING |
| Inventory | 3点上限、idempotency、atomic永続化 | Upstash Lua adapter PASS。本番Redis canary PASS。Checkout 30分に対して支払確定予約を72時間保護し、event IDとPaymentIntent IDで冪等化。本番`dpl_9c4u3AJkrFxhGtnUYs528fF1HXcx`。実Checkout遷移は未実施 | CONNECTED_ORDER_PENDING |
| Refund | 未発送開放、発送後serial退役、売上控除 | 部分返金は売上のみ控除、未発送全額返金は再開放、発送後全額返金は永久退役をRedis Luaで原子的に実装。本番`dpl_EG1xx9McwyKH4FFea2vYp2mAR8oj`。Stripe実返金eventは未受信 | CONNECTED_EVENT_PENDING |
| Fulfillment | 責任者、検品、梱包、追跡、納品 | 伯爵MUSIAM operatorをaccountable ownerとしてlock。認証付き履行API、PaymentIntent照合、履行時刻、任意tracking SHA-256を永続化。未認証本番401。実納品は未実施 | OWNER_AND_SYSTEM_PROVEN_EXECUTION_PENDING |
| 安全な表示 | proof前、非販売、例外価格非公開 | local build・validators・本番HTTP PASS | PROVEN_LIVE |
| 月商実績 | 決済済み非返金3,000,000円 | 2026-07-23 22:43 JST本番Stripe台帳再集計で0円 | MISSING |

## 断言ルール

- `STRONG_GO`: 実績以外のrequired evidenceがすべてPASSし、10倍pipelineが確認済み。
- `TARGET_PROVEN`: 決済済み非返金売上3,000,000円以上が台帳とStripeで一致。
- `余裕で達成できる`: STRONG_GOに加え、保守的な成約率下限でも必要10件を上回るpipelineがある場合だけ使用候補とする。

現状はどの表現も使用不可。計測停止と日次判断の人手依存まで解消済み。本番deployment `dpl_F3EK3hxx5F4udLMtNLPbf24jN8MS` で毎朝09:00 JSTのCronを登録し、Bearer拒否401、認証dry-run `NO_TRAFFIC`、Sprint未開始・期待値0を確認。deployment `dpl_9hmLfjQ39uc5oEhpbMaJVRbg6nNx` では相談通知結果をRedisへ期限付き保存し、欠落・失敗を日次controllerの`FIX_ALERTING`へ昇格する監視を本番反映。deployment `dpl_nfgzyk2NKgHqaFiFMfm4KkgTAEaC` で対象4作品→作品別Dossier、`dpl_9jE8bhpS1AoUw61dK2kgVPzEs92j` で作品一覧→伯爵Chat、`dpl_ByGDBfxELBcknqJcMsW5NYLcdZFV` で法人LP、`dpl_CVyqGus6hZd6EPwryiuxDYuRou2w` で交易所を現行33万円Offer→伯爵Chatへ統一し、公開HTMLを確認。2026-07-23 21:55 JST時点の本番30日ファネルは全event 0、qualified 0/100。60本の外部投稿は公開操作Human Gate。次の決定的証拠は、WhiteWallログイン後の実物proof発注、Stripeから配送される署名event、実Checkoutに対応するRedis遷移、同意済み相談から生じるqualified pipelineである。

2026-07-26追記: POD側の12点製造能力と販売可能Offer容量を分離した。現在の正式OfferはNATURA 3点のみで最大99万円のため、月商300万円を達成できる供給状態ではない。`offer-capacity-expansion-readiness-2026-07-26.json`で残り3作品の機械検証とHuman Gateを固定し、assuranceの必須Gateへ追加した。

同日、毎日09:00 JSTの運用Cronにも同じOffer容量集計を接続した。日次healthと通知はPOD capacityではなく、時刻・token検証済みOfferの点数と最大売上を保存し、3/10点・99万円を`BLOCKING`表示する。集客判断自体は止めず、販売容量と需要獲得を並行して前進させる。
