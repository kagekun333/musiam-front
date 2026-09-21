# R7-D2 — Secondary Discovery and Revisit Surfaces

`R7D2_STATUS = RECOVERED` is a local-source and offline-validation result only.
No provider, network, deployment, catalog regeneration, subscription, email, or
push operation was performed.

## Home / Realm

`/` loads `loadMergedWorksServer()`, builds the atlas from stable work IDs, and
links work details as `/works/<encoded-id>`. Region pages use the same canonical
server projection and build their detail links from the work ID. `/classic`
remains the local fallback route.

The recovery found one identity regression in the shared display helper:
`dedupeWorks` used normalized title when there was no recorded Spotify ID. This
could collapse two distinct canonical IDs merely because their display titles
matched. The smallest adopted repair retains both records unless their recorded
Spotify album/track ID matches exactly. No catalog data changed.

## Letters

`src/lib/letters.ts` loads current `content/letters/*.md` files, extracts
frontmatter with safe defaults, and sorts newest first. The current filesystem
contains 552 letters. List and detail routes, month navigation, and adjacent
letter navigation are present.

## Letter Count and Metadata

The count above is a current filesystem observation, not a historical target.
PR labels derive only from the existing `{sponsored}` body marker; no letter
content, sponsorship, affiliate material, or work association was added.

## Scroll Restoration

`LettersScrollFx` saves only the list scroll position in `sessionStorage`,
rejects invalid values, tolerates unavailable storage, restricts restoration to
`/letters`, and uses manual browser restoration plus delayed attempts to avoid
route-change races. Its state is revisit UI state, not identity or profile data.

## Work Link Identity

Letters have no catalog merge or title-similarity work resolver. Home and Realm
work links use stable IDs. The shared display helper now has no title-based
identity fallback.

## Broadcast / Now Playing

`BroadcastBar` is mounted by the root layout and obtains its selection from
`/api/now-playing`. The route uses `loadMergedWorksServer`, requires a stable
ID, and obtains public/streaming links only through recorded-link helpers. It
does not synthesize Spotify or Apple Music URLs.

## Playback Truth

The bar distinguishes `NOW FEATURED`, `PLAYER READY`, and `NOW PLAYING`.
The final label is driven by Spotify `playback_update` and only when the player
reports neither paused nor buffering. The official player is opened from a user
gesture; no autoplay path was added or executed.

## TodaysPick Regression

`TodaysPick` and `/api/todays-pick` were not edited. The route retains the
canonical server loader and recorded public-link helper. This is
`UNCHANGED_PASS` for the current R7-D2 source inspection.

## Revisit Surfaces

| Surface | Classification | Current source observation |
|---|---|---|
| Home / Realm | `ACTIVE_LOCAL_ONLY` | Local route and canonical projection wiring inspected; runtime not exercised. |
| Letters | `ACTIVE_LOCAL_ONLY` | Markdown loader, list/detail, month and adjacent navigation inspected. |
| Broadcast / Now Playing | `ACTIVE_LOCAL_ONLY` | Local component and route contract inspected; provider playback not exercised. |
| TodaysPick | `ACTIVE_LOCAL_ONLY` | Canonical route wiring inspected; no request or provider fallback exercised. |
| `/api/subscribe` | `AVAILABLE_BUT_UNVERIFIED` | Route and lead-form caller exist; no request or email was sent. |
| Push routes | `AVAILABLE_BUT_UNVERIFIED` | Subscribe/send route files exist; no subscription or push was made. |
| Daily Oracle | `DISABLED` | Route remains outside `vercel.json` cron schedule; no product/provider activation. |

## Subscription / Email / Push Inventory

This Unit only read these paths. It did not create subscribers, register a cron,
inspect credentials, send email/push, or touch Resend, Stripe, Redis, or a
provider. Files alone do not prove an active recurring business.

## Historical Comparison

Read-only comparisons to `e94d32f` and `28cea9b` show their relevant PR badge,
scroll restoration, Spotify inline playback, and playback-status improvements
already exist in current clean. No historical hunk was copied or cherry-picked.

## Changes Adopted

- Replaced the title-based fallback in `dedupeWorks` with canonical work-ID
  fallback, preserving separate same-title records without an exact recorded
  Spotify identity.
- Added an offline R7-D2 validator covering Home/Realm, Letters, Broadcast,
  TodaysPick, and inactive recurring boundaries.

## Changes Rejected

- No Home/Realm redesign or historical copy.
- No Letters editorial, sponsorship, link, or scroll-code rewrite.
- No Broadcast provider/network invocation or playback architecture change.
- No Oracle, TodaysPick, Chat, payment, Stripe, Metal Print, subscription,
  email, push, Redis, catalog, or production change.

## Validation

`scripts/validate-r7d2-secondary-surfaces.ts` runs offline and reports its
check count, source observations, `networkRequests: 0`, and
`productionParity: UNVERIFIED`. R7-D1 and R7-A validators remain separate
regression gates.

## Final Integration Handoff

R7-D1 remains `RECOVERED`; R7-D2 is complete after its required local gates.
The next named gate is `Recovery Final Integration`. This Unit does not start
or implement that gate.

## Truth Boundary

- file exists != feature active
- player visible != playback
- playback != listening completion
- scroll state != user identity
- letter title != work identity
- historical production != current parity
- subscription route != active subscription business
- local PASS != production parity
- `PRODUCTION_PARITY = UNVERIFIED`
