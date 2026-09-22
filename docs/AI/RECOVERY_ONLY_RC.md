# 伯爵MUSIAM — Recovery-only Release Candidate

## Executive State

`RECOVERY_ONLY_RC = ASSEMBLED_LOCAL_CANDIDATE`.

This local RC freezes the Recovery application tree at
`a918b05fba988884d27efd5509e2a3eee6df1127` on
`recovery/musiam-clean-20260920`. It is an assembly record only: no application
source was changed, no production source was copied, and no deployment, push,
provider, payment, data, or Vercel operation occurred.

## RC Identity

- RC ID: `MUSIAM-RECOVERY-ONLY-RC-20260922`
- Path: `RECOVERY_ONLY`
- Base application HEAD: `a918b05`
- Application file changes: `0`
- Assembled locally: `true`
- Deployed / pushed: `false / false`

## Owner Decisions

- `OD1 = KEEP_RECOVERY_FOR_THIS_RC`: A1-A3 Privacy / Analytics / Funnel is deferred.
- `OD2 = KEEP_DIGITAL_SHOP_DEFERRED`: D1-D2 Digital Commerce / Delivery is deferred.
- `OD3 = KEEP_CURRENT_LLM_ROUTER`: the Recovery LLM router is retained without redesign.

## Included Recovery Units

R0/R1/R4/R6, R7-A, R7-B, R7-C1, R7-D1, and R7-D2 retain their existing local
Recovery authority. R2 remains `RECOVERED_PRESERVED_HOLD`; R3 remains
`RECOVERED_PRESERVED_EXPERIMENT`; R5 remains `PRESERVE_HOLD / SEPARATE_BUSINESS_SCOPE`.

R7-C2 remains `BLOCKED_PRODUCT_CONTRACT / PAID_CONTINUATION_NOT_ACTIVATED`.
The active 20-turn Chat guard is abuse/API-cost protection, not payment,
entitlement, or continuation access. `history != entitlement`.

## Excluded Enhancements

| Enhancement | This RC | Post-RC status |
| --- | --- | --- |
| E1 / A1-A3 Privacy, analytics, funnel | Not adopted | Deferred enhancement |
| E2 / D1-D2 Digital commerce, delivery | Not adopted | Separate product/business gate |
| E3 / LLM provider policy | Not redesigned | Separate architecture policy gate |

They are neither deleted nor rejected. Their earlier review records remain
preserved for a separately authorized post-RC decision.

## Catalog

`public/works/works.json` remains the primary master. Runtime projection is
514 unique stable IDs; title-only equality never establishes identity. R4
evidence remains source-scoped and does not establish semantic, rights, fit,
availability, recommendation, or sales claims.

## Chat

The active UI route remains `src/pages/chat.tsx` to
`/api/chat-experience-v3`. R7-B deterministic constraint handling and R7-C1
stable `workId` cards/history stay in place. No Chat redesign, provider-routing
change, payment change, or paid-continuation activation is included.

## Exhibition / Discovery

Exhibition retains its canonical server projection: 514 displayed works and 0
missing released works in the verified local invariant. Home/Realm, Letters,
Broadcast, Now Playing, and TodaysPick retain their Recovery behavior. Oracle
and Omikuji remain `ORACLE_INACTIVE_BY_DESIGN`.

## Commerce Boundary

Digital Commerce / Delivery D1-D2 is deferred. No canonical digital product,
price, Checkout verification, payment-to-entitlement issuance, resume, or
delivery contract is introduced. Existing Metal Print identity boundaries are
unmodified and do not authorize Chat monetization.

## Analytics Boundary

Privacy / Analytics / Funnel A1-A3 is deferred. No analytics initialization,
data collection, funnel endpoint, or reporting activation is adopted for this
RC. The previous material remains an enhancement candidate only.

## Preserved Experiments

R2 HOLD and R3's preserved Lane C candidate remain non-active. R5 remains a
separate business scope. None is copied into the application or promoted by
this RC record.

## RC Manifest

The offline Vercel CLI `59.23.2` `inspectDeploymentFiles` collector was run
against the clean base HEAD before this record was written. It recorded Next.js,
3,205 included entries, 214,340,721 bytes, 46 ignored entries, and manifest
SHA-256 `75db759db2d18348a53e56c90f0222f638ab675f88d3001875d12db7996ad260`.
The collector was previously calibrated against the preserved production
dry-run; this local collection made no provider mutation.

## Validation

This assembly reruns the Recovery-only RC validator, Assembly Review,
production diff, provenance, parity, Final Integration, root typecheck,
targeted lint, and `git diff --check`. A build is intentionally not rerun.

## Known Blockers

The carried-forward local build state is `BLOCKED_BY_FONT_DNS`: the historical
single build attempt could not resolve Google Fonts through `next/font`. This
is neither a build PASS nor a reason to change application/configuration source.
R7-C2 is separately blocked by missing product/payment/entitlement/resume
contracts.

## Next Gate

`Preview / RC Validation` is a separate, not-started gate requiring explicit
scope and Human Gates. This assembly does not begin it.

## Truth Boundary

- assembled locally != deployed
- deploy-input manifest != production environment, data, provider, payment, or customer-state proof
- stable ID != content, rights, listener-fit, availability, or sales proof
- history != entitlement
- route exists != active product or service
- local PASS != production parity
- deferred != rejected or adopted
- `PRODUCTION_PARITY = PARTIAL / RC_SOURCE_PROVENANCE_INCOMPLETE`; runtime/configuration/data parity remains unverified
