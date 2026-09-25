# 伯爵MUSIAM — Chat history runtime safety remediation

`CHAT_HISTORY_RUNTIME_READINESS = BLOCKED_ENV_METADATA_UNVERIFIED`

## State Lock and authority

- Starting HEAD: `333ca0adb4fdb1d7a29264edc6c7ec830126b49d`; branch: `recovery/musiam-clean-20260920`; tracked tree clean.
- Protected, untouched untracked path: `ops/market-learning/daily-20260925/`.
- Historical authority: `docs/AI/CHAT_HISTORY_RUNTIME_READINESS.md`, `ops/product/chat-history-runtime-readiness-20260925.json`, `docs/AI/PRODUCT_LANE_A_CHAT_STRENGTHENING_02.md`, and `ops/product/chat-strengthening-02-20260925.json`. These historical records were not changed.

## DELETE contract

Before: `queueHistoryDeletion` ignored both non-2xx responses and exceptions. `forgetConversation` then removed the browser conversation ID, cleared local history state, displayed success, and began a new conversation. The memory-off path likewise claimed success after a failed DELETE.

After: the queued DELETE requires both an HTTP success and `{ok:true}`. During the request, the memory controls are disabled and duplicate delete requests are suppressed. On failure, the existing ID, restored conversation, memory preference, and local UI remain; an alert names the failure and the action becomes retryable. No success toast or conversation reset occurs. On success, forget clears the old ID and starts one new conversation. Memory-off commits the preference only after confirmed deletion and keeps the current visible conversation. Pending local PUTs finish before DELETE; new PUTs are suppressed while deletion is pending. Chat and entitlement/payment paths are separate.

The providerless local browser fixture exercised DELETE 503 → failure alert → retry → 200 and direct 200. It verified unchanged ID/content after failure, two DELETE calls against the same synthetic ID, one reset after successful retry, no stuck loading, and memory-off retry without prematurely disabling memory. Fixture PASS is a UI contract result, not Redis deletion proof.

## Logging and payload boundary

The route now catches storage failures without passing the exception object to logging. Its only error log fields are fixed `chat_history_failed`, internal operation (`GET`, `PUT`, `DELETE`), and `storage_unavailable`. A synthetic error containing a dummy token-like value produced no raw message/object in the captured log. The route does not log message bodies or conversation IDs.

Next.js Pages API `bodyParser.sizeLimit` is explicitly `512kb` for this route. Forty messages of 2,000 Japanese characters produce roughly 241 KB of UTF-8 JSON in the fixture; this passes body parsing and is rejected for the deliberately invalid conversation ID before storage. A 601 KB synthetic body returns HTTP 413 with a 25-byte response. The installed Next.js resolver parses and enforces the body limit before invoking the route handler, so the oversize request causes zero storage operations. The existing 40-message, 2,000-character, stable work ID normalization, and 90-day TTL contracts remain.

## Deferred risks

`CONCURRENCY_RISK = ACCEPTED_DEFERRED_NON_BLOCKING`: server PUT still reads then SETs a whole record. Simultaneous tabs or devices holding the same conversation ID can overwrite a newer state with an older one. Per-page serialization does not solve cross-client races. A later Gate should define a version/CAS conflict protocol and its user-visible resolution before changing the storage schema.

`BEARER_ID_TRANSPORT_RISK = ACCEPTED_DEFERRED`: the anonymous UUID in GET/DELETE query strings remains a bearer lookup/deletion capability. The Chat page does not put the ID in its browser navigation URL, but request/proxy logs can capture it; referrer exposure depends on upstream behavior and is unverified. A later Gate should review request logging, retention, and a body/header transport or authenticated session protocol before breaking the API contract. No immediate leak was observed in this local audit.

## Vercel configuration and truth boundary

Required Production alternatives: one of `UPSTASH_REDIS_REST_URL` / `KV_REST_API_URL` and one of `UPSTASH_REDIS_REST_TOKEN` / `KV_REST_API_TOKEN`. The same is needed in Preview if history is used there. The linked project identity was previously recorded as `musiam-front`, but current Production and Preview name/target presence remains `ENV_METADATA_UNVERIFIED_SECRET_BOUNDARY`: the available Vercel connector has no names-and-targets-only listing, and the Vercel CLI is unavailable locally. No secret-bearing project/environment response was requested. No env value, credential, or customer history was read; no env mutation or Redis operation occurred.

The DELETE safety blocker, raw exception logging, and explicit request-byte gap are locally resolved. `READY_WITH_CONNECTIVITY_UNVERIFIED` requires confirmed Production env name/target presence, which this Gate cannot establish. `BLOCKED_ENV_CONFIGURATION` would assert missing variables without evidence, so the readiness verdict is `BLOCKED_ENV_METADATA_UNVERIFIED`. Redis connectivity, active Production deployment parity, and customer-history behavior remain unverified. Source inspection found no new client credential path, analytics, payment, or entitlement change.

## Validation and invariants

- Browser fixture: PASS 17/17, including F1–F10, new/legacy/invalid-ID history, 503 isolation, stale/race, DELETE failure/retry/direct success, and memory-off retry; provider calls 0, external requests blocked 25.
- Safety fixture: PASS for synthetic safe log, Japanese payload within bound, HTTP 413 oversize, and parser-before-handler storage isolation.
- Strengthening 02 deterministic: PASS 16/16. R7-C1: PASS 24/24. R7-C2: PASS 20/20 and remains `BLOCKED_PRODUCT_CONTRACT / PAID_CONTINUATION_NOT_ACTIVATED`.
- `pnpm typecheck`: PASS. Changed-file ESLint: 0 errors, 0 warnings. Root `pnpm lint`: 0 errors, existing 2 warnings in `src/lib/metal-print-redis.server.ts`; strict max-warnings exit 1.
- `pnpm build`: `BLOCKED_EXTERNAL_FONT_DNS` (`fonts.googleapis.com`, existing Cinzel, EB Garamond, Inter, Noto Serif JP imports). No failure from changed Chat files appeared before the font error.
- Active route `/api/chat-experience-v3`; current local R7-A validator confirmed Catalog 450 primary / 514 runtime, and R7-D1 confirmed Exhibition 514 / missing 0 and `ORACLE_INACTIVE_BY_DESIGN`. Production parity is not implied.
- Secret values read, env mutations, customer history reads/writes/deletes, Redis data operations, provider calls, analytics additions, payment/entitlement changes, deploys, and pushes: **0**.

Next Gate: obtain a reviewed names-and-targets-only Vercel environment listing, confirm Production alternatives and Preview presence separately, then reassess configuration readiness. No Production Redis customer-data operation is authorized by this record.
