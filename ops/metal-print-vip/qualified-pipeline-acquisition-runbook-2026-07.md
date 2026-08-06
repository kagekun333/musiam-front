# Qualified Pipeline Acquisition Runbook

Status: `DISTRIBUTION_READY / EXTERNAL_POST_HUMAN_GATE`

Production asset deployment: `dpl_9EU3jXz8vKM8VAELQSPQGea5gQNY` (`READY`). All 12 public JPG URLs returned HTTP 200 on 2026-07-21.

## Required outcome

Until a mature observed conversion cohort exists, the safety target is 100 qualified consultations. At ¥330,000 each this is ¥33,000,000 pipeline, or 11x the ¥3,000,000 target. A qualified consultation requires budget ¥330,000+, purchase timing within 90 days, decision authority, an installation space, and contact consent.

## Conservative 30-day acquisition model

| Gate | Assumption | Monthly requirement | Daily pace |
|---|---:|---:|---:|
| VIP/Edition sessions | — | 70,000 | 2,334 |
| Chat opens | 12% | 8,400 | 280 |
| First messages | 45% | 3,780 | 126 |
| Duke/Edition selections | 18% | 680 | 23 |
| Qualified consultations | 15% | 102 | 3.4 |
| Paid at conservative fallback | 10% | 10 | — |

These are operating thresholds, not observed performance or a guarantee. Organic traffic alone must not be presumed capable of 70,000 monthly landing sessions.

## Distribution assets

- 12 reviewed copy concepts across four Editions.
- 12 deterministic 1080×1350 visual cards in `public/metal-print-campaign/`.
- 60 unique placements across Instagram, YouTube, Pinterest, LinkedIn, and X.
- Every placement has a unique source/content URL in `campaign-distribution-plan-2026-07.csv`.
- Every placement has a restart-safe approval/publication/spend row in `campaign-execution-ledger-2026-07.csv`.
- Posting remains a Human Approval Gate because it publishes externally.

## Cadence

- Publish three distinct assets per week; distribute each through the five channel-specific rows.
- Do not reuse one channel URL on another channel.
- Keep the public claim at Collector Preview until physical proof is accepted.
- Refresh the PostHog funnel and durable consultation snapshot daily once distribution begins.

## Evidence-triggered control rules

1. At 2,000 landing sessions, if Chat open rate is below 12%, change only the landing hook/CTA before adding traffic.
2. At 500 Chat opens, if first-message rate is below 45%, change only the starter and immediate framing.
3. At 200 first messages, if Duke/Edition selection is below 18%, change only the diagnosis/selection step.
4. At 100 Edition selections, if qualified consultation rate is below 15%, change objection handling and form framing; do not weaken qualification.
5. Do not replace the 10% paid fallback until at least 30 qualified consultations have matured; then use the 95% Wilson lower bound already implemented by the pipeline calculator.
6. Pause paid traffic if measured CAC exceeds the controlling EU ceiling of ¥24,728 or if approved contribution margin falls below 60%.
7. Never interpret zero spend divided by zero qualified consultations as zero CAC; CAC remains unavailable until a durable qualified consultation exists.

## Truth boundary

Asset readiness proves the ability to launch a measured acquisition sprint. It does not prove reach, demand, conversion, CAC, pipeline, or revenue. Those gates change only through observed PostHog events, durable consented consultations, and Stripe payment evidence.
