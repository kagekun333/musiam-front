# Daily Autonomous Controller Evidence — 2026-07-21

Status: `LIVE / SPRINT_NOT_STARTED`

## Production

- Deployment: `dpl_F3EK3hxx5F4udLMtNLPbf24jN8MS`
- Cron: `/api/cron/metal-print-ops`
- Schedule: `0 0 * * *` (09:00 JST)
- Vercel CLI production listing: exactly one registered cron.
- Unauthenticated request: HTTP 401.
- Authenticated dry-run: HTTP 200, `NO_TRAFFIC`, no email sent.

## Controller behavior

- Reads 30-day anonymous first-party funnel, durable qualified consultations, and current-month non-refunded Stripe revenue.
- Chooses one action: `NO_TRAFFIC`, `FIX_LANDING`, `FIX_STARTER`, `FIX_SELECTION`, `FIX_CONSULTATION`, `BEHIND_QUALIFIED_PACE`, or `ON_PACE`.
- Locks the 30-day Sprint start date only when the first real customer event appears. Synthetic `verification_*` traffic is isolated and cannot start the Sprint.
- Current truth: `sprintStartDate=null`, `dayOfSprint=0`, expected qualified=0, actual qualified=0, coverage=0x, net revenue=¥0.
- Non-dry executions store the daily health record and email the operator through the existing Resend connection.

## Validation

- `npm run typecheck`: PASS
- `npm run validate:metal-print-daily-controller`: PASS across all seven decisions
- `npm run validate:metal-print-first-party-funnel`: PASS
- production build: PASS

## Truth boundary

This proves autonomous observation and daily decision delivery. It does not create traffic or prove demand, pipeline, conversion, CAC, proof quality, or revenue.

## Live audit — 2026-07-23

- Durable Cron records exist for both 2026-07-22 and 2026-07-23; each ran at approximately 00:15 UTC and stored `NO_TRAFFIC`.
- Current values remain qualified 0, coverage 0x, revenue ¥0, Sprint not started.
- The original Resend recipient failed with HTTP 403 because the sending domain is not verified; the provider permits test delivery only to its account-owner address.
- The delivery result is now persisted as `notification.attempted/ok/error` rather than silently ignored.
- Production `METAL_PRINT_OPS_ALERT_EMAIL` is configured and deployment `dpl_BCYjnCQDQZYydnmAwcARKFREotEQ` is READY.
- One real delivery attempt to the configured external address remains `HUMAN_EXPLICIT_APPROVAL_REQUIRED`, because the payload contains internal revenue and pipeline metrics.

## Placement-level allocation release — 2026-07-23

- Production deployment: `dpl_ADbYFA2SGbCxbyhKmWiFZV7DSjbv` (`READY`).
- The daily controller now consumes anonymous `campaign + source + content` Funnel and durable qualified-pipeline aggregates.
- A placement cannot become an allocation candidate before both 100 Dossier sessions and 3 durable qualified consultations exist.
- A placement becomes a stop candidate only after a material failure boundary: 500 Dossier sessions with zero Chat starts, or 50 Edition selections with zero consultations.
- `bestObserved` remains descriptive below the allocation threshold and cannot silently authorize scaling.
- Production authenticated dry-run at `2026-07-23T14:54:22Z`: `NO_TRAFFIC`, `observedPlacements=0`, `allocationCandidate=null`, `stopCandidates=[]`, qualified 0, revenue JPY 0; no notification sent.
- Dedicated validator, typecheck, production build, and deployment all passed.

This closes the gap between placement-level measurement and autonomous daily action. It does not authorize external publication or advertising spend and does not turn zero traffic into demand evidence.

## Owned-home diagnosis — 2026-07-24

- Production `dpl_24fgkzVxL8xd1fs28c6bTQK3WTes` adds `metal_home_view` and `metal_home_cta_click`.
- Passive home exposure does not start the 30-day sales Sprint.
- The controller preserves the CTA below 1,000 home sessions and uses `FIX_HOME_CTA` only when the observed click rate is below 1% at or above that floor.
- Production authenticated dry-run: date 2026-07-24, `NO_TRAFFIC`, Sprint null, home 0/0, qualified 0, revenue JPY 0.
