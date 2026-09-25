# MUSIAM Product Lane A — Chat Strengthening 02

`PRODUCT_LANE_A_CHAT_STRENGTHENING_02 = PASS_COMMITTED`

## State Lock

- Starting HEAD: `4e975612dfa72e657a95a4ab1cdd76c667d4432e`
- Branch: `recovery/musiam-clean-20260920`
- The in-progress Strengthening 02 changes were preserved. No reset, restore, stash, clean, or checkout rollback was used.
- Existing untracked `ops/market-learning/daily-20260925/` was preserved and excluded from this change. The pasted path used a different date; the observed directory is the protected one.
- Prior Strengthening 01 work and the active Chat route `/api/chat-experience-v3` remain in place.

## Product change

The recommendation card now links to `/works/{workId}` and offers two localized, neutral prompts: ask more about the work or explore another work. The copy makes no similarity, availability, price, or artist-intent claims. The active Chat API request and response contract remains unchanged, and recommendations still return at most one work with a stable ID and recorded public links.

## F8 stable-ID history contract

Anonymous history persists the existing message fields (`role`, `content`, optional `persona`) plus one optional presentation reference: `recommendedWorkId` on assistant messages only. The value is bounded, must exactly match an ID in the current merged Catalog at PUT time, and is checked again on GET. User-message metadata and malformed, unknown, or stale IDs are removed while message text and order remain intact.

The GET response adds an ephemeral top-level `restoredRecommendation`. The route resolves only the latest assistant message's stable ID against the current merged Catalog and rebuilds its current title, cover, type/tags, and recorded public links through the same card builder used by the active Chat API. It does not rerun recommendation selection. If the ID is invalid, deleted, or cannot be resolved, the message remains and the card is omitted. Title equality is never identity.

The stored record contains no card snapshot, title snapshot, image or URL snapshot, explanation, score, ranking, price, availability, sales status, ownership, entitlement, analytics, tracking value, account binding, or added user identifier. No history migration is required; old message-only history continues to restore normally. The storage key (`chat-history:v1:{conversationId}`), 40-message limit, 90-day TTL, stale/race guards, deletion behavior, and history-versus-entitlement boundary are unchanged.

## Browser fixture results

The providerless browser fixture used the existing local Chrome 153. Its Chat and history HTTP calls were intercepted; external requests were blocked. The F8 browser cases are client-contract fixtures, while the deterministic validator exercises the shared history resolver against `loadMergedWorksServer()` and the real merged Catalog entry.

| Gate | Result | Evidence |
| --- | --- | --- |
| F1 | PASS | Six localized intros, starters, navigation, labeled composer, keyboard focus. |
| F2 | PASS | A starter creates one user turn and reaches the existing reply path. |
| F3 | PASS | Normal assistant response renders and loading state clears. |
| F4 | PASS | One real `Fractal Hands` card; stable ID `apple-album-6797260493`, current Catalog metadata, recorded Apple Music action. |
| F5 | PASS | Rationale, Catalog detail link, and two localized follow-up prompts. |
| F6 | PASS | Retry reuses the request without duplicate user turns or stuck loading. |
| F7 | PASS | Opening failure exposes a retry and recovers to the welcome state. |
| F8-A | PASS | Stable ID restores one current Catalog card and recorded public link. |
| F8-B | PASS | Legacy message-only history restores without card, error, or migration. |
| F8-C | PASS | Unknown/title-like IDs preserve assistant text and render no card. |
| F8-D | PASS | Latest assistant ID is authoritative; older card IDs do not leak into later uncarded replies. |
| F9 | PASS | History GET/PUT 503 does not prevent Chat; history stays separate from entitlement. |
| F10 | PASS | A stale reply cannot replace a newer conversation. |

Browser suite: 13 checks passed, 0 blocked, 22 external requests blocked, 0 provider calls. The 390px mobile layout, including long reply and retry states, has no horizontal page overflow. Browser/API fixtures are local synthetic evidence, not Redis, customer, native-device, or Production evidence.

## Validation

- `pnpm typecheck`: PASS.
- Changed application TypeScript scoped ESLint: PASS, 0 errors and 0 warnings. Changed validator and both new `.mjs` scripts also pass a targeted `--no-ignore` ESLint run. ESLint emitted its existing `.eslintignore` deprecation notice.
- Root `pnpm lint`: 0 errors and the same 2 existing warnings in `src/lib/metal-print-redis.server.ts` (`qualified`, `nurture`); strict `--max-warnings=0` therefore exits 1. No new code warnings were introduced.
- Strengthening 02 validator: PASS, 16 checks, provider calls 0.
- R7-C1 UI/history validator: PASS, 24 fixtures.
- Recovery validators: R1, R7-A, R7-B, R7-C1, R7-C2, R7-D1, R7-D2, and Final Integration PASS; network and production operations 0.
- Catalog: 450 primary / 514 runtime merged works. Exhibition: 514 displayed / 0 released works missing.
- R7-C2 remains `BLOCKED_PRODUCT_CONTRACT / PAID_CONTINUATION_NOT_ACTIVATED`; Oracle remains `ORACLE_INACTIVE_BY_DESIGN`; Production parity remains `UNVERIFIED`.
- `validate-chat-sales.ts` remains `NOT_APPLICABLE_CURRENT_CHAT_PRODUCT_LANE`. Its failure is the historical `salon_work_click` analytics-event expectation; the current UI event is `salon_work_action_click`. The Product Gate does not restore or depend on the stale analytics expectation.
- `pnpm build`: `BLOCKED_EXTERNAL_FONT_DNS` because `fonts.googleapis.com` could not resolve for existing Google font imports (`Cinzel`, `EB Garamond`, `Inter`, `Noto Serif JP`). No Chat build error was observed before the external font failure.

## Operations and truth boundary

External provider calls, payments, customer-data mutations, analytics additions, deployment, and push: 0. The browser fixture blocked outbound requests and mocked the HTTP responses. A previous local diagnostic had observed the history route return 503 before Redis access because local Redis configuration was absent; it did not write customer data. This gate made no Redis or Production history read/write. The local fixtures and validators do not establish Production behavior.

## Gate disposition

F8 is resolved as `STABLE_WORK_ID_ONLY`. All Product Lane A conditions pass with the documented existing root-lint and external-font build limitations. Local commit subject: `feat: deepen museum chat journey`. No push was performed.

Next highest-impact Chat issue: establish history runtime readiness separately from this UI contract; local Redis was not configured in the earlier diagnostic, and Production history reliability remains unverified.

Next Gate: a bounded, read-only `CHAT_HISTORY_RUNTIME_READINESS` audit that confirms configured service state and failure behavior without reading or mutating customer history. Recommended next model: GPT-6 Sol, medium, if that audit spans runtime configuration and service boundaries.
