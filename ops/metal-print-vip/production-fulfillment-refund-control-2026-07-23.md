# Production Fulfillment and Refund Control — 2026-07-23

Status: `PRODUCTION_DEPLOYED / REAL_ORDER_PENDING`

## Production state alignment

The production Redis adapter now matches the already validated inventory lifecycle:

- Partial refund: subtracts revenue but does not change serial availability.
- Full refund before fulfillment: releases the serial for a future buyer.
- Full refund after fulfillment: permanently retires the serial.
- Fulfillment: atomically changes the paid serial and payment ledger to `fulfilled`.
- Duplicate fulfillment/refund events: idempotent.

## Operator boundary

`POST /api/metal-print/fulfillment` is protected by the server-side operations secret. It requires:

- a bounded fulfillment event ID;
- a Stripe PaymentIntent ID;
- a valid, non-future fulfillment timestamp;
- a mandatory 64-hex domain-separated HMAC-SHA-256 of the tracking reference and a mandatory SHA-256 of the fulfillment receipt/evidence file;
- optionally, a SHA-256 tracking-reference hash.

The tracking number itself is not stored in this evidence path. Marking an actual order fulfilled remains an order-specific external-state action and is not performed without its evidence.

## Evidence

- Production adapter: PASS.
- Sales E2E: PASS.
- Inventory lifecycle: PASS.
- Revenue/refund calculation: PASS.
- Typecheck: PASS.
- Production build: PASS, including `/api/metal-print/fulfillment`.
- Deployment: `dpl_EG1xx9McwyKH4FFea2vYp2mAR8oj`, `READY`, aliased to `https://www.hakusyaku.xyz`.
- Live unauthenticated fulfillment request: HTTP 401.

No real order, payment, refund, shipment, or inventory state was changed during verification.
