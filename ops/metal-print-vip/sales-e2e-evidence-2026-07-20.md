# Metal Print Sales E2E Evidence

更新日: 2026-07-20
状態: `LOCAL_E2E_PASS / PRODUCTION_ADAPTER_CODE_PASS / LIVE_CONNECTION_PENDING`

## Proven locally

- 未承認Offerではcheckout予約を作らない。
- Edition lockの価格・通貨と一致しない要求を拒否する。
- checkout開始時に3点のserialを予約し、同時checkoutによるoversellを防ぐ。
- 予約期限切れで未購入serialを再び販売可能にする。
- provider webhookのevent IDを冪等処理する。
- 決済済みserialを発送済みに移す。
- 未発送返金ではserialを解放する。
- 発送後返金ではserialをretiredにし、同じ限定番号を再販しない。

## Evidence command

`npm run validate:metal-print-sales-e2e`

Result:

`PASS — offer lock, amount/currency, reservation, sold-out, webhook idempotency, fulfillment and refund`

## Not yet proven

- Stripeまたは採用providerの実Checkout Session作成。
- webhook署名検証。
- production DBへの永続化とtransaction/locking。
- provider障害時のretry / dead-letter運用。
- 実決済から返金までのtest-mode E2E。

## Production adapter code evidence

- Stripe Checkout Session作成境界を追加。
- 同一originとapproved Offer lockを必須化。
- Stripe作成失敗時のRedis予約補償を追加。
- raw request bodyとStripe署名の検証を追加。
- Checkout金額・通貨・metadataを再検証。
- Upstash Redis Luaによるserial予約・決済確定・event冪等処理を追加。
- `charge.refunded`ではserialを安全側で`refunded_retired`に固定し、自動再販しない。
- Stripe payment intent単位のRedis売上台帳を追加し、gross、部分返金、全額返金、非返金純売上を月次集計する。
- payment mapping形式を返金処理と一致させ、JSON/区切り文字不整合による本番返金失敗を修正した。
- `TARGET_PROVEN`は24時間以内の当月Redis売上snapshotで非返金純売上300万円以上の場合だけ許可する。

`npm run validate:metal-print-production-adapter` はPASS。ただし実Upstash、Stripe sandbox、Vercel環境変数が未接続なのでproduction GateはまだFAIL。

本ファイルはローカル状態機械の証拠であり、本番決済が利用可能という証明ではない。
