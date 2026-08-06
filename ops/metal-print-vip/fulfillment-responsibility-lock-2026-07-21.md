# Fulfillment Responsibility Lock — 2026-07-21

## Named owner

- Accountable owner: 伯爵MUSIAM operator（Kagekun）
- Execution system: Codex-operated fulfillment workflow
- Launch vendor for Japanese Signature Square: WhiteWall self-service, one unit per order
- Domestic rectangular fallback: metal-print.jp self-service, one unit per order

## AI-executed work

1. Stripe `paid`と非返金状態の確認
2. Edition、serial、60cm角master、配送先の照合
3. vendor設定と注文内容の作成
4. 注文フォーム入力と最終支払画面までの準備
5. 注文番号、原価、納期、追跡番号のledger記録
6. 購入者への製造開始、発送、追跡、遅延通知
7. 破損写真の整理とvendor再製作申請
8. 返金、再製作、Edition台帳の同期

## Human-only gates

- 初回physical proofおよび実注文の外部支払い承認
- 到着したphysical proofのACCEPT / REVISE
- 例外的な全額返金、100cm角施工、高額な再発注の承認

## Service targets

- paid検知後4営業時間以内に注文内容を準備
- Human支払い承認後1営業時間以内にvendor注文を確定
- 追跡番号取得後1営業時間以内に購入者へ通知
- 破損報告受領後4営業時間以内に写真要件を確認しvendorへ申請

## Evidence boundary

このlockは責任者と手順を確定するが、実注文の履行実績を証明しない。初回注文後、order ID、vendor reference、追跡、配達、破損有無、実原価をfulfillment ledgerへ記録する。
