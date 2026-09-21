# 伯爵MUSIAM — Exact Production vs Recovery Diff / Merge Plan

## Executive Decision

`DIFF_STATUS = RC_BASE_READY_WITH_MERGE_UNITS`.

Recovery `c76c138f7258096e1a606235e89107782eb1ebc0` remains the RC base. The exact
production input is preserved as evidence, but no production path is copied into
Recovery, no merge is performed, and no RC is assembled in this Unit. The only
adoption candidates are the bounded merge units below, each requiring a separate
Human Gate and validation.

`R7-C2 = BLOCKED_PRODUCT_CONTRACT` and
`PAID_CONTINUATION_NOT_ACTIVATED` remain unchanged. Chat history is not entitlement,
and historical `chat-analysis` presence is preservation-only.

## Exact Sources and Collection Boundary

| Source | Exact identity |
|---|---|
| Production deployment | `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX` |
| Production authority | manifest SHA-256 `1a4ee637d55be29b4f7307daa10e9d9fc0ac7b36348337300ed34aa0c126af0b` |
| Production deploy input | `/private/tmp/musiam-production-hotfix-20260921`, preserved dry manifest with 3150 files |
| Recovery | branch `recovery/musiam-clean-20260920`, HEAD `c76c138f7258096e1a606235e89107782eb1ebc0` |
| Recovery collector | Vercel CLI 59.23.2 internal offline `inspectDeploymentFiles`, calibrated against the preserved production dry manifest |

The requested `vercel deploy --dry --format=json` could not run directly from
Recovery because the checkout is not project-linked (`BLOCKED_PROJECT_NOT_LINKED`).
No provider mutation or deployment occurred. The offline collector reproduced the
preserved production manifest exactly at path, mode, size, and content ID level,
then produced the Recovery deploy-input inventory. This is a deploy-input diff,
not proof of current production environment values, provider state, database state,
or customer/business state.

## Manifest Comparison

| Measure | Production | Recovery |
|---|---:|---:|
| Included deploy-input files | 3150 | 3199 |
| Total included bytes | 236,743,709 | 214,009,011 |
| Ignored entries | 3 | 46 |
| Exact identical path/content/mode | 2987 | — |
| Modified content | 40 | — |
| Mode-only | 1 | — |
| Production-only | 122 | — |
| Recovery-only | 171 | — |
| Total differing paths | 334 | — |

The complete path-by-path record, including hashes, modes, classification,
subsystem, runtime relevance, review status, decision, and evidence is in
`ops/recovery/production-vs-recovery-diff-20260921.json`.

Classification totals are:

| Classification | Count |
|---|---:|
| `GENERATED_OR_NON_RUNTIME` | 167 |
| `UNKNOWN` | 8 |
| `SUPERSEDED_BY_RECOVERY` | 54 |
| `HISTORICAL_ONLY` | 64 |
| `RECOVERY_ONLY_EXPECTED` | 5 |
| `IDENTICAL_SEMANTICS_DIFFERENT_BYTES` | 1 |
| `PRODUCTION_ONLY_VALID` | 26 |
| `CONFLICT` | 9 |

## Application Review

The application/configuration review set is 156 differing paths: 102 under
`src/**`, 52 under `public/works/**`, plus `package.json` and `tsconfig.json`.
All 156 have explicit review records. Documentation, operations ledgers,
preservation artifacts, generated material, and other non-runtime paths remain
classified without runtime adoption.

### Catalog

`public/works/works.json`, `works-ssd.json`, and `catalog-imports.json` are exact
matches. Recovery's `catalog-readiness.json`, stable-ID merge loader, merge helper,
and dedupe helper remain the canonical R7-A projection. Production's older
catalog-readiness and title-oriented implementation is not automatically restored.
Stable IDs, explicit mappings, or exact release UUIDs remain required; titles do not
prove identity.

### Chat and paid continuation

Recovery R7-B/R7-C1 remains authoritative for active Chat v3, deterministic
one-work recommendation, history/card wiring, and recorded public links. The
production-only `src/pages/api/chat-analysis.ts` is `HISTORICAL_ONLY` and
`PRESENT_IN_PRESERVATION_ONLY`; it is not copied into current Chat or History.
History and entitlement remain separate. R7-C2 is still blocked: no price,
canonical product, Stripe binding, fulfillment, or entitlement contract is activated.

### Payment and Metal Print

Metal Print checkout, webhook, and identity helper are exact matches:

- `src/app/api/metal-print/checkout/route.ts`
- `src/app/api/metal-print/webhook/route.ts`
- `src/lib/metal-print-webhook-identity.ts`

The existing Recovery/R1 identity boundary stays in force. Production-only digital
commerce and delivery files are preserved as merge candidate M1, not adopted. The
remaining bounded conflicts require owner decisions before RC Assembly.

### Exhibition, Discovery, Home, and Realm

R7-D1 remains canonical: Exhibition uses the Recovery server projection and
explicit released-work mapping, with no browser title join. Oracle/Omikuji remains
`ORACLE_INACTIVE_BY_DESIGN`. R7-D2 remains canonical for Home/Realm, Letters,
Broadcast, Now Playing, and TodaysPick stable-ID and playback/link boundaries.

### Letters, Broadcast, Now Playing, TodaysPick

Letters, Broadcast, Now Playing, and TodaysPick exact-match paths are retained as
matched behavior. No new production-only state is promoted from these surfaces.

### Configuration, dependencies, and public assets

`pnpm-lock.yaml`, `next.config.js`, `vercel.json`, and `.vercelignore` are exact
matches. `package.json` and `tsconfig.json` remain Recovery-side configuration
decisions and are classified in the manifest. Public work assets are individually
classified; no blanket asset copy is authorized. The sole mode-only path is
`scripts/notify_kpi.sh` with identical content and modes `33188` versus `33261`;
it is `IDENTICAL_SEMANTICS_DIFFERENT_BYTES` and requires no runtime merge.

## Production-only Valid Merge Units

### M1 — Digital Commerce / Delivery Preservation

Thirteen production-only paths form one bounded unit covering digital shop routes,
orders, delivery releases, product definitions, and same-site request handling.
Dependencies are Stripe/payment configuration, Redis/order storage, and delivery
release artifacts. Before any adoption: offline route/schema audit, payment metadata
and delivery audit, Redis/migration assessment, and explicit Human Gate. M1 does
not activate Chat paid continuation or imply fulfillment. The new order/delivery path
is fail-closed in this source snapshot because every release has `approvedAt: null`;
some legacy hosted Checkout links exist, but their presence is not payment, delivery,
or customer-use evidence.

### M2 — Privacy / Analytics / Funnel Preservation

Thirteen production-only paths form one bounded unit covering privacy controls,
first-party analytics, funnel/go routes, and reporting. Before any adoption:
privacy/legal owner decision, offline event/schema audit, and provider/environment
presence audit without reading secret values. No external analytics or customer-data
operation is authorized by this plan.

## Recovery-authoritative Units

Keep the following Recovery units as the base: R7-A catalog stable-ID projection;
R7-B deterministic Chat core; R7-C1 Chat UI/history/card wiring; R7-C2 blocked paid
continuation contract; R1 Metal Print webhook identity boundary; R7-D1 Exhibition
canonical server projection; R7-D2 secondary surfaces; and ORACLE inactive by
design. These are not production source adoptions.

## Conflicts and Unknowns

The 9 remaining conflicts are bounded privacy/analytics, digital-commerce,
provider-routing, and catalog-fallback differences:
`src/app/layout.tsx`, `src/app/shop/BuyButton.tsx`, `src/app/shop/page.tsx`,
`src/components/AnalyticsInit.tsx`, `src/lib/catalog-counts.ts`,
`src/lib/llm-router.ts`, `src/lib/metrics.ts`, `src/lib/shop-config.ts`, and
`src/pages/_app.tsx`. Each requires an owner decision before RC Assembly; catalog
fallback and provider routing are additionally technical architecture decisions.

The production-only Metal Print attribution, recommendation, and response-auditor
helpers were reclassified `SUPERSEDED_BY_RECOVERY`. They are imports of the
superseded production Chat/Metal Print flow, while Recovery retains R7-B/R7-C1 and
the current no-pressure/evidence-aware Metal Print boundary. They are retained for
audit but are not separate merge candidates.

Eight operational paths remain `UNKNOWN` because source bytes cannot establish
current authority or recency: the ABI account/launch/maturity/profile records,
Daily Music publication queue, YouTube capabilities, and Metal Print VIP goal and
controller state. All eight records remain preserved outside runtime merge.

## Migration Assessment

| Area | Assessment | Gate |
|---|---|---|
| Database | `UNKNOWN` | Inspect schema/ownership only after explicit approval |
| Redis | `POSSIBLE` | M1/M2 key and retention audit |
| Environment | `UNKNOWN` | Names/presence audit; values remain secret |
| Route | `POSSIBLE` | Offline route collision and contract audit |
| Catalog | `POSSIBLE` | Stable-ID/provenance review |
| Payment metadata | `POSSIBLE` | Human Gate; no Stripe/provider operation |

No migration, provider call, payment operation, data operation, secret access,
environment change, deploy, push, merge, or RC assembly was performed.

## Terra Semantic Decision Audit

`TERRA_DECISION_AUDIT = REVISED`. The existing 334-record computation was not
rerun. All 26 `PRODUCTION_ONLY_VALID` records, all original 12 conflicts, and all
8 UNKNOWN operational records were reviewed from source and reference paths.

M1 remains a preservation candidate, with its fail-closed delivery condition made
explicit. M2 remains a candidate: its source respects DNT/GPC/local opt-out, uses
bounded event schemas and aggregate storage, and fails closed/degrades when provider
keys or storage are unavailable; this does not assert analytics availability. Three
Metal Print helper dependencies are now `SUPERSEDED_BY_RECOVERY`, leaving 9
conflicts. The 8 UNKNOWN records remain non-runtime operational records with
unproven authority and recency.

The collector methodology is accepted for this fixed snapshot only. Vercel CLI
59.23.2's internal collector reproduced all 3150 preserved production dry-run tuples
before collecting Recovery. It is version-bound because the collector is internal,
but the calibrated result is deterministic enough for this source comparison.

## RC Base and Next Gate

The RC base is Recovery with merge units, not production wholesale and not a
production parity claim. Next Gate is a separately authorized RC Assembly review
covering M1/M2 and each of the 9 remaining conflicts. That Gate must rerun the offline
validators, typecheck/lint, diff checks, and targeted route/security reviews, then
obtain explicit owner decisions. Build remains outside this Unit and is not rerun.

## Truth Boundary

This record proves an exact comparison against the preserved production deploy
input and the Recovery deploy input collected by the calibrated offline collector.
It does not prove current production env values, provider/database/Redis state,
customer entitlements, payment fulfillment, sales attainment, public demand,
production parity, or deploy readiness. Local evidence is not production evidence.
