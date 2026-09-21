# 伯爵MUSIAM — Release Candidate Assembly Review

## Executive Decision

`RC_ASSEMBLY_REVIEW = READY_WITH_OWNER_DECISIONS`.

Recovery at `86356c80c84efb7f1650465f8b1ea35c6d064e86` remains the RC base. This is
an assembly specification only: application changes, source copy, merge, RC
assembly, deploy, push, provider/payment/data operations, and secret access are
all zero. The exact production input remains evidence, not a wholesale source.

Technical decisions are complete. Three owner decisions remain: whether to add
the privacy/analytics stack, whether to open a separately governed digital-shop
product gate, and the provider-routing policy. Consequently `assemblyReady=false`.

## RC Base

Production source is the preserved input for deployment
`dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX`, manifest authority
`1a4ee637d55be29b4f7307daa10e9d9fc0ac7b36348337300ed34aa0c126af0b`.
The fixed Recovery base is the current starting HEAD above, on
`recovery/musiam-clean-20260920`.

R7-A stable-ID catalog projection, R7-B Chat v3 core, R7-C1 UI/history wiring,
R7-C2 blocked continuation, R1 webhook identity, R7-D1/D2, and inactive Oracle
remain Recovery-authoritative. In particular, `history != entitlement` and
`PAID_CONTINUATION_NOT_ACTIVATED`.

## M1 Decision

All 13 M1 Digital Commerce / Delivery paths are
`DEFER_SEPARATE_PRODUCT_GATE` (adopt 0, modify 0, defer 13, reject 0). The
source contains product definitions, checkout/order/download routes, a release
model, a legacy hosted Payment Link map, and a fail-closed approval gate. It does
not establish that any digital product is active, that a payment occurred, that a
delivery completed, or that a customer used it.

Every production release has `approvedAt: null`; therefore the newer flow is
fail-closed. Legacy hosted checkout links are preserved evidence only. They are
not customer-payment, product-availability, fulfillment, or Chat-continuation
authority. M1 must never activate Chat paid continuation.

## M2 Decision

All 13 M2 Privacy / Analytics / Funnel paths are `ADOPT_WITH_MODIFICATION`
(adopt 0, modify 13, defer 0, reject 0), conditional on the owner choosing the
privacy stack. Source semantics include DNT, GPC and local opt-out handling,
bounded anonymous event fields, same-site event posting, retention/capacity
bounds, and fail-closed provider/storage behavior. Integration must replace raw
PostHog mounting rather than duplicate it across App and Pages routers.

The source shows analytics code, a browser initializer, and storage/report code.
It does not prove a configured provider, a healthy provider, stored events, or
analytics receipt. Privacy notice text must match the final collection and
retention behavior before adoption.

## Conflict Decisions

| Conflict | RC decision | Basis |
|---|---|---|
| `src/app/layout.tsx` | `KEEP_RECOVERY` | Retains privacy discoverability; production's fixed 350 copy is historical. |
| `src/app/shop/BuyButton.tsx` | `KEEP_RECOVERY` | Retains checkout hold until M1 product gate. |
| `src/app/shop/page.tsx` | `KEEP_RECOVERY` | Avoids unsupported exclusivity and sales-allocation claims. |
| `src/components/AnalyticsInit.tsx` | `ADOPT_WITH_MODIFICATION` | Replace raw initializer only with M2 consent-aware shared mount. |
| `src/lib/catalog-counts.ts` | `KEEP_RECOVERY` | Canonical R7-A derivation/UNKNOWN remains; fixed production fallback is rejected. |
| `src/lib/llm-router.ts` | `KEEP_RECOVERY` | Recovery retains the safe header and current routing policy; no provider health is inferred. |
| `src/lib/metrics.ts` | `ADOPT_WITH_MODIFICATION` | Route events only through M2 privacy boundaries. |
| `src/lib/shop-config.ts` | `KEEP_RECOVERY` | Keeps holds and avoids unsupported delivery/license/availability promises. |
| `src/pages/_app.tsx` | `ADOPT_WITH_MODIFICATION` | Use a shared M2 bridge; eliminate double initialization. |

## Adopt in RC

None unconditionally. Privacy/analytics can be adopted only as the explicit,
integrated A1-A3 units after owner decision OD1. No production byte is selected
for a whole-file copy.

## Adopt with Modification

M2's 13 paths plus `AnalyticsInit.tsx`, `metrics.ts`, and `_app.tsx`. Required
modifications are integration-specific: preserve DNT/GPC/local opt-out; do not
collect identity or conversation text; avoid duplicate router mounts; retain
failure as non-blocking; and make reports unavailable without authorization.

## Keep Recovery

`layout.tsx`, `BuyButton.tsx`, `shop/page.tsx`, `catalog-counts.ts`,
`llm-router.ts`, and `shop-config.ts`. This preserves current recovery truth:
canonical catalog counts, fail-closed shop guidance, accurate copy, and the
current Chat/provider contract.

## Deferred

M1's checkout, order, download, product, release, delivery, CSS, receipt, and
same-site request paths are D1/D2. This is a separate business/product gate, not
a condition for RC assembly. It requires canonical products and terms, verified
payment metadata, a sandbox payment-to-delivery audit, storage assessment, and
explicit fulfillment acceptance.

## Rejected Production Paths

Production versions of `catalog-counts.ts`, `llm-router.ts`, and `shop-config.ts`
are rejected: historical fixed catalog fallback, an unverified provider policy,
and unverified shop promises are incompatible with Recovery invariants.

## Adoption Units

| Unit | Status | Purpose |
|---|---|---|
| A1 | Conditional owner gate | Consent-safe analytics/funnel client, schema, event/report routes, shared bridge and metrics. |
| A2 | Conditional owner gate | Privacy notice/control and single App/Pages global mount integration. |
| A3 | Conditional owner gate | Fixed-destination `/go` redirects and aggregate reporting. |
| D1 | Deferred product gate | Product/order/release/security contract. |
| D2 | Deferred product gate | Digital shop route/presentation integration. |

The exact files, active routes, environment-name dependencies, data/payment
dependencies, validation, rollback surfaces, and migration risks are machine
readable in `ops/recovery/rc-assembly-plan-20260921.json`.

## Dependency Graph

`OD1 privacy decision → A1 privacy-safe foundation → A2 router mounts + notice → A3 go funnel`.

`OD2 product decision → D1 product/payment/delivery contract → D2 public shop routes`.

`OD3 provider policy → any future llm-router change`; the current router is not
in an adoption unit. D1/D2 do not depend on Chat monetization, and cannot alter
R7-C2.

## Migration Requirements

| Area | Requirement |
|---|---|
| Database | `UNKNOWN` |
| Redis | Required before D1/D2 adoption; required before A1/A3 deploy |
| Environment | Presence-only audit required before deploy; values remain unread |
| Route | Possible collision review before each adoption |
| Catalog | None; R7-A stays canonical |
| Payment metadata | Required before D1/D2 adoption |
| Privacy notice | Required before A1/A2 adoption |

No migration is performed by this review.

## Owner Decisions

1. Choose whether to adopt A1-A3, keep Recovery analytics only, or reject the
   preserved analytics/funnel stack for this RC.
2. Choose whether to keep D1/D2 deferred, authorize a separate digital-product
   gate, or reject the historical digital flow.
3. Choose to keep the current LLM router, approve a separately reviewed provider
   policy, or disable optional remote providers.

## RC Assembly Preconditions

OD1 is required only for A1-A3. OD2 is required only for D1/D2. OD3 is required
only if the router is changed. An owner may choose the Recovery-only RC path;
then no application adoption is authorized by this document. A later assembly
must recheck the fixed base, exact selected hunks, routes, environment-name
presence, and relevant validators before any source modification.

## Validation Plan

Run the RC review validator, production diff validator, provenance validator,
parity validator, final integration validator, root typecheck, targeted lint,
and `git diff --check`. Do not run a build in this Unit. Provider, payment, data,
and secret operations remain prohibited.

## Truth Boundary

- source exists != product active
- product active != paid
- paid != fulfilled
- analytics code != analytics receiving data
- provider configured != provider healthy
- route exists != route publicly used
- Payment Link exists != customer payment
- production code != owner intent
- Recovery authority != deploy approval
- assembly plan != assembled RC
- assembled RC != production deploy
