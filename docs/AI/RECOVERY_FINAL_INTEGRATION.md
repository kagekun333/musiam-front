# 伯爵MUSIAM — Recovery Final Integration

## Executive State

`RECOVERY_FINAL_INTEGRATION = LOCAL_RECOVERY_INTEGRATED_WITH_KNOWN_BLOCKER`。

This is the local clean Recovery authority at commit `1a94aa5` plus this Final
Integration commit. It records a verified local recovery chain, not a deploy,
release approval, or current production observation. `PRODUCTION_PARITY = UNVERIFIED`.

## Canonical Repository

- Repository: `/Users/kagekun/Desktop/musiam-front-clean`
- Branch: `recovery/musiam-clean-20260920`
- Initial Final Integration HEAD: `1a94aa5 recovery: restore secondary discovery and revisit surfaces`
- Baseline: verified self-contained history copy from `117379b6`.
- Current canonical application projection: `src/lib/loadMergedWorksServer.ts`.

## Commit Chain

The local chain retains R6 `8058e19`, R1 `6374e8a`, R2 `6f9617d`, R3
`5f411c4`, R4 `9732966`, R7-A `06ba047`, R7-B `f8ed933`, R7-C1 `3ff030a`,
R7-C2 `cd596f4`, History Delta `1fc66af`, R7-D1 `162f344`, and R7-D2
`1a94aa5`. No commit was pushed or merged to main.

## Recovery Unit Matrix

| Unit | Final state |
| --- | --- |
| R0 | `VERIFIED_PRESERVATION / VERIFIED_HISTORY_COPY`; `OTHER_REFS=INCOMPLETE` |
| R1 | `RECOVERED` |
| R2 | `RECOVERED_PRESERVED_HOLD` |
| R3 | `RECOVERED_PRESERVED_EXPERIMENT` |
| R4 | `RECOVERED_EVIDENCE_BOUNDARY` |
| R5 | `PRESERVE_HOLD / SEPARATE_BUSINESS_SCOPE` |
| R6 | `RECOVERED` |
| R7-A | `RECOVERED` |
| R7-B | `RECOVERED` |
| R7-C1 | `RECOVERED` |
| R7-C2 | `BLOCKED_PRODUCT_CONTRACT / PAID_CONTINUATION_NOT_ACTIVATED` |
| R7-D1 | `RECOVERED` |
| R7-D2 | `RECOVERED` |
| HISTORY-DELTA | `AUDITED_HANDOFF_CONSUMED` |

## Application Architecture

`loadMergedWorksServer` is the server canonical projection. It merges the
450-item `works.json` master, 21 primary-adjacent imports, and 216 SSD
enrichment records by stable identity only. Title equality does not merge
identity. The recovered local runtime has 514 unique stable work IDs.

Chat is `src/pages/chat.tsx` to `/api/chat-experience-v3`; R7-B deterministic
recommendation core and R7-C1 stable `workId` cards/history remain active.
History is an anonymous UI-history concern, not an entitlement system.

## Catalog Truth

The master hash is fixed by `catalog-foundation.manifest.json`. Cataloged,
released, public, recommendation-ready, sellable, and market-proven are
separate states. R4 data is not injected as semantic catalog knowledge.

## Chat Truth

The active 20-turn `longClose` guard is an abuse/API-cost limit. It is not a
purchase or access state. No 15-turn paywall, Chat Checkout, payment
verification, entitlement, or resume route is active.

## Exhibition / Discovery Truth

The Exhibition API uses `loadExhibitionProjection()` over the canonical server
projection. At the validation date, 514 explicitly released local works are
displayed and released-work missing count is 0. Home/Realm, TodaysPick, and
Now Playing retain the canonical server loader; Broadcast uses recorded links
and does not autoplay. Oracle and Omikuji are `ORACLE_INACTIVE_BY_DESIGN`:
both redirect to `/`, and the daily Oracle cron remains unscheduled.

## Payment Boundaries

R1 retains the dedicated Metal Print metadata contract:
`product=vip-metal-print`, `editionId`, and `orderId`. Unrelated signed Checkout
events are acknowledged as ignored; that boundary is unrelated to Chat paid
continuation. No Metal Print product or payment contract was extended.

## Operational Truth

R6 is recovered and canonical in `R6_OPERATIONAL_TRUTH.md`. Its records keep
historical/current, synthetic/real, and unknown/zero distinct. The latest
authentication-blocked or historical observations are not a current production
measurement.

## Evidence Boundaries

R4 keeps 10 uniquely runtime-bound measured sources, 9 historical public
metadata rows, 2 local full candidates, and `fullTrackVerifiedCount=0`.
Evidence is source-scoped and does not establish full-song understanding,
listener fit, rights, quality, or recommendation eligibility.

## Preserved Experiments

R2 remains historical `HOLD`; no candidate overlay was applied. R3 remains a
preserved, non-active experiment. The two-file Lane C c1 candidate is not
runtime-imported and is excluded narrowly from root TypeScript compilation so
that its intentionally absent historical imports do not mask application type
errors. Candidate files were not changed, completed, or adopted.

## Deferred Separate Scopes

- R5 SHAMAN: separate business scope and `PRESERVE_HOLD`.
- R7-C2: canonical product, price, payment verification, entitlement, and
  resume contracts require a separate product/business decision.
- Production parity: separate verification gate.
- R2 HOLD and R3 candidate: remain preserved, not adopted.
- R0 `OTHER_REFS`: incomplete, but not needed for the verified HEAD history copy.
- `src/pages/api/chat-analysis.ts`: `PRESENT_IN_PRESERVATION_ONLY`; no automatic restoration.
- Subscribe, push, weekly digest, and Daily Oracle: filesystem presence does not prove an active service.

## Validation Matrix

Recovery validators and the integrated validator are local/offline: provider
calls `0`, validator network requests `0`, production operations `0`, and
deploy/push `0`. The one build command made unsuccessful build-time DNS fetch
attempts to Google Fonts; those attempts completed no request and are recorded
under Build Decision rather than represented as zero network activity.

| Validation | Result |
| --- | --- |
| R1 Metal Print webhook validator | PASS |
| R4 music evidence validator | PASS |
| R7-A catalog validator | PASS: 514 runtime works |
| R7-B Chat Core validator | PASS: 15 fixtures |
| R7-C1 UI/history validator | PASS: 22 fixtures |
| R7-C2 fail-closed validator | PASS: 20 fixtures |
| R7-D1 Exhibition/Oracle validator | PASS: 514 displayed, 0 missing |
| R7-D2 secondary surfaces validator | PASS: 40 checks |
| Final integrated validator | PASS: 45 cross-boundary and local route-source checks |
| Targeted lint | PASS: Final validator and critical active paths |
| Root typecheck | PASS after narrow preserved-R3 exclusion |
| Local build | BLOCKED: `next/font` attempted `fonts.googleapis.com` for four fonts; DNS unavailable; no retry or configuration change |

## Typecheck Decision

Before this Final Integration, root `tsc --noEmit` failed only under
`ops/simulation-refinement/phase6-three-lanes-20260913/lane-c/c1-initial-draft/`.
That tracked historical candidate has missing candidate-only imports and no
runtime reference from `src/**` or Next configuration. `tsconfig.json` excludes
only this preserved directory. It does not exclude `src/**`, does not invent
the missing modules, and preserves the candidate bytes. Root typecheck after
this narrow exclusion is the application-wide local typecheck decision.

## Build Decision

`NEXT_TELEMETRY_DISABLED=1 npm run build` reached the production-build compile
step but was blocked by the existing build-time `next/font` dependency: Cinzel,
EB Garamond, Inter, and Noto Serif JP each attempted `fonts.googleapis.com` and
DNS resolution returned `ENOTFOUND`. No provider API, production secret, deploy,
or application/configuration workaround was used; the command was not retried.
This is an environment/network limitation, not application build PASS or a
root typecheck diagnostic. Build/lint PASS would remain local evidence because
build lint is configured to be ignored.

## Production Parity

`PRODUCTION_PARITY = UNVERIFIED`. Historical deploy IDs and prior deployments
are not evidence of the current production source, environment, data, or
runtime parity.

## Known Blockers

The known Final Integration blocker is local production-build completion while
the existing `next/font` Google Fonts dependency cannot resolve. No application
recovery blocker is known after the narrow R3 preservation compiler boundary.
R7-C2 is intentionally blocked by missing product/payment/entitlement/resume
contracts; it is not a blocker for local core Recovery.

## Release Preconditions

The next, separate gate is **Production Parity / Release Candidate
Verification**: identify current production source, compare it with this clean
Recovery, inspect secret/config presence without exposing values, check
environment/build/runtime compatibility and migration needs, review the deploy
candidate diff, and prepare rollback. This Final Integration does not start it.

## Next Gate

`Production Parity / Release Candidate Verification` requires explicit scope
and Human Gates for production configuration and deployment. Recommended model
for that high-risk gate: Astra, high reasoning.

## Truth Boundary

- recovered != deployed
- historical deploy != current parity
- local PASS != production PASS
- cataloged != released unless explicitly recorded
- payment intent != paid
- paid != delivered
- test != real
- QA != customer
- unknown != zero
- evidence != semantic understanding
- preserved candidate != active code
- file exists != active service
- `PRODUCTION_PARITY = UNVERIFIED`
