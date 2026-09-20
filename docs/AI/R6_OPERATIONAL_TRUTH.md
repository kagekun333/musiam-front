# R6 Operational Truth

Recovery timestamp: 2026-09-20.  Source: the read-only preserved dirty
repository at `/Users/kagekun/Desktop/musiam-front`.  This is a local
recovery record, not a production-parity assertion.

## Canonical Current

| Domain | Canonical source | Meaning |
| --- | --- | --- |
| Continuous operation | `ops/continuous-operation/state.json` | Current operating state; its current observation boundary is `OBSERVATION_BLOCKED_AUTH_EXPIRED`. |
| Experiments | `ops/continuous-operation/experiments.json` | Current experiment states and conclusions. |
| Publication / audience | `ops/audience-engine/daily-music-publication-queue.json` | Current derived publication disposition: stale placements are quarantined, not executable. |
| Audience account capability | `ops/audience-engine/abi-hakusyaku-account-registry.json` | Last recorded profile-link state; it is historical observation, not a live check. |
| Metal-print operating target | `ops/metal-print-vip/state.json`, `ops/metal-print-vip/all-works-sellout-goal.json`, `ops/metal-print-vip/goal-controller-state.json` | Current local target and controller state.  It does not demonstrate sales, payment, or fulfillment. |

## Canonical History

- `ops/market-learning/daily-20260920/`: latest attempted daily observation;
  authentication was unavailable, so its market and payment fields remain
  `UNKNOWN`, not zero.
- `ops/market-learning/daily-20260913/market-0730.json` and
  `stripe-0730.json`: last successful referenced observation snapshots.
- `ops/continuous-operation/revenue-observation.json` and
  `ops/musiam-funnel/{funnel-period-2026-09-09,revenue-period-2026-09-09}.json`:
  time-bounded read-only production observations, retained as history only.
- `ops/audience-engine/abi-hakusyaku-launch-wave-01-ledger.csv`,
  `abi-hakusyaku-launch-wave-01-maturity-queue.json`,
  `abi-hakusyaku-profile-link-update-evidence-2026-07-30.json`, and
  `youtube-channel-capabilities.json`: publication and capability evidence.

## QA / Synthetic

Keep QA, browser checks, sandbox Stripe observations, simulated customers,
and model evaluations outside the canonical-current chain.  They may support
development decisions but do not prove a human, order, payment, or delivery.

## Not Recovered

Candidate/draft/staging files, release media, contact sheets, generated queues
and reports with rebuild inputs, Phase 5/6 and simulation material, Music
Evidence Factory material, SHAMAN material, bulky intermediates, and private
raw dumps remain in the preserved source / Phase 1 snapshot.  They were not
deleted or modified.

## Unknown

Live visitor, external-chat, recommendation, product-interest, checkout,
payment, delivery, refund, repeat-visit, and production-parity status after
the latest authenticated observations are `UNKNOWN` unless a retained
time-bounded record explicitly says otherwise.  No new provider observation
was made during R6.

## Truth Rules

- REAL != QA
- PAYMENT != DELIVERY
- PUBLISHED ledger != public URL verified
- ZERO != UNKNOWN
- HISTORICAL != CURRENT
- LOCAL PASS != PRODUCTION PASS
- TEST Stripe != real revenue
- `PRODUCTION_PARITY = UNVERIFIED`
