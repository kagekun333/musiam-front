# R1 — Metal Print Webhook Recovery

Recovery timestamp: 2026-09-20. Scope is limited to the Metal Print Stripe
webhook routing guard. This is a local code recovery record, not a provider
or production assertion.

## State lock and source comparison

Clean baseline: `recovery/musiam-clean-20260920` at `8058e19`. Before this
unit, `route.ts` was `a31737daccf8119b0b7adb664e4ce0d357665b11ef3d1c98ab9d368a532ecce5`;
the helper and validator did not exist.

| Source | route.ts SHA-256 | identity helper SHA-256 | validator SHA-256 | Adopted result |
| --- | --- | --- | --- | --- |
| clean baseline | `a31737daccf8119b0b7adb664e4ce0d357665b11ef3d1c98ab9d368a532ecce5` | absent | absent | base |
| old dirty main | `929d395b037a0549262bfbea0065e398e704cad9e75a767c861fd0b0049f7221` | `3f086ac0f242871619aa2a546297808c5fddf06241e875679ec72ef23a9298b4` | `e4a4b7c0c82b9e6ad6b0c07213a783dfb5cea2b888be12c33db1b41587deee47` | R1 guard, reconstructed |
| stripe-fix | `fd6836f9ed2fefbe8320020692344bd99732b34d969aaa093703e377f629a016` | `3f086ac0f242871619aa2a546297808c5fddf06241e875679ec72ef23a9298b4` | `e4a4b7c0c82b9e6ad6b0c07213a783dfb5cea2b888be12c33db1b41587deee47` | R1 guard, reconstructed |
| 6df2 | `a31737daccf8119b0b7adb664e4ce0d357665b11ef3d1c98ab9d368a532ecce5` | absent | absent | baseline-equivalent |

The sole main/stripe-fix route delta was the `getMetalPrintStripe` import;
main needed it for the PaymentIntent lookup. It is adopted because that
lookup is required to classify a refund before it reaches Metal Print refund
processing. No other route hunk was adopted.

## Contract adjudication

The current Checkout creator writes `product=vip-metal-print`, `editionId`,
and `orderId` to both Checkout Session metadata and PaymentIntent metadata.
The identity helper therefore accepts Metal Print events only when all three
values are non-empty. Missing identity fails closed.

The current verification route and production-adapter validator still use
`vip-metal-print-verification`. Its expired Checkout route remains eligible
only with `verification=true`, a valid `verificationRunId`, `editionId`, and
`orderId`; it is never accepted as a paid Metal Print Checkout. The existing
record-only verification path is retained.

For `charge.refunded`, the route first retrieves the PaymentIntent and checks
the same three-value identity before calling the existing refund operation.
An unrelated refund is acknowledged as ignored. Lookup exceptions remain in
the outer processing failure path and return retryable HTTP 500; they are not
converted to ignored acknowledgements.

## Recovered changes

- Added the identity/routing helper and a local validator.
- Added only the route imports, signed-event checkout routing gate, and
  PaymentIntent metadata classification required for R1.
- Preserved the baseline payment, Redis, offer, price, inventory, approval,
  email, and verification-record operations without altering their logic.

## Validation and limits

The local validator passed with no network or Stripe API calls. It checks the
metadata contract, completed/expired routing, verification isolation, refund
identity guard, raw-body signature construction, rejection of tampered signed
payloads, invalid-signature HTTP 400, signed unrelated Checkout HTTP 200
ignore responses, and that valid Metal Print identity reaches the existing
processing branch rather than the ignore response. `pnpm typecheck` passed.
`git diff --check` passed before commit preparation.

`PRODUCTION_PARITY=UNVERIFIED`. No live Stripe event, Checkout, refund,
Redis write, vendor action, deployment, or push is part of R1.
