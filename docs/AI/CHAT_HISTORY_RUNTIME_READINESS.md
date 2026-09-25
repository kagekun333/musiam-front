# 伯爵MUSIAM — Chat history runtime readiness audit

`CHAT_HISTORY_RUNTIME_READINESS = AUDITED_COMMITTED`

## State Lock and scope

- Starting HEAD: `e6b213a807d327d165db00b3d2f94fc6f3834e36`; branch: `recovery/musiam-clean-20260920`. Tracked tree was clean.
- Pre-existing untracked `ops/market-learning/daily-20260925/` was protected and untouched.
- This gate inspected current source, local deterministic and intercepted-browser behavior, and read-only deployment metadata. It changed only this document, the product record, and the audit validator.
- Customer history reads/writes/deletes, Redis data operations, secret-value reads, environment changes, provider calls, payment changes, deployment, and push: **0**.

## Storage and environment contract

`src/pages/api/chat-history.ts` calls `src/lib/chat-history.server.ts`, which uses `@upstash/redis` REST. The runtime selects `UPSTASH_REDIS_REST_URL ?? KV_REST_API_URL` and `UPSTASH_REDIS_REST_TOKEN ?? KV_REST_API_TOKEN` independently. One usable URL and one usable token are required server-side in Production, and in Preview if history is enabled there. An empty primary value does not fall back because the code uses `??`, and mixed primary/fallback credentials are possible; actual values and compatibility were not inspected. There is no `NEXT_PUBLIC_*` history credential path. Source, history responses, browser fixture, and the compiled local `.next/static` inspection exposed no credential names in client assets: `CLIENT_SECRET_EXPOSURE = 0` for inspected artifacts. This does not prove an unseen Production bundle.

| Name | Role | Local process/files | Preview | Production |
| --- | --- | --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | preferred server URL | `ABSENT` | `UNVERIFIED_SECRET_BOUNDARY` | `UNVERIFIED_SECRET_BOUNDARY` |
| `UPSTASH_REDIS_REST_TOKEN` | preferred server token | `ABSENT` | `UNVERIFIED_SECRET_BOUNDARY` | `UNVERIFIED_SECRET_BOUNDARY` |
| `KV_REST_API_URL` | fallback server URL | `ABSENT` | `UNVERIFIED_SECRET_BOUNDARY` | `UNVERIFIED_SECRET_BOUNDARY` |
| `KV_REST_API_TOKEN` | fallback server token | `ABSENT` | `UNVERIFIED_SECRET_BOUNDARY` | `UNVERIFIED_SECRET_BOUNDARY` |

The linked Vercel project is `musiam-front` (`prj_OU4nbZIO3n3ieS99cMXY7eWigHAl`, team `team_Hj7QBy2lnfpsuHXgOWKfFdZg`). The CLI was unavailable, and the available connector provided no dedicated names-and-targets-only environment listing. No project response that might contain secret values was requested. `ENV_METADATA = UNVERIFIED_DUE_TO_SECRET_BOUNDARY`; absence in the local process does not imply Production absence. The most recent listed Production-target deployment was `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX`, READY, created 2026-09-21 17:44 UTC; its Git SHA was unavailable in the listing, and active alias identity was not established. `CURRENT_LOCAL_HISTORY_CONTRACT_DEPLOYED = UNVERIFIED`. `REDIS_CONNECTIVITY = UNVERIFIED_WITHOUT_SECRET_ACCESS`.

## Data and failure semantics

- Key: exact `chat-history:v1:{conversationId}`; the API accepts a UUID, so an arbitrary Redis key or path cannot be supplied. GET reads one key; missing key returns HTTP 200 `{ok:true,history:null,restoredRecommendation:null}`. PUT reads the previous record, then SETs the whole v1 record with `EX=7,776,000` seconds. Every successful PUT refreshes the 90-day TTL and `expiresAt`; GET does not refresh it. DELETE uses `DEL` for that exact key only.
- The browser generates an anonymous UUID v4 and keeps it in localStorage. History does not require email, account, payment, or entitlement identity. The UUID is a bearer lookup capability: anyone holding it can call GET or DELETE, and GET/DELETE place it in a query string. Message text itself may contain personal information typed by the customer.
- PUT accepts at most 40 messages, each with nonblank `content` up to 2,000 characters, `role` (`user`/`assistant`), optional `persona` (`count`/`duke`), and optional `recommendedWorkId`. Zod strips unknown fields; `normalizeHistoryForCatalog` constructs the storage allowlist. No card/title/image/action URL/reason/rank/price/availability/ownership/entitlement/analytics/profile snapshot is stored. The route has no explicit HTTP body byte limit; the initial `recommendedWorkId` schema accepts unknown data before normalization. This is a `PAYLOAD_BOUNDING_GAP`, despite the eventual stored-message bounds.
- `recommendedWorkId` survives only on assistant messages as a nonempty trimmed string of at most 180 characters with an exact stable ID in the merged Canonical Catalog. PUT and GET both normalize it. GET rebuilds only the latest assistant recommendation card from the current Catalog and shared card builder; no selection rerun or title fallback. Invalid or stale ID drops the card reference and keeps the message text and order. Legacy text-only history remains valid.
- Missing Redis configuration or a thrown storage operation returns HTTP 503 `{ok:false,error:"history_unavailable"}` for GET, PUT, and DELETE. The Chat reply route remains separate and the browser can continue Chat when history is unavailable. No fake successful API response, entitlement grant, payment change, or alternate persisted history path was found.
- Browser history writes are serialized within one page and stale reply/restore guards exist. Server PUT is read-then-set with no version, compare-and-set, or lock; overlapping clients can lose an update. The API DELETE returns success only after `del` resolves, but `queueHistoryDeletion` ignores non-2xx responses and exceptions. `forgetConversation` and memory-off flows then show successful deletion/stopping messages even if storage deletion failed. The API logs a raw caught exception on failure. It does not intentionally log message text, UUID, or credentials, but arbitrary exception fields are not proven safe.

## Findings and disposition

| Severity | Finding | Required next action |
| --- | --- | --- |
| BLOCKER | DELETE failure can produce a false privacy success message. | Confirm `DELETE` success before claiming removal; retain the identifier and retry path on failure. |
| HIGH | Cross-client PUT can lose updates. | Decide and implement an atomic or versioned conflict policy. |
| HIGH | Raw storage exceptions enter logs. | Log bounded error categories and review provider error handling. |
| MEDIUM | Explicit request-byte and early work-ID bounds are absent. | Add an explicit body limit and early ID validation. |
| MEDIUM | Anonymous UUID is a bearer identifier in query strings. | Review the access/privacy threat model and request logging. |
| NOTE | Preview/Production env presence and active Production source identity are unverified. | Obtain a names-and-targets-only metadata listing and deployment identity. |

`READINESS = BLOCKED_RUNTIME_SAFETY`; `SECONDARY_CONFIGURATION_STATE = ENV_METADATA_UNVERIFIED`. This is an audit result, not permission to deploy or access Production customer history. `validate-chat-sales.ts` remains `NOT_APPLICABLE_CURRENT_CHAT_PRODUCT_LANE`; no analytics event was restored.

## Validation and truth boundary

- Strengthening 02 deterministic validator: PASS 16/16. Providerless browser fixture: PASS 13/13, including new, legacy, invalid ID, 503 isolation, and stale response; provider calls 0 and 22 external requests blocked.
- R7-C1: PASS 24/24. R7-C2: PASS 20/20. `pnpm typecheck`: PASS. Scoped lint and this audit validator are recorded in the JSON record.
- Browser fixtures use intercepted HTTP and do not prove Redis persistence or Production behavior. Environment-name presence would not prove connectivity; connectivity would not prove customer-data correctness or reliability. Local HEAD parity with Production is unverified.

Next Gate: correct the DELETE acknowledgement and define concurrency, logging, and payload safeguards; then obtain safe environment metadata and reassess. Do not run the historical Production history probe in this Gate, including its nominal read-only mode, because this audit permits zero Production Redis data operations. Recommended model: GPT-6 Sol, medium.
