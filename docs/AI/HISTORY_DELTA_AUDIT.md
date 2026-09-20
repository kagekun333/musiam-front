# Codex History Delta Audit

`HISTORY_DELTA_AUDIT = R7D_HANDOFF_REQUIRED`.

This is a documentation-only audit performed before R7-D. It does not start
R7-D, recover an application feature, apply a historical candidate, or assert
production parity.

## Audit Scope

- Repository: `/Users/kagekun/Desktop/musiam-front-clean`
- Starting branch / commit: `recovery/musiam-clean-20260920` / `cd596f4`
- Starting working tree: clean.
- Compared the present clean filesystem with the specified P-chan History V2
  handoff and the read-only preserved source only for the named paths.
- Application files, catalog data, providers, network, deployment, and the
  dirty source were not changed.

The history handoff is supplementary evidence only. In particular, a
historical deploy or log claim is not current filesystem truth and cannot
authorize a feature restoration.

## Evidence Hierarchy

1. Current clean recovery repository.
2. Current recovery manifests, validators, and hashes.
3. Phase 1 preservation records.
4. Historical Codex logs / the supplied History V2 handoff.

`PRODUCTION_PARITY = UNVERIFIED` throughout this audit.

## R7-D Findings

### Exhibition

**CONFLICT — existing secondary loader is not the R7-A canonical projection.**
`src/lib/loadExhibitionWorks.ts` exists and is the current exhibition-facing
loader. It fetches `works.json` and `works-ssd.json` directly, excludes the
R7-A primary-adjacent imports/readiness projection, and retains a title-match
fallback when merging SSD rows. This conflicts with the R7-A rule that title
equality is display/search aid, never identity proof. It does filter known
internal/strategy material from displayed fields, which is compatible with the
historical owner intent not to publish internal notes.

The stated intent to exhibit every released work is **NEW_AND_IMPORTANT**, but
is not yet verified by this loader's source set. R7-D must separately decide a
stable-ID based connection to the canonical server projection; no code was
changed here.

### Oracle / Omikuji

**HISTORICAL_ONLY / CONFLICT.** `src/app/oracle/omikuji/page.tsx` currently
redirects to `/` and is excluded from the sitemap. Its retained `Client.tsx`
uses `loadMergedWorksClient`, which omits `catalog-imports.json` and the server
readiness projection. `src/lib/oracle-song.ts` is a fixed rank-to-work map,
not a catalog projection. Therefore the historical unified-catalog concept is
not active and cannot be treated as R7-A-connected.

### TodaysPick

**NEW_AND_IMPORTANT / compatible current connection.**
`src/app/api/todays-pick/route.ts` uses `loadMergedWorksServer()` and selects
items by their recorded `id`, so its source is the R7-A canonical server
projection. No claim is made here about live requests, model fallback, or
provider behavior.

### Realm / Home

**NEW_AND_IMPORTANT / present and source-connected.** The active `/` Home
uses `loadMergedWorksServer()`, `dedupeWorks`, and `buildAtlas`, then renders
`RealmHome`. Region pages likewise load the server projection and dedupe it.
`/classic` remains a fallback. This inventories the historical immersive atlas
and discovery paths without adopting historical design/text. Runtime rendering
was not exercised.

### Letters

**NEW_AND_IMPORTANT / present secondary experience.** `src/lib/letters.ts`,
the Letters list/detail routes, `LettersScrollFx`, and `content/letters/` are
present. The current loader reads Markdown from that directory; the audit
observed 552 files. The list provides chronological revisit/month navigation
and uses existing PR-badge handling. Content was not edited or promoted.

### Broadcast / Now Playing

**NEW_AND_IMPORTANT / present secondary experience.** `BroadcastBar` is
mounted from the root layout and reads `/api/now-playing`. That route uses
`loadMergedWorksServer()` and recorded public/streaming links. The UI can load
the Spotify embed only after user interaction; no embed, Spotify, or other
external request was performed by this audit.

### Recurring Oracle

**HISTORICAL_ONLY PRODUCT.** The guarded
`src/app/api/cron/daily-oracle/route.ts` remains in the filesystem and contains
the old subscription/email concept. It requires cron authorization and would
query Stripe/send via Resend if invoked. Current `vercel.json` registers only
the metal-print cron, not this route. Neither price/product nor provider
configuration was inspected or activated. This is separate from R7-C2.

## Chat / History Findings

**ALREADY_RECOVERED for the current Chat UI/History scope.** The canonical
record remains `docs/AI/R7C1_CHAT_UI_HISTORY_RECOVERY.md`; it must not be
reopened. The historical route is `src/pages/api/chat-analysis.ts`, not an App
Router `src/app/api/.../route.ts` path. The route is absent from current clean,
but is present at that exact path in Phase 1 preservation's `untracked.pax`;
the classification is `PRESENT_IN_PRESERVATION_ONLY`. The supplied historical
canonical history also records deployment evidence for commit `569e907`.
Neither preservation presence nor historical deployment authorizes a copy into
the application. Current clean Chat/History remains canonical, and
`chat-analysis` is a separate Final Integration inventory decision. R7-C2 remains
`BLOCKED_PRODUCT_CONTRACT`; `PAID_CONTINUATION_NOT_ACTIVATED` remains true.

## Measurement Findings

**ALREADY_RECOVERED documentation boundary.**
`docs/AI/R6_OPERATIONAL_TRUTH.md` records the recovery and preserves the
historical/current and verification/customer-traffic distinctions. The R6 row
in `RECOVERY_PLAN.md` still says `UNKNOWN / 作業中`; this is an outdated plan
wording conflict. It is handed to Final Integration for normalization, not
changed as part of this audit.

## Catalog Historical Counts

**SUPERSEDED.** Historical values such as 216, 239, 271, 316, 321, and 324 are
snapshots, not current truth. R7-A designates `works.json` as the 450-item
primary master and `loadMergedWorksServer()` as the canonical server
projection. No historical count was restored and no catalog was regenerated.

## Conflicts

- Exhibition's direct two-file loader and title fallback conflict with R7-A
  stable-ID-only identity policy and omit R7-A imports.
- Retained Omikuji client uses a non-canonical client projection while its
  route is deliberately inactive.
- The R6 plan row's `UNKNOWN / 作業中` wording conflicts with the recovered
  R6 Operational Truth document.
- `src/pages/api/chat-analysis.ts` is preservation-only, while the current
  clean application has no such path; it requires a separate Final Integration
  decision and must not be copied as part of R7-D preparation.

## Superseded History

- Fixed historical catalog counts are superseded by current R7-A sources.
- Historical Home/Realm, Letters, Broadcast, Oracle, and Exhibition design or
  copy are candidates only; current paths, not historical text/design, are
  the audit inventory.
- Historical deployment does not prove current production parity.

## R7-D Handoff

R7-D remains `NOT_STARTED`. If explicitly opened later, its first decision is
whether each user-visible discovery surface can consume the R7-A canonical
server projection with exact stable identity. Exhibition and Omikuji are the
known conflict points; TodaysPick, Home/Realm, and Now Playing already show
server-projection use in the current filesystem. The historical instruction to
show all released works must still be reconciled with public-content and
identity boundaries.

## Final Integration Handoff

- Normalize the Recovery Plan's stale R6 `UNKNOWN / 作業中` wording against
  `R6_OPERATIONAL_TRUTH.md`; do not reinterpret it as live/provider proof.
- Evaluate preservation-only `src/pages/api/chat-analysis.ts` only if a future
  integration gate provides a current contract; do not treat archive presence
  or historical deployment evidence as implementation authority.
- Keep recurring Oracle as a historical product candidate until a separately
  authorized product, price, entitlement, provider, and sending review.

## No-Reopen Decisions

- R0 through R7-C2 are not reopened; reopened Recovery Units = 0.
- R7-C2 remains `BLOCKED_PRODUCT_CONTRACT` and
  `PAID_CONTINUATION_NOT_ACTIVATED`.
- No historical candidate was applied; application files changed = 0.
- Production/provider/network operations = 0.
- old catalog count != current catalog count; log claim != filesystem truth.
- historical deploy != current parity; `PRODUCTION_PARITY = UNVERIFIED`.
