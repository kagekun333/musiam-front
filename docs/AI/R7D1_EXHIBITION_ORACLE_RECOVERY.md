# R7-D1 — Exhibition / Oracle / Omikuji Alignment

`R7D1_STATUS = RECOVERED`。このUnitは user-visible Exhibition を R7-A canonical catalog
projection に限定して接続し、Oracle / Omikuji の current inactive decision を確認した。
Home / Realm、Letters、Broadcast、Now Playing、TodaysPick implementation、Chat、payment、daily
Oracle、provider、network、deploy、push は変更・実行していない。`PRODUCTION_PARITY = UNVERIFIED`。

## Active Exhibition

- Active route: `src/pages/exhibition.tsx` (Pages Router `/exhibition`)。
- Browser loader: `src/lib/loadExhibitionWorks.ts` fetches only `/api/exhibition`.
- Server adapter: `src/pages/api/exhibition.ts` calls `loadExhibitionProjection()`.
- Canonical source: `loadMergedWorksServer()` through `src/lib/exhibition-projection.ts`.
- Detail links remain `/works/${encodeURIComponent(work.id)}` and never derive a route from title.

## Exhibition Source Before

The prior loader fetched `works.json` and `works-ssd.json` in the browser, omitted
`catalog-imports.json` and readiness projection, then joined SSD rows by
`canonicalMasterId`, exact ID, **or normalized title**. It also derived display copy from
raw SSD `matchInfo` / track notes and constructed some Spotify/Amazon URLs from metadata.

## Canonical Source After

The new server-only adapter consumes R7-A's `works.json → catalog-imports.json →
works-ssd.json` canonical merge. It does not implement any additional catalog join.
It exposes only display-safe fields and uses an exact `workId` lookup into the existing
public editorial sidecar when a description exists. Raw SSD notes, `matchInfo`, local paths,
internal tags, and unlisted link keys do not cross the adapter boundary.

## Identity Policy

The adapter preserves R7-A identity: exact work ID, explicit canonical ID/alias, and exact
release UUID are resolved upstream by the canonical projection. Title equality is not used by
the Exhibition adapter or client. A `catalogStatus.identityConflict` record is fail-closed and
is not displayed.

## Released Work Coverage

At validation date `2026-09-21`, the repository's only explicit publication field is recorded
`releasedAt`. A syntactically valid recorded date on or before that date is `RELEASED`; a later
recorded date is `FUTURE_OR_UNRELEASED`; absent/invalid is `UNKNOWN_RELEASE_STATE`. This is a
status rule based on the field, not an inference from title, URL, R4 evidence, or historical
availability.

|Metric|Count|
|---|---:|
|Canonical runtime works|514|
|Explicit released works|514|
|Displayed Exhibition works|514|
|Excluded future/unreleased|0|
|Excluded identity-conflict|0|
|Unknown release-state|0|
|Released missing from Exhibition|0|

`catalog-imports.json` contributes 21 records, all of which are present in the canonical
projection. The audit is local runtime evidence only; it does not prove deployed behavior.

## Public / Internal Boundary

The projection does not create descriptions, genres, moods, lyrics, language claims, listener
fit, or full-track understanding. It retains current canonical/public fields, whitelists public
link keys, and uses recorded URLs only. Tests scan the actual output for MV concept, Shorts,
promotion, local-cover, and Hyperfollow raw-note leakage.

## Oracle Current State

`/oracle` and `/oracle/omikuji` both redirect to `/`. The Omikuji page explicitly records
the `2026-06` complete withdrawal, sets `noindex`, and `/oracle/omikuji` is absent from the
sitemap. There is no current navigation or sitemap evidence that the retired route is a missing
recovery.

## Oracle Historical State

`src/app/oracle/omikuji/Client.tsx`, Omikuji assets/API routes, and `oracle-song.ts` remain as
legacy preservation. The retained client uses `loadMergedWorksClient`, not the R7-A server
projection. The historical daily Oracle route is a separate subscription/email candidate and is
not registered as a Vercel cron. Historical existence does not authorize reactivation.

## Oracle Activation Decision

`ORACLE_INACTIVE_BY_DESIGN`. The explicit withdrawal comment, dual redirects, noindex metadata,
and sitemap exclusion are mutually consistent current architecture evidence. No route, client,
navigation, subscription, email, payment, or provider behavior was activated.

## Oracle Work Mapping

The retained mapping is `LEGACY_FIXED_EXACT_WORK_ID`: rank keys map to recorded stable work IDs.
All seven rank entries resolve to an exact ID in the current 514-work projection; unresolved
mappings: `0`. This is not an active catalog projection, semantic recommendation, personality
diagnosis, or claim that a mapped work is psychologically optimal.

## TodaysPick Regression

`src/app/api/todays-pick/route.ts` remains unchanged and still imports
`loadMergedWorksServer()`. The validator also confirms no title-based Oracle lookup was added.

## Validation

- `node --import tsx scripts/validate-r7d1-exhibition-oracle.ts`: PASS, 20 fixtures/checks.
- Targeted ESLint: PASS after removing an obsolete unused parser (the validator is ignored by
  the repository ESLint ignore rule unless invoked with `--no-ignore`).
- Targeted TypeScript error scan: no errors in R7-D1 paths.
- Root `npm run typecheck`: blocked only by the known R3 preservation artifact under
  `ops/simulation-refinement/phase6-three-lanes-20260913/lane-c/c1-initial-draft/`; no
  R7-D1 path appears in its errors.
- `git diff --check`: PASS.

## Deferred to R7-D2

`R7-D2 = NOT_STARTED`: Realm / Letters / Broadcast / secondary revisit surfaces. This Unit does
not reopen those surfaces or redesign Home / Realm.

## Truth Boundary

- title != identity
- released != cataloged
- cataloged != public
- internal notes != exhibition copy
- Oracle mapping != semantic recommendation
- Oracle result != personality diagnosis
- historical active != current active
- route exists != route enabled
- local PASS != production parity
- `PRODUCTION_PARITY = UNVERIFIED`
