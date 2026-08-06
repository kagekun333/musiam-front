# VIP Metal Print — Launch Readiness Audit

監査日: 2026-07-18
判定: `HOLD`

## 機械検証

- TypeScript: PASS
- Next.js production build: PASS
- `/vip-metal-print`: static build対象としてPASS
- Mission validator: PASS
- Demand pipeline schema: PASS（150枠）
- Demand evidence: FAIL（実在Named 0、Contactable 0、Qualified 0）
- Assurance audit: HOLD（13 required gates未充足）
- Inventory state machine: PASS（重複event、3点上限、未発送返金、発送後serial退役）

## 公開面監査

| 項目 | 状態 | Evidence |
|---|---|---|
| proof前であること | PASS | LPに購入受付前・proof確認中と表示 |
| checkout遮断 | PASS | VIP LPにPayment Linkなし |
| 例外値引きの非公開化 | PASS | 165,000円を候補LPから除去 |
| 検索index抑止 | PASS | metadata `noindex, nofollow` |
| 真の非公開化 | FAIL | URLを知れば閲覧可能。noindexはアクセス制御ではない |
| 正式価格表示 | HOLD | 300,000円は想定価格として表示、proof後確定 |

## 販売E2E

| Gate | 状態 | 次の証拠 |
|---|---|---|
| Checkout | FAIL | 承認済みSKUとtest-mode Checkout |
| Payment webhook | FAIL | `paid`だけを記録する署名検証済みwebhook test |
| Inventory | PARTIAL | 純粋状態機械はPASS。永続DBのatomic更新と同時購入競合テストは未実装 |
| Refund | FAIL | refunded時の売上・残数・serial状態遷移テスト |
| Fulfillment | FAIL | 検品、梱包、発送、追跡、納品確認の責任者 |
| PostHog funnel | PARTIAL | イベント案はあるがVIP LPで未実装 |

## 商品・供給

| Gate | 状態 | 注記 |
|---|---|---|
| 原画・販売許可 | PASS | 4候補、各3000 × 3000px、owner confirmed |
| 8 × 8公開推奨解像度 | PASS候補 | 2480px推奨に対し3000px |
| 10 × 10公開推奨解像度 | HOLD | 3071px推奨に対し3000px。vendor承認または承認済み処理が必要 |
| proof | FAIL | 0/1 |
| 同条件vendor比較 | FAIL | 0/2回答。公開情報調査のみ |
| 12点capacity/SLA | FAIL | 書面確認なし |

## 判断

コードと安全な候補導線はbuild可能だが、販売可能性は証明されていない。現時点で「余裕で達成」と断言することは虚偽になる。

次に必要なのはコード追加ではなく、Human Approvalを得たうえでの2つの外部Evidence:

1. vendor 2社への同条件見積・proof相談
2. 許諾済み候補20件への需要インタビュー

この2つの結果を`assurance.json`へ記録し、`audit:metal-print-assurance`が`STRONG_GO`になるまで販売開始しない。
