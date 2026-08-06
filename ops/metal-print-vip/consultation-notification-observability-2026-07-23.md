# Consultation Notification Observability — 2026-07-23

Status: `PRODUCTION_DEPLOYED / LIVE_SECRET_DRY_RUN_NOT_REPEATED`

## Outcome

- A consultation notification result is now stored in Redis under `metal-print:consultation-notification:<consultationId>` until the consultation expiry.
- The ledger records `attemptedAt`, `expiresAt`, `ok`, and a bounded error string. It does not add consultation PII.
- Consultation storage remains successful even if notification delivery or notification-ledger persistence fails.
- The daily controller returns `FIX_ALERTING` as its highest-priority action when any active consultation lacks a successful notification result.
- Cron health now exposes `consultationNotificationFailures`.

## Production evidence

- Deployment: `dpl_9hmLfjQ39uc5oEhpbMaJVRbg6nNx`
- Target: production
- Ready state: `READY`
- Alias: `https://www.hakusyaku.xyz`
- Build generated 1,041 static pages and the consultation / cron serverless routes.

## Validation

- `npm run typecheck`: PASS
- `npm run validate:metal-print-consultation`: PASS
- `npm run validate:metal-print-daily-controller`: PASS
- `npm run validate:metal-print-production-adapter`: PASS
- `npm run build`: PASS

The authenticated production dry-run was not repeated in this sprint because the production secret pull was blocked by local DNS/network access. No real consultation, PII, or outbound test email was created as a substitute. The earlier authenticated cron dry-run remains the live controller baseline; this deployment adds locally verified fields and failure routing without changing the configured recipient.

## Claim boundary

This closes silent loss of consultation notification outcomes. It does not prove email delivery, qualified demand, physical proof quality, checkout completion, fulfillment, or revenue.
