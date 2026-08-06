# Payment-first Made-to-order Fulfillment Policy

Status: `ACTIVE_FOR_NATURA_CONTROLLED_SALE`

## Contract

1. 顧客は伯爵Chatの相談とDossier確認後、NATURA 33万円の正式Offerへ進む。
2. Stripe Checkoutで代金と配送先を確定する。
3. `payment_status=paid`の署名済みWebhookとdurable payment ledgerを確認する。
4. その注文の仕様、配送先、WhiteWall注文画面、原価を確認する。
5. 顧客入金から製造原価を精算し、WhiteWallへ1点発注する。vendor支払い実行は注文単位のHuman Gate。
6. 顧客住所へ直送し、vendor order ID、追跡情報、発送日を履行台帳へ保存する。

## 入金後のoperator command

顧客のStripe PaymentIntentが`paid/succeeded`になった注文だけ、次のコマンドで一時発注パケットを作る。

```bash
node --import tsx scripts/prepare-metal-print-vendor-order.ts \
  --payment-intent pi_... \
  --include-shipping \
  --output /private/tmp/musiam-metal-order-<order-id>.json
```

- StripeのPaymentIntent、Checkout Session、金額、通貨、Editionを再照合する。
- 入稿TIFFのSHA-256を`proof-order-packet.json`と再照合する。
- 配送先を含むパケットは一時ディレクトリへ`0600`で新規作成し、上書きしない。
- 24時間以内に削除する。リポジトリ、Git、チャット、分析基盤へ顧客情報を保存しない。
- コマンドはWhiteWallへ接続・発注・支払いを行わない。最終vendor支払いは注文単位のHuman Gate。
7. 配達後、破損・色・取付状態を確認して`fulfilled`へ遷移する。

## Buyer disclosure

- 受注生産であり、Stripe入金後に製造を開始する。
- 実物proofは未承認である。
- 通常は製造開始から約12営業日＋配送期間を目安とする。
- 製造開始後の変更・キャンセル可否は進行状況により異なる。
- 未確認の実物品質、即納、返品自由、納期保証は標榜しない。

## Gate classification

- Sale-opening Gate: rights, master, specification, platform quote, margin, fixed Offer approval, payment/refund/fulfillment E2E, disclosure.
- Quality-claim Gate: Human-approved physical proof.
- Vendor-order Gate: paid customer order plus order-specific Human payment approval.
- Revenue Gate: durable non-refunded Stripe payment.
- Fulfillment Gate: vendor reference plus tracking/delivery evidence.

## Current scope

- Open: `VIP-METAL-2026-07-NATURA`, JPY 330,000, Edition of 3.
- Closed: IGNITION, HOME, BALIAN and every discount tier.
