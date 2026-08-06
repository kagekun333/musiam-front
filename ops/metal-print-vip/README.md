# Metal Print VIP Sales OS

このフォルダは「月商300万円以上を、AIが価格帯と在庫制約の中で追う」ためのローカル運用基盤である。

## Source of truth

- `mission.json`: 目標、価格帯、半額枠、週次目標、外部権限
- `state.json`: 当月のEdition lock、集計済みの販売、ファネル、半額枠の消費
- `dossiers/`: 会話に合う一点だけを提示するための非公開Collector Dossier原稿
- `npm run validate:metal-print-mission`: 設計・台帳の不整合を止める
- `npm run audit:metal-print-mission`: 現在地、売上、残枠、最初のボトルネック、次の一手を出す

## 月次の状態遷移

`setup` → `ready_for_live_activation` → `live` → `sold_out` / `month_closed`

`setup` の間、AIは候補Edition、Dossier、LP、Chat文言、見込み客分類、週次分析を作る。現在は例外として、オーナー承認済みのNATURA 1 Editionのみ、proof未承認を明示した受注生産Offerを開いている。Stripe入金確認後に1点発注し、実注文ごとのvendor支払いはHuman Gateとする。proof未承認の間は、検証済み実物品質を標榜しない。

全面的な`live`移行とは別に、NATURAは`controlled made-to-order sale`として33万円の固定価格だけを開く。他のEditionと割引価格は従来どおり閉じたままとする。

## AIの毎週のループ

1. `audit:metal-print-mission` を実行する。
2. `HOLD` なら最初の未完了lockを解消する候補パックを作る。
3. `live` なら、最初に週次目標を下回ったファネル段階だけを改善する。
4. 価格障壁が明確で、半額枠が残る場合だけ `¥165,000` を使う。それ以外は `¥300,000` 以上で成約を狙う。
5. 販売は `paid` かつ非返金のみを記録する。問い合わせ、予約、決済開始は売上ではない。

## 外部連携の順序

1. Stripe webhook → `sales` の集計を自動化
2. PostHog → funnel を自動化
3. Chat → 価格提示とDossierの導線を接続
4. CRM / email → 許諾済み相手だけの連絡を接続

各接続は、外部送信・決済・在庫公開を伴うため、実装時に個別のlive activationを行う。
