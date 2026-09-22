# 伯爵MUSIAM — Recovery-only RC Preview Validation

## Result

RC_PREVIEW_VALIDATION = BLOCKED_BY_RUNTIME.

The one authorized Preview deployment built successfully and reached READY. However,
the required Preview GET for /exhibition made one redirect and finished at /works.
The source contains the Exhibition page and canonical API, but this observed
Preview UI behavior is not promoted to a successful Exhibition validation. No
application or configuration correction is included in this Recovery-only unit.

## Identity and authorization

- Governance HEAD: a6bf8791b21559aaafa31e98c1c2ce022d2e26e3
- Frozen application base: a918b05fba988884d27efd5509e2a3eee6df1127
- Branch: recovery/musiam-clean-20260920
- APPLICATION_DRIFT = 0
- PREVIEW_DEPLOY_AUTHORIZED = true
- PRODUCTION_DEPLOY_AUTHORIZED = false
- MAX_PREVIEW_DEPLOY_COUNT = 1; actual count: 1
- .env.local before and after the deploy: absent; values were never read.

Existing ignored .vercel/project.json was used only as metadata for
hakusyakus-projects/musiam-front. No link, pull, env, or env-value command ran.

## Preview build

| Field | Observed value |
| --- | --- |
| Deployment | dpl_3HzCvSatWj4X3GpgNMiQjRbNHPJ1 |
| Preview URL | https://musiam-front-3p5e8c8xx-hakusyakus-projects.vercel.app |
| Created | 2026-09-22T11:01:39Z |
| Target / state | preview / READY |
| Build | PASS |
| Build duration | 2m 37s |
| Framework / Node setting | Next.js 15.5.12 / project Node 22.x |

Vercel's server-side build completed normally. This does not replace the
historical local BLOCKED_BY_FONT_DNS record.

## GET-only Preview smoke

All requests used the Preview deployment URL through Vercel curl. No POST,
player interaction, checkout, payment, provider, or customer-data action ran.

| Route | HTTP / redirect | Final Preview path | Fatal error page |
| --- | --- | --- | --- |
| / | 200 / 0 | / | absent |
| /chat | 200 / 0 | /chat | absent |
| /exhibition | 200 / 1 | /works | absent; unexpected redirect |
| /letters | 200 / 0 | /letters | absent |
| /letters/2026-06-30-junes-final-whistle | 200 / 0 | same | absent |
| /classic | 200 / 0 | /classic | absent |
| /works/apple-album-6797260493 | 200 / 0 | same stable-ID route | absent |
| /oracle | 200 / 1 | / | inactive redirect retained |
| /oracle/omikuji | 200 / 1 | / | inactive redirect retained |

The rendered Chat response contains its textarea. Client interaction, message
submission, and Chat-history mutation were not executed; Chat provider calls
are 0. The Home response rendered without forced audio playback; player
interaction and forced playback are 0.

The side-effect-free GET-only /api/exhibition returned 514 items with 514
unique stable IDs. The local canonical projection remains displayed = 514 and
missing released = 0. Neither title equality nor the UI redirect is identity
evidence.

## Runtime and production boundaries

Preview-only runtime log queries for the validation window returned no error,
fatal, or HTTP 500 entries. This is NO_ERROR_OR_500_LOGS_RETURNED, not a claim
about unqueried production logs.

Production was inspected read-only before and after. It remains
dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX, READY, with www.hakusyaku.xyz listed on it.
The Preview deployment has no production alias listed. PRODUCTION_MUTATION = 0.

- Chat provider calls: 0
- Payment operations: 0
- Data writes: 0
- Production deploy, promote, rollback, or alias mutation: 0
- R7-C2 remains BLOCKED_PRODUCT_CONTRACT / PAID_CONTINUATION_NOT_ACTIVATED.
- ORACLE_INACTIVE_BY_DESIGN is retained.
- ENV_ROTATION_REVIEW_REQUIRED = true.
- SECRET_DISCLOSURE_CONFIRMED = false.

## Next Gate and truth boundary

Cleanup does not start. The next possible work is a separately authorized,
read-first diagnosis of the Preview /exhibition to /works routing behavior. This
does not establish production readiness, production parity, or validation of
payment, provider, data, or customer paths.
