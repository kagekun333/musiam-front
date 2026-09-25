# 伯爵MUSIAM — Chat history Preview readiness and deployment parity

`CHAT_HISTORY_PREVIEW_READINESS = READY_FOR_HUMAN_PREVIEW_DEPLOYMENT_GATE`

This is a local source and read-only deployment-metadata audit. No deployment, customer-data operation, provider call, environment mutation, or push was performed. Preview build and runtime behavior of the current HEAD remain unverified.

## State Lock

- Starting HEAD: `f69005533dac01e9d6fbd06bc1c630cdf34b565f`; branch: `recovery/musiam-clean-20260920`.
- Tracked worktree was clean. The existing untracked `ops/market-learning/daily-20260925/` was not inspected or changed.
- Prior gates remain `PRODUCT_LANE_A_CHAT_STRENGTHENING_01 = PASS_COMMITTED`, `PRODUCT_LANE_A_CHAT_STRENGTHENING_02 = PASS_COMMITTED`, `CHAT_HISTORY_RUNTIME_SAFETY_REMEDIATION` locally complete, and `CHAT_HISTORY_ENV_METADATA_VERIFICATION = COMPLETE_COMMITTED`. Runtime readiness remains `READY_WITH_CONNECTIVITY_UNVERIFIED`.

## Current deployment inventory (read-only Vercel metadata)

| Target | Deployment | State | Created UTC | Source and Git | URL / aliases |
| --- | --- | --- | --- | --- | --- |
| Latest Preview | `dpl_9eB9h2AgwwyUZ5k7nmLEBkfZNKaT` | READY; target null | 2026-09-22 17:43:12 | CLI; branch `recovery/musiam-clean-20260920`; SHA `cad8c6c473612d12286868e541e4624545d1250b` | `musiam-front-i505jvayn-hakusyakus-projects.vercel.app`; aliases [] |
| Current Production | `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX` | READY; target production | 2026-09-21 17:44:16 | CLI; Git metadata empty, SHA unknown | `www.hakusyaku.xyz`, `hakusyaku.xyz`, `musiam-front.vercel.app`, `musiam-front-hakusyakus-projects.vercel.app` |

The Preview SHA is an ancestor of the starting HEAD. The local branch has 25 later commits, with 74 added and 14 modified files. These cover Recovery cleanup and decommission records, dependency/baseline and lint remediation, Chat Strengthening 01/02, stable `recommendedWorkId` history contract, history runtime safety, and environment metadata records. The modified application files include `src/pages/chat.tsx`, `src/pages/api/chat-experience-v3.ts`, `src/pages/api/chat-history.ts`, `src/lib/chat-history.server.ts`, and Chat card/normalization modules. Navigation and VIP metal-print files also changed. `CURRENT_LOCAL_HISTORY_CONTRACT_DEPLOYED_TO_PREVIEW = false`; `PREVIEW_PARITY = STALE_CURRENT_LOCAL_NOT_DEPLOYED`.

Production provenance is the historical `PRODUCTION_SOURCE_PROVENANCE = EXACT_REPRODUCIBLE_SOURCE` record in `docs/AI/PRODUCTION_SOURCE_PROVENANCE.md` and `ops/recovery/production-source-provenance-20260921.json`: 3,150 path/mode/content-ID matches to a surviving source artifact at that Gate, with no original Git SHA or cwd proven. That artifact is unavailable at its recorded `/private/tmp` path in this session, so the 3,150-path comparison was not repeated. The unchanged current Production deployment predates the September 25 Chat changes. `CURRENT_LOCAL_HISTORY_CONTRACT_DEPLOYED_TO_PRODUCTION = false`; `PRODUCTION_PARITY = STALE_CURRENT_LOCAL_NOT_DEPLOYED` for this Chat/history contract. The older overall `PRODUCTION_PARITY = PARTIAL` retains its separate historical meaning; a complete local-versus-Production source diff was not established here.

## Deploy input and secret boundary

The existing `.vercelignore` already excludes `.env`, `.env.*`, local build artifacts, `_archive/`, and large output directories. A safety gap was found: it did not exclude the protected untracked market-learning directory or tracked Recovery/Product audit records and test-only Chat fixtures. This Gate added only those exact exclusions to `.vercelignore`; build-time `ops/` inputs used by application code remain included. Git ignore-pattern checks confirm the named paths match the new rules, but an actual Vercel CLI dry-run input manifest is still a required pre-deploy check in the next Gate. No private-preservation payload was opened. No local `.env` file was found at repository depth 2; `.env.example` is tracked. No client Redis credential reference was found in the changed Chat client path. Test fixtures do not create a public route or production fixture flag.

The prior human-reviewed Vercel Dashboard report shows `KV_REST_API_URL` and `KV_REST_API_TOKEN` present for All Environments, including Preview and Production. Both contracts are `PRESENT_METADATA_ONLY`. No secret value was read, and effective Redis connectivity is unknown. The source selects `UPSTASH_REDIS_REST_*` aliases before the KV names with nullish coalescing; the unreviewed primary aliases and runtime values remain outside this evidence.

## Customer-data-free Preview validation design

After an authorized single Preview deployment, use the Preview URL only. Safe HTTP requests are `GET /` for HTML, static `/_next/static/...` assets, and `GET /chat` for initial HTML **without executing page JavaScript**. Normal interactive `/chat` load is unsafe because client initialization sends history GET and a Chat POST; browser tests must intercept those API requests and block external traffic. A synthetic recommendation card can be checked with the existing local providerless browser fixture; no live provider request is needed.

Pre-storage route checks are `GET /api/chat-history?conversationId=invalid`, `DELETE /api/chat-history?conversationId=invalid`, `PUT /api/chat-history` with an invalid body or invalid ID and bounded body, `POST /api/chat-history` (405), and an oversized PUT (413 from Next body parser before the handler). `GET /api/chat-experience-v3` is 405; malformed `POST /api/chat-experience-v3` is 400 before the LLM branch. These are source-derived, customer-data-free probes, subject to normal in-memory rate limiting. Use only the bounded malformed requests; do not send a valid UUID merely because it is random.

Valid history GET/PUT/DELETE are `REDIS_DATA_OPERATION_REQUIRED` and prohibited in this Gate and the proposed customer-data-free Preview checks. Valid Chat POST may invoke OpenRouter, Anthropic, Groq, or LM Studio through `llm-router`; its deterministic branches do not make every valid POST providerless. No valid Chat POST is authorized in this plan. Build/runtime logs, if needed after deployment, must be limited to build failures or bounded errors without customer messages.

## Local validation and verdict

- Typecheck: PASS. Scoped Chat lint: PASS, 0 errors/warnings. Root lint: FAIL solely on two existing unused-variable warnings in `src/lib/metal-print-redis.server.ts:564`; no new Chat lint issue.
- Strengthening 02 validator: PASS 16/16. Browser fixture: PASS 17/17, provider calls 0, external requests blocked 25. History safety HTTP fixture: PASS, provider/customer-data calls 0.
- R7-C1: PASS 24/24; R7-C2: PASS 20/20; R7-A catalog: PASS, 450 primary/514 merged; R7-D1 Exhibition: PASS, 514 displayed/0 missing, Oracle inactive.
- Existing history safety and env metadata validators were run before commit and stopped on their historical dirty-worktree allowlist when `.vercelignore` was edited. Re-run after this Gate commit. Their source/record assertions were not treated as failed behavior.
- Local `pnpm build`: FAIL at `fonts.googleapis.com` DNS resolution for four `next/font` families. This is the known local network boundary, not evidence of a source regression or of a successful Vercel build. `git diff --check`: PASS.

With the deploy-input exclusions applied, source and fixture checks support a Preview candidate. The next Human Gate is `CHAT_HISTORY_PREVIEW_DEPLOYMENT`: authorize one Preview deployment only, no Production alias or promotion, no environment change, no customer-data Redis operation, no payment, and no paid provider request. Before upload, verify the actual Vercel dry-run input list excludes the named paths. After upload, verify READY/build and use only the customer-data-free checks above. Any dry-run inclusion, build failure, or new regression stops the Gate. No deployment is performed by this audit.
