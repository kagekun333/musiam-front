# Production Sales E2E Runbook

状態: `PRODUCTION_PROVIDER_CONNECTIVITY_PROVEN / SIGNED_EVENT_AND_OFFER_LOCK_PENDING`
更新日: 2026-07-21

## Selected architecture

- Checkout: Stripe Checkout Session
- Webhook: Next.js Node.js Route Handler using the unmodified raw request body
- Durable inventory: Upstash Redis through Vercel Marketplace
- Concurrency: Redis Lua scripts for atomic serial reservation and payment/refund transitions
- Product gate: server-only Offer locks; all four offers remain `approved: false`

## Required production environment variables

- `STRIPE_SECRET_KEY`
- `STRIPE_METAL_PRINT_WEBHOOK_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `METAL_PRINT_IDENTITY_SECRET`（32文字以上のランダム値。相談者HMACとcheckout署名専用）
- `NEXT_PUBLIC_SITE_URL`

Values must be stored in Vercel encrypted environment variables and never committed.

## Connection sequence

1. Provision Upstash Redis through Vercel Marketplace and connect it to `musiam-front`.
2. Pull only the generated development credentials into `.env.local`; do not print values into logs.
3. Configure a Stripe sandbox webhook destination for `/api/metal-print/webhook`.
4. Subscribe only to `checkout.session.completed`, `checkout.session.expired`, and `charge.refunded`.
5. Store its sandbox signing secret as `STRIPE_METAL_PRINT_WEBHOOK_SECRET` for Preview/Development.
6. Keep all Offer locks closed.
7. Run a sandbox-only fixture using a temporary approved test Edition, never a public Edition.
8. Verify Redis state across separate processes and duplicate webhook delivery.
9. Verify expired checkout releases the slot and refunded payment retires it.
10. `snapshot:metal-print-pipeline` と `snapshot:metal-print-revenue` を実行し、PIIなしのfresh evidenceを保存する。
11. Only after vendor proof, cost, and Human ACCEPT, approve one production Offer and create a separate live webhook destination.

## Pass evidence

- Valid Stripe signature accepted; modified body rejected.
- Invalid origin checkout rejected.
- Unapproved Offer rejected.
- Four simultaneous checkouts against one 3-unit Edition yield exactly 3 reservations and 1 sold-out response.
- Duplicate webhook changes state once.
- Process restart does not erase paid inventory.
- Refund does not make a serial resellable without explicit fulfillment review.
- Stripe test-mode payment, expiry, and refund event IDs recorded in the evidence sheet.

## Current hard stop

Vercel ProductionにはStripe secret、Webhook secret、Upstash/KV、identity secret、site URLが暗号化設定済み。2026-07-21のlive probeでStripe API、必要3イベントを購読する有効endpoint、Upstashの一時canary書込・読取・削除を確認した。未完了なのはStripeから配送された署名済みeventの受信、実Checkoutに対応するRedis永続遷移、物理proof、正式Offer lockである。公開Editionをテスト目的だけで`approved: true`にしない。
