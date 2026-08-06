# VIP Metal Capsule — 運用スコアカード

状態: `TEMPLATE / CANDIDATE`
使い方: 毎週同じ曜日に更新する。推測値ではなく、計測値または台帳で確認できた数だけを記入する。

## 月次カプセル

| Month | Capsule ID | Edition IDs | 販売枠 | 単価 | 売上目標 | Status |
|---|---|---|---:|---:|---:|---|
| YYYY-MM | VIP-METAL-YYYY-MM | A / B / C / D | 12 | ¥300,000 (公開基準 ¥330,000) | ¥3,600,000 | PREPARING |

## Edition lock audit

各行がすべて `PASS` になるまで、公開・決済・残数表示をしない。

| Edition ID | 原画権利 | 仕様固定 | 3枚連番 | 原価・粗利 | 実物証拠 | 納期・配送 | 返金・破損対応 | Payment Link | Status |
|---|---|---|---|---|---|---|---|---|---|
| VIP-METAL-YYYY-MM-A | HOLD | HOLD | HOLD | HOLD | HOLD | HOLD | HOLD | HOLD | HOLD |
| VIP-METAL-YYYY-MM-B | HOLD | HOLD | HOLD | HOLD | HOLD | HOLD | HOLD | HOLD | HOLD |
| VIP-METAL-YYYY-MM-C | HOLD | HOLD | HOLD | HOLD | HOLD | HOLD | HOLD | HOLD | HOLD |
| VIP-METAL-YYYY-MM-D | HOLD | HOLD | HOLD | HOLD | HOLD | HOLD | HOLD | HOLD | HOLD |

## Weekly funnel scorecard

| Week | Named prospects | Preview opt-in | Dossier opened | Purchase intent | Checkout started | Paid in full | Refunds | Sold-out editions | Gross paid | Primary bottleneck | Next one-variable test |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|
| W1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | ¥0 | — | — |
| W2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | ¥0 | — | — |
| W3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | ¥0 | — | — |
| W4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | ¥0 | — | — |

### 判定ルール

- `Paid in full` のみを販売数として数える。Deposit・口約束・カート離脱は売上に含めない。
- `Sold-out editions` は、対象Editionの決済済み数が正確に3で、取消・返金がない時だけ +1。
- 週次の基準: preview 15、dossier 9、purchase intent 5、paid 3。
- 最初に基準を割った段階が Primary bottleneck。後段の数値を責めず、そこだけ一変数で改善する。
- 例: Previewが不足 → 作品説明ではなく、対象顧客と先行案内の価値を見直す。Dossierが不足 → CTAと物証を見直す。Paidが不足 → 価格表記・納期・返品/破損対応・決済の不安を見直す。

## 日次安全監査

- [ ] 実残数と公開残数が一致している
- [ ] 「限定」「残り」「完売」の表記に台帳根拠がある
- [ ] レンダーと実物写真を混同していない
- [ ] AIが委任外の価格を出しておらず、半額クローズが月4件を超えていない
- [ ] 返金、破損、納期遅延、問い合わせを未処理のままにしていない

## Gate

- `HOLD`: 仕様・権利・決済・在庫のいずれかが未確定
- `READY_FOR_HUMAN_APPROVAL_VIP_METAL_CAPSULE`: 4 Editionのlock auditが全PASS
- `LIVE`: 人間承認済みで、決済・残数同期・納品責任者が確定
- `SOLD_OUT`: 各Editionが決済済み3/3、取消・返金なし
