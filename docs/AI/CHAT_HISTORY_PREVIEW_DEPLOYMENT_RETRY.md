# 伯爵MUSIAM — Chat history Preview deployment retry

`CHAT_HISTORY_PREVIEW_DEPLOYMENT = PASS_COMMITTED`

The user directly approved one Preview upload of the exact manifest `c86dad16b2fdac9a11a08bf4daa3f0680037baa9a63e19f10f152e00f95d5284` to Vercel project `musiam-front` (`prj_OU4nbZIO3n3ieS99cMXY7eWigHAl`, team `team_Hj7QBy2lnfpsuHXgOWKfFdZg`). No Production deployment, promotion, alias change, environment mutation, customer-data Redis operation, normal Chat POST, provider request, payment/entitlement operation, or push was authorized or performed.

## State Lock and deploy input

- Starting HEAD: `b92a3c43e223e08dcd76fcb5869dc3244f460714`; branch: `recovery/musiam-clean-20260920`; tracked tree clean.
- The pre-existing untracked `ops/market-learning/daily-20260925/` remained protected, unmodified, unstaged, and absent as file payload from the deploy input. Its sole collector entry was zero-byte directory metadata without a content ID.
- The same Vercel CLI 59.23.2 offline collector was run twice before the upload, including a final re-lock after local validation. Both matched the approved manifest: 3,208 entries, 3,200 regular files, 8 directory entries, 214,053,118 bytes, SHA-256 `c86dad16b2fdac9a11a08bf4daa3f0680037baa9a63e19f10f152e00f95d5284`.
- Unexpected untracked files, protected descendant files, `.env*` files, secret/private files, Chat fixtures, and governance/audit-only material in the input: **0 each**. Vercel build reported downloading 3,208 deployment files.

## Local validation and Production BEFORE

The first `pnpm typecheck` used the workspace fallback pnpm 11 and tried dependency-store repair; it did not run the script. Direct `tsc --noEmit` passed, and the existing cached pnpm 10 CLI subsequently ran the repository's `typecheck` script successfully. The task-generated `.pnpm-store/` was removed after exact-path metadata checks; it was absent at final deploy-input re-lock. No dependency install or source change was made.

Strengthening 02 passed 16/16; history runtime safety 28/28; environment metadata 12/12; Preview readiness 9/9; deploy-input remediation 11/11; R7-C1 24/24; R7-C2 20/20. Catalog remained 450 primary / 514 merged; Exhibition 514 displayed / 0 missing. Root ESLint had 0 errors and only the 2 known warnings at `src/lib/metal-print-redis.server.ts:564`, with 0 new warnings. `git diff --check` passed.

Read-only Vercel metadata before deployment showed Production `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX`, `READY`, target `production`. Its aliases were `www.hakusyaku.xyz`, `musiam-front.vercel.app`, `hakusyaku.xyz`, and `musiam-front-hakusyakus-projects.vercel.app`. A direct read-only lookup of `www.hakusyaku.xyz` resolved to that same deployment.

## One Preview deployment

- Deploy command: existing Vercel CLI 59.23.2, `vercel deploy --yes`, once; no `--prod` or production alias option.
- ID: `dpl_Bc9YHMTXaqgV9qnxHbrmLZRW16pT`.
- URL: `https://musiam-front-e2nbajn7i-hakusyakus-projects.vercel.app`.
- Created: `2026-09-25T21:06:38.553Z`; READY: `2026-09-25T21:09:04.114Z`; build duration from `buildingAt` to READY: 144,236 ms.
- Metadata: `READY`; provider target field `null` (Preview), aliases `[]`, source `cli`, framework `nextjs`, build region `iad1`. Build detected Next.js `15.5.12`; provider deployment metadata did not expose the Node runtime version, so that version remains unverified.
- Vercel Git metadata reports branch `recovery/musiam-clean-20260920` and SHA `b92a3c43e223e08dcd76fcb5869dc3244f460714`, matching the starting HEAD. The exact pre-upload input manifest independently anchors provenance.

## Customer-data-free smoke

Only authenticated `vercel curl` HTTP requests were used. Browser JavaScript and `/chat` hydration were not executed. Source review showed `/` uses the local catalog path, while the history and Chat API requests below reject before storage or provider calls.

| Request | Result | Boundary |
| --- | --- | --- |
| `GET /` | 200 HTML, no redirect | No Redis/provider request in source flow |
| `GET /chat` | 200 HTML, no redirect | No browser hydration |
| Invalid-ID history GET | 400 `invalid_conversation_id` | Before `readChatHistory` |
| Invalid-ID history DELETE | 400 `invalid_conversation_id` | Before `deleteChatHistory` |
| Invalid-ID history PUT | 400 `invalid_body` | Before `writeChatHistory` |
| 614,416-byte synthetic history PUT | 413, 25-byte response | Next.js 512 KiB body parser, before handler; raw body not reflected |
| Unsupported Chat GET | 405 `method_not_allowed` | Before provider branch |
| Invalid-body Chat POST | 400 `invalid_body` | Before provider branch |

Valid history GET/PUT/DELETE: **0/0/0**. Normal Chat POST: **0**. The source guard order and bounded responses imply zero Redis/customer-data reads, writes, deletes, synthetic records, and LLM provider calls from these smoke requests. These are flow-derived counts, not Redis or provider-side telemetry. Payment/entitlement operations, analytics additions, environment mutations, secret-value reads/prints/persistence, and pushes: **0**.

Deployment-scoped Vercel runtime log counts from creation through smoke returned no `error`/`fatal` entries and no 5xx entries. The query used grouped counts only, with no customer-message, history-payload, or secret search.

## Production AFTER and truth boundary

Read-only metadata after smoke again showed Production `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX`, `READY`, target `production`, the same four aliases, and `www.hakusyaku.xyz` resolving to the same deployment. Production mutation: **0**. The new Preview has no production alias.

`CHAT_HISTORY_RUNTIME_READINESS = READY_WITH_CONNECTIVITY_UNVERIFIED` remains unchanged. `CURRENT_LOCAL_HISTORY_CONTRACT_PREVIEW_DEPLOYED = VERIFIED` by Vercel Git SHA, exact manifest, READY build, and bounded HTTP smoke. `CURRENT_LOCAL_HISTORY_CONTRACT_DEPLOYED_TO_PRODUCTION = false`. Redis connectivity and real customer-history behavior remain untested. Preview PASS does not authorize Production promotion or a valid Redis request.

The retry record and validator were created after the single upload; they were not part of the approved deployed manifest. Any later deployment needs a new deploy-input re-lock. The user separately approved a local commit of only these three retry artifacts with the normal Husky and commitlint hook; no push was made. The next Gate requires separate human authority for Production or Redis connectivity work.
