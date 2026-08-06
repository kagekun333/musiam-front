# Owned Home Funnel Observability — 2026-07-24

Status: `PROVEN_LIVE / REAL TRAFFIC PENDING`

Production deployment: `dpl_24fgkzVxL8xd1fs28c6bTQK3WTes` (`READY`)

## Added first-party events

- `metal_home_view`: anonymous home-session exposure to the Collector passage.
- `metal_home_cta_click`: anonymous click on either `realm_gate` or `home_quicklink`.

Both use the existing bounded campaign dimensions and anonymous session UUID. No email, IP, conversation text, or identity is stored.

## Autonomous decision guard

- Passive home views do not start the 30-day qualified-acquisition Sprint.
- Before 1,000 home sessions, the controller returns `OWNED_TRAFFIC_LEARNING` and preserves the current CTA.
- At 1,000 or more home sessions, a click rate below 1% returns `FIX_HOME_CTA` and limits the change to one home-CTA variable.
- Downstream acquisition events continue to start the Sprint and determine qualified pace.

## Live evidence

Verification-only Redis namespace at `2026-07-23T15:09:09Z`:

- `metal_home_view`: 1, `source=home`, `content=home_page`
- `metal_home_cta_click`: 1, `source=home`, `content=realm_gate`
- Both recorded under `verification_metal_print_inbound`; production metrics were not contaminated.

Authenticated production dry-run at `2026-07-23T15:09:21Z`:

- date: `2026-07-24`
- status: `NO_TRAFFIC`
- Sprint start: `null`
- home view/click: 0/0
- qualified: 0, coverage: 0x, revenue: JPY 0
- notification not attempted in dry-run

This proves owned-funnel diagnosis, not customer demand or revenue.
