# Campaign Execution Control — 2026-07-23

Status: `READY / EXTERNAL_POST_APPROVAL_REQUIRED`

## What is now controlled

- All 60 planned placements have a unique execution-ledger row.
- `APPROVED` and `PUBLISHED` require the exact row token `APPROVE_EXTERNAL_POST:<asset_id>:<channel>`.
- `PUBLISHED` additionally requires a parseable publication time and an actual public post URL.
- Spend must be nonnegative and remains separate per placement.
- The audit calculates CAC only when recorded spend can be divided by a nonzero durable qualified-consultation count. Zero qualified consultations produce `null`, never a misleading CAC of zero.
- The controlling CAC ceiling remains JPY 24,728, based on the lowest JP/US/EU headroom at the 60% contribution-margin floor.

## Current measured state

- Planned placements: 60
- Approved: 0
- Published: 0
- Recorded spend: JPY 0
- Durable qualified consultations: 0
- Measured CAC: unavailable
- Funnel and pipeline evidence freshness: PASS at audit time

## Recommended first wave (updated 2026-07-25)

Publish only `NATURA-01` through the four currently operated channels: Instagram, Threads, TikTok `@countabi`, and YouTube. X is suspended; Pinterest and LinkedIn are not part of the active account set. `Deus sive Natura` is the only currently approved public Offer; the other works remain consultation previews and are excluded from this first sales wave. Use `natura-first-wave-release.json` as the canonical copy, visual, tracking URL and truth-boundary packet.

This is 4 separately attributed placements with JPY 0 authorized spend. Approval of one row does not approve another row, any paid spend, or claims of verified physical-proof quality.

## Required approval form

For the complete recommended wave, the approval artifact must list these 5 exact tokens:

```text
APPROVE_EXTERNAL_POST:NATURA-01:instagram
APPROVE_EXTERNAL_POST:NATURA-01:youtube
APPROVE_EXTERNAL_POST:NATURA-01:threads
APPROVE_EXTERNAL_POST:NATURA-01:tiktok
```

This approval authorizes publication only. It does not authorize ad spend, changing account settings, or making proof-quality claims.
