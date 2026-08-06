# Qualified Consultation to Stripe Checkout Bridge

> SUPERSEDED ON 2026-07-24: NATURAは `made-to-order-sales-approval-2026-07-24.json` により33万円のcontrolled Offerが承認済み。以下はOffer Lock承認前の履歴である。

日時: 2026-07-23 JST
判定: `CONNECTED_UI_READY / OFFER_LOCK_CLOSED`

## 実装

- qualified相談で署名済みconsultation tokenを発行・保存。
- 相談APIが`getApprovedMetalPrintOffer(editionId)`からCheckout利用可否を返す。
- UIは`qualified && checkoutAvailable`の場合だけ正式Offerボタンを表示。
- ボタンはtokenとeditionIdを同一originのCheckout APIへ送信し、成功時のみStripeへ遷移。
- proof未承認時は「実物proof最終確認中」を表示し、購入ボタンを出さない。

## Safety

- Offer Lockは全Edition `approved: false`を維持。
- qualified token、Edition一致、有効期限、Offer承認をサーバーで再検証。
- 無効tokenで本番POSTした結果、HTTP 403 `qualified_consultation_required`。
- Stripe Checkout Session・在庫予約・課金は生成していない。

## Evidence

- production: `dpl_5js9U989UBRgfCskfwfbzrhmh7T2`、`READY`、独自ドメインalias済み。
- typecheck: PASS。
- production adapter: PASS。
- sales E2E state machine: PASS。
- consultation qualification/privacy contract: PASS。
- local/Vercel build: PASS、1041 pages。

残るproduction sales E2E証拠は、Human-approved physical proof後にOffer Lockを承認し、実qualified相談からStripe Session、署名webhook、Redis paid遷移、返金台帳まで実イベントで通すこと。
