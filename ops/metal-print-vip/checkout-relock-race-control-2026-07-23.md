# Checkout Relock Race Control — 2026-07-23

Status: `PRODUCTION_DEPLOYED`

## Problem closed

Previously, `checkout.session.completed` queried the current Offer approval. If an operator safely re-locked an Edition after a Checkout Session had been created but before the customer paid, Stripe could deliver a valid paid event that the application rejected. That would leave payment, inventory, and revenue evidence inconsistent.

## Current behavior

- New Checkout creation still requires the currently approved server-side Offer.
- The Checkout Session and PaymentIntent preserve the exact Offer approval token and approval timestamp in Stripe metadata.
- A signed paid webhook validates that immutable snapshot against Edition, JPY 330,000 terms, and the Stripe Checkout creation time.
- An approval timestamp after Checkout creation is rejected.
- An invalid token is rejected.
- Re-locking an Offer stops new Checkout Sessions but does not invalidate a legitimate already-created Session.
- Amount, currency, payment status, payment-intent presence, Stripe signature, and Redis reservation rules remain mandatory.

## Evidence

- Offer approval validator: PASS, including historical Checkout surviving relock and future/invalid approval rejection.
- Production adapter validator: PASS.
- Local sales E2E: PASS.
- Typecheck: PASS.
- Production build: PASS, 1,041 pages.
- Deployment: `dpl_14CTENGXpry28Rb4TkmxVa4t4zzC`, `READY`, aliased to `https://www.hakusyaku.xyz`.

All four Offers remain closed. This change creates no Checkout Session, charge, customer record, or inventory reservation.
