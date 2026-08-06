# Proof-to-Offer Unlock Control — 2026-07-23

Status: `LOCKED / READY_FOR_PHYSICAL_PROOF`

## Runtime lock

An Edition can reach Stripe Checkout only when its server-side Offer contains all of the following:

- `approved: true`;
- the exact Edition and JPY 330,000 token `APPROVE_METAL_PRINT_OFFER:<editionId>:330000`;
- a valid approval timestamp that is not in the future.

Changing only the boolean no longer unlocks Checkout. Both Checkout creation and paid-webhook processing use the same server-side Offer gate.

## Pre-deploy evidence validator

For every approved Offer, validation additionally requires:

- a physical proof for the same Edition in `proof-evidence-ledger.json`;
- `humanDecision: ACCEPT` and the existing eight-axis/hard-fail proof rules;
- the current JPY 330,000 JP/US/EU quote scenario;
- a non-expired quote;
- nonnegative CAC headroom at the 60% contribution-margin floor in every region;
- confirmed 12-unit capacity, replacement policy, and delivery SLA.

The quote scenario may remain an evidence candidate before measured CAC exists. This permits a controlled first sale without pretending that mature CAC has already been observed. The global assurance gate remains `HOLD` until measured CAC and the other STRONG_GO evidence exist.

## Human sequence after proof arrival

1. Record order reference, source SHA-256, production process, and at least three receipt-photo references.
2. Score all eight dimensions and record hard failures.
3. Human chooses `ACCEPT`, `REVISE`, or `REJECT`.
4. Only `ACCEPT` with score at least 64/80 and no hard failures can support an Offer.
5. Human separately supplies the exact Offer token for one Edition.
6. Run proof, Offer, production-adapter, sales-E2E, type, and build validation.
7. Deploy one Edition approval and perform one real qualified Checkout before approving any other Edition.

Current state: 0 accepted physical proofs and 0 approved Offers. All four Offers remain safely closed.

Production deployment: `dpl_DhpvsbaSXvUDURGmnQe5x1pxeSeB` (`READY`, aliased to `https://www.hakusyaku.xyz`). Local sales E2E, production adapter, Offer approval, proof evidence, typecheck, and the 1,041-page production build all passed before deployment.
