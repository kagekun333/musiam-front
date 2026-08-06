# Delayed Payment Confirmation Control — 2026-07-23

Status: `PRODUCTION_DEPLOYED`

## Problem closed

Stripe Checkout and the Redis inventory reservation previously expired at the same 30-minute boundary. A valid payment or signed webhook arriving around that boundary could find no active reservation, leaving a paid customer without a confirmed serial or durable revenue record.

## Current behavior

- Customer Checkout remains open for 30 minutes.
- The reserved serial retains a 72-hour payment-confirmation grace period.
- `checkout.session.expired` still releases the serial immediately when Stripe confirms abandonment.
- Checkout creation failure still compensates by releasing the reservation.
- If provider delivery is delayed, the serial remains protected instead of becoming available for a second buyer.
- Confirmation is idempotent by both Stripe event ID and PaymentIntent ID.
- The grace deadline is preserved in Stripe metadata for reconciliation.

The conservative failure mode is temporary inventory protection, not overselling or losing a paid order. With only three serials per Edition, preserving exclusivity is preferred to early reuse.

## Evidence

- Production adapter validator: PASS.
- Local sales E2E: PASS.
- Inventory validator: PASS.
- Typecheck: PASS.
- Production build: PASS, 1,041 pages.
- Deployment: `dpl_9c4u3AJkrFxhGtnUYs528fF1HXcx`, `READY`, aliased to `https://www.hakusyaku.xyz`.

All Offers remain closed; the deployment created no Checkout Session, payment, or reservation.
