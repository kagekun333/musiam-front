# Production Stripe E2E and Owned Acquisition — 2026-07-24

Status: `PRODUCTION_E2E_PASS / OWNED_ACQUISITION_LIVE / DEMAND_UNPROVEN`

## Production correction

- Stripe had one enabled metal-print webhook registered at `https://hakusyaku.xyz/api/metal-print/webhook`.
- The production canonical origin is `https://www.hakusyaku.xyz`.
- Stripe POST delivery did not traverse the origin redirect, so the endpoint URL was changed in place to the canonical `www` origin.
- The endpoint remained enabled and retained exactly these events:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `charge.refunded`
- The signing secret was not rotated.

## Zero-payment live E2E

Evidence: `production-sales-e2e-evidence.json`

The protected verifier created one live Checkout Session and immediately expired it. Stripe then delivered a signed `checkout.session.expired` event to production. The webhook released the temporary Edition reservation and wrote a receipt to production Redis; the verifier read that receipt back.

- PaymentIntent created: no
- Customer created: no
- charge: none
- vendor order: none
- signed Stripe webhook received: yes
- durable Redis receipt read: yes
- reservation release ran before receipt: yes

This proves Checkout creation, provider-signed webhook delivery, server processing and durable persistence. It does not prove a paid order or fulfillment.

## Economics lock

The JP, US and EU WhiteWall scenario is approved with a hard attributed-CAC cap of JPY 20,000. At that cap, modeled contribution margins are:

- JP: 71.23%
- US: 64.09%
- EU: 61.43%

New paid acquisition must stop when trailing attributed CAC exceeds JPY 20,000. These are controlled planning economics, not measured customer-acquisition performance.

## Owned acquisition release

The Letter index and every generated Letter detail page now contain an attributed route to the sale-ready `Deus sive Natura` Dossier and metal-print chat. The production build generated the Letter index plus 552 Letter paths and the live HTML contains both CTAs.

Deployment: `dpl_2sNKiiTVPBzGmEPaVmRm27RCaGN5` (`READY`, aliased to `https://www.hakusyaku.xyz`).

## Remaining evidence

- Human-approved physical proof: 0/1.
- Qualified consultations: 0/100 conservative requirement.
- Qualified pipeline: JPY 0; 4x and 10x gates both fail.
- Dossier accepted: 0/50.
- Purchase intent: 0/25.
- July non-refunded revenue: JPY 0.

No strong revenue claim is permitted until these observed gates change.
