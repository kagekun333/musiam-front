# Zero-traffic root-cause — 2026-07-24

Status: `EXTERNAL_DISTRIBUTION_REQUIRED`

## Authoritative production snapshot

- Evidence class: `FIRST_PARTY_REDIS_OBSERVED`
- Production funnel: all nine stages at `0` sessions
- Qualified consultations: `0`
- Qualified pipeline value: `JPY 0`
- Net non-refunded Stripe revenue: `JPY 0`
- Snapshot time: 2026-07-24 12:24–12:25 UTC

## Measurement fault isolation

The production event endpoint was tested with one synthetic anonymous session under campaign `verification_public_funnel_20260724`. All nine events returned HTTP 200 and all nine were read back from the separate Redis verification namespace:

1. `metal_home_view`
2. `metal_home_cta_click`
3. `metal_dossier_view`
4. `metal_chat_start`
5. `metal_salon_open`
6. `metal_first_message`
7. `metal_duke`
8. `metal_edition_selected`
9. `metal_consultation_submitted`

This proves event transport and Redis aggregation are operational. It does not prove customer demand or conversion. Because production remains zero while verification succeeds, the current leading constraint is absence of attributable real-user entry, not a known measurement outage.

## Next executable Gate

Publish the zero-spend `NATURA-01` first wave defined in `natura-first-wave-release.json`. This is the only current public Offer and therefore the only asset eligible for the first sales wave.

Required publication approvals:

```text
APPROVE_EXTERNAL_POST:NATURA-01:instagram
APPROVE_EXTERNAL_POST:NATURA-01:youtube
APPROVE_EXTERNAL_POST:NATURA-01:pinterest
APPROVE_EXTERNAL_POST:NATURA-01:linkedin
APPROVE_EXTERNAL_POST:NATURA-01:x
```

No paid spend, customer contact, Stripe charge, WhiteWall order, or physical-proof claim is authorized by these tokens.

## Decision boundary

Do not infer demand from the working verification funnel. Demand begins only with durable real-user consultation evidence. Do not claim monthly revenue achieved until Stripe records actual non-refunded paid revenue.
