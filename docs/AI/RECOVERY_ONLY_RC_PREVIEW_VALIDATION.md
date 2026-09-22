# 伯爵MUSIAM — Recovery-only RC Preview Validation

## Result

`RC_PREVIEW_VALIDATION = PASS_READY_FOR_CLEANUP`.

The explicitly authorized second Preview deployment is READY, and Preview-only
GET/HEAD evidence shows that `/exhibition` renders directly at HTTP 200 with no
redirect. This is a Preview routing validation only: it does not grant
production readiness, promotion, publication, cleanup execution, or a change
to payment/provider/customer-data authority.

## Identity and authorization

- Starting and validated HEAD: `cad8c6c473612d12286868e541e4624545d1250b`
- Branch: `recovery/musiam-clean-20260920`
- Expected route authority: `src/pages/exhibition.tsx`
- Removed legacy redirect: `/exhibition` → `/works`
- `PREVIEW_DEPLOY_AUTHORIZED = true`; production deployment authorization is false.
- Maximum and actual deployment count for this validation: 1.
- `.env.local` was absent before and after the deploy; its contents were never read.

Existing ignored `.vercel/project.json` was used only for
`hakusyakus-projects/musiam-front`. No link, pull, environment, promotion,
rollback, alias, push, merge, or application-source operation ran.

## Preview build

| Field | Observed value |
| --- | --- |
| Deployment | `dpl_9eB9h2AgwwyUZ5k7nmLEBkfZNKaT` |
| Preview URL | https://musiam-front-i505jvayn-hakusyakus-projects.vercel.app |
| Target / state | preview / READY |
| Build | PASS |
| Build duration | 2m 51s |
| Framework / Node runtime | Next.js 15.5.12 / Node 22.x |

The Vercel server-side build completed normally. This is not a production
deployment and does not replace the separate historical local font-DNS boundary.

## GET/HEAD-only Preview smoke

All requests used the Preview URL through `vercel curl`. No POST, player
interaction, Checkout, payment, provider, or customer-data action ran.

| Route | HTTP / redirects | Final path | Fatal error page |
| --- | --- | --- | --- |
| `/` | 200 / 0 | `/` | absent |
| `/chat` | 200 / 0 | `/chat` | absent |
| `/exhibition` | 200 / 0 | `/exhibition` | absent |
| `/letters` | 200 / 0 | `/letters` | absent |
| `/letters/2026-06-30-junes-final-whistle` | 200 / 0 | same | absent |
| `/classic` | 200 / 0 | `/classic` | absent |
| `/works/apple-album-6797260493` | 200 / 0 | same stable-ID route | absent |
| `/oracle` | 200 / 1 | `/` | inactive redirect retained |
| `/oracle/omikuji` | 200 / 1 | `/` | inactive redirect retained |

The Preview `/api/exhibition` GET returned 514 items with 514 unique stable
IDs. The local canonical invariant remains displayed = 514 and missing = 0.
The Chat response rendered its textarea; no interaction or submit occurred, so
Chat provider calls remain 0. No forced playback was triggered.

## Runtime and production boundaries

Read-only runtime-log queries, scoped to this Preview deployment and the
validation window, returned no logs for error/fatal or 500 queries:
`PREVIEW_RUNTIME_LOGS = CLEAN` within that bounded scope.

Production was inspected read-only before and after. It remains
`dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX`, READY, with
`www.hakusyaku.xyz` listed on it. The Preview inspection listed no aliases, and
therefore no production alias. `PRODUCTION_MUTATION = 0`.

- Chat provider calls: 0
- Payment operations: 0
- Data writes: 0
- Forced playback: 0
- Production deploy, promote, rollback, environment, or alias mutation: 0
- `ORACLE_INACTIVE_BY_DESIGN` is retained.
- Application files changed during this validation: 0.

## Next Gate and truth boundary

Cleanup is not started. This record makes the RC Preview routing validation
ready for the separately authorized cleanup gate only. It does not establish
production parity, paid fulfillment, provider behavior, demand, or customer
data correctness. Git commit is not authorized; only the four allowed record
files are left pending.
