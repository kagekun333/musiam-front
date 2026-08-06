# Autonomous Sales Mission — 2026-07

状態: `READY_FOR_CUSTOMER_OUTREACH_APPROVAL`
月商ノルマ: `¥3,000,000`
基準価格: `¥330,000`
必要成約: `10件 / 月 = ¥3,300,000`

## Mission doctrine

需要調査を独立工程にしない。作品と営業先の仮説を作り、個別提案を送り、返信・商談・購入を唯一の市場シグナルとして次週の配分を変える。AIは売上に結びつかない候補整理を続けず、毎週の営業量と転換率を監査する。

## Monthly funnel floor

| Gate | Monthly floor | Weekly floor | Failure action |
|---|---:|---:|---|
| Researched accounts | 400 | 100 | 対象地域・業種を拡張 |
| Qualified accounts | 100 | 25 | ICP条件と作品用途を修正 |
| Personalized dossiers | 50 | 12–13 | 自動下書き能力を増強 |
| Purchase intent | 25 | 6–7 | offer、proof、価格、納期の障害を分類 |
| Paid orders | 10 | 2–3 | 週次で作品・segment・pitchを入替 |

この数値は保証ではなく、ノルマ達成に必要な管理下限。月中時点で累計進捗が50%未満なら、価格を安易に下げず、営業量を1.5倍にし、反応ゼロのsegmentを停止する。

## First four missions

| Priority | Work | Primary segment | Offer angle | Current blocker |
|---:|---|---|---|---|
| 1 | A Town Called Almost Home | boutique hotel / serviced residence | 旅人が「ほぼ故郷」と感じる客室・ラウンジの物語 | vendor proof / landed cost |
| 2 | Deus sive Natura | luxury residence / wellness | 神と自然を一体化する静謐な象徴作品 | vendor proof / landed cost |
| 3 | 33 IGNITION | design studio / founder office | 点火・始動・転機を空間に固定する作品 | vendor proof / landed cost |
| 4 | BALIAN | retreat / ritual hospitality | バリの儀式と浄化を持つ空間の焦点 | vendor proof / landed cost |

## Geographic deployment

1. Japan: Japanese boutique hotels, private saunas/spas, design offices, luxury residences. Metal Print Japan proof lane.
2. United States: design-led hospitality, founder offices, collectors. Prodigi ChromaLuxe candidate lane.
3. EU/UK: boutique hospitality and wellness. Gelato/Prodigi Dibond candidate lane.
4. Other countries: Gelato global candidate lane; large custom orders remain Pictorem HOLD until API contradiction resolves.

異なるsubstrateや色再現を同一Editionとして混ぜない。物理仕様が違う場合は地域別SKUとEdition IDを分ける。

## AI operating loop

1. Catalog scoreから週4作品を選ぶ。
2. 作品ごとにsegmentと地域を1つに絞る。
3. 100 accountを調査し、用途適合・予算proxy・意思決定者到達性で25件へ絞る。
4. 12–13件の個別dossierと営業文を下書きする。
5. Human Gate開放後のみ送信する。
6. 返信、proof閲覧、購入意向、checkout、成約を記録する。
7. 7日ごとに作品×segment×地域の配分を実績で更新する。

## Hard gates

- 顧客への初回外部営業送信: 明示承認待ち。
- 有料proof/sample注文、作品upload、契約署名: Human Approval必須。
- vendor回答だけで提携確定しない。品質proof、landed cost、SLA、white label、damage policy、自動注文方式が揃ってから決定。
- contribution margin 60%未満のSKUは販売開始しない。
- production deploy、決済開始、Edition final化は別Gate。

## Definition of quota-ready

次の全条件が揃った時だけ `QUOTA_READY` と判定する。

- JP / US / EUのlanded costと納期が取得済み。
- 1点POD、white label、damage/reprint条件が書面確認済み。
- 選択SKUの物理proofがHuman ACCEPT。
- contribution margin 60%以上。
- 10件分の在庫制約・Edition ledger・checkout整合性がE2E PASS。
- 100 qualified accountsと50 personalized dossiersが存在。
- 顧客営業送信Gateが開いている。

現状は `READY_FOR_CUSTOMER_OUTREACH_APPROVAL` であり、`QUOTA_READY` ではない。
