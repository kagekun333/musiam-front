# 伯爵MUSIAM — Post-Recovery Development Baseline

`POST_RECOVERY_DEVELOPMENT_BASELINE = BLOCKED_EXISTING_LINT_ERRORS`

Recovery/Cleanup remains complete. The canonical repository is usable for
local investigation and typechecked work after restoring dependencies, but the
root lint gate currently fails on five pre-existing errors. The separate local
production build is blocked by Google Fonts DNS. No application repair or Chat
feature implementation was included in this baseline Gate.

## State Lock

- Starting HEAD: `4099f96a671f02fbba853a98254b4c807f72bac6`
- Branch: `recovery/musiam-clean-20260920`
- Initial working tree: clean
- `ORIGINAL_REPOSITORY = DECOMMISSIONED`; exact Original path absent
- `MUSIAM_RECOVERY_CLEANUP = COMPLETE`
- `DEPENDENCY_RESTORE_REQUIRED_BEFORE_APP_DEVELOPMENT = true` (before this Gate)

## Package and Dependency Baseline

- Authority: `pnpm-lock.yaml`; `package.json` has no `packageManager` field.
- Runtime: Node `v22.22.3`; pnpm `10.29.3`.
- Restore: `pnpm install --frozen-lockfile` completed; 519 packages were linked,
  519 were reused from the local store, and 0 were downloaded.
- Result: `DEPENDENCY_RESTORE = PASS_NO_LOCKFILE_DRIFT`.
- `package.json` drift: 0; lockfile drift: 0; tracked application/config drift: 0.
- pnpm skipped dependency build scripts per repository policy; no approval or
  install-script policy change was made.

## Validation Results

| Gate | Result | Evidence |
| --- | --- | --- |
| Root typecheck | PASS | `pnpm run typecheck` |
| Official root lint | FAIL, existing issues | `pnpm run lint`: 5 errors / 5 warnings across the preserved R3 draft and `src/app/vip-metal-print/page.tsx`; details are in the machine record. |
| R1 Metal Print webhook boundary | PASS | `validate-metal-print-webhook-routing.ts`; offline, no Stripe call |
| R7-A Catalog | PASS | 450 primary, 514 runtime merged, 21 adjacent imports |
| R7-B Chat Core | PASS | 15 fixtures; provider/network calls 0 |
| R7-C1 Chat UI/History | PASS | 22 fixtures |
| R7-C2 paid continuation | PASS | 20 fail-closed fixtures; blocked state retained |
| R7-D1 Exhibition/Oracle | PASS | 514 displayed, 0 missing; Oracle inactive |
| R7-D2 secondary surfaces | PASS | 40 checks |
| Final Integration | PASS | 45 checks; production parity remains unverified |
| C4-G deletion validator | NOT APPLICABLE after restore | Its recursive no-symlink precondition counts the 1,507 pnpm dependency links; dependency restoration is the authorized next Gate after C4-G. This does not contradict the recorded C4-G deletion closure. |
| Local production build | BLOCKED_EXTERNAL_FONT_DNS | `next/font` could not resolve `fonts.googleapis.com` for Cinzel, EB Garamond, Inter, and Noto Serif JP. No font/configuration workaround was applied. |

Fixed-HEAD Recovery/RC validators are historical and are not rewritten or run
against this later baseline HEAD. Validators that require the deleted Original
are `NOT_APPLICABLE_POST_DELETION`. The current local validator inventory is in
the machine record.

## Current Product Invariants

- Catalog: 450 primary works; 514 runtime merged works; stable-ID identity;
  title-only equality does not merge works.
- Exhibition: canonical projection; 514 displayed; missing released works 0.
- Chat active route: `/api/chat-experience-v3`; history route:
  `/api/chat-history`; anonymous UUID-scoped history with 90-day TTL and a
  delete control. `history != entitlement`.
- Chat recommendation: deterministic one-work selection from
  `loadMergedWorksServer`, stable work ID cards, public links only.
- Paid continuation: `R7-C2 = BLOCKED_PRODUCT_CONTRACT` and
  `PAID_CONTINUATION_NOT_ACTIVATED`; the 20-turn cap remains an abuse/API-cost
  guard.
- Oracle: `ORACLE_INACTIVE_BY_DESIGN`.

## 伯爵Chat Architecture Handoff

- **UI:** `src/pages/chat.tsx`; sends to `/api/chat-experience-v3`, restores
  history on the same browser, and provides memory opt-out/deletion.
- **History store:** `src/pages/api/chat-history.ts` and
  `src/lib/chat-history.server.ts`; Upstash Redis when configured, UUID key,
  90-day expiry, maximum 40 stored messages. Runtime Redis configuration was
  not inspected and remains unknown.
- **Recommendation/catalog:** route orchestration calls
  `src/lib/chat-recommendation-core.ts` and canonical
  `src/lib/loadMergedWorksServer.ts`; recommendation is one work with a stable
  identity and recorded public actions.
- **LLM routing:** `src/lib/llm-router.ts`; code defines OpenRouter,
  Anthropic, Groq, and LMStudio fallback chains. Actual configured provider,
  credentials, and production behavior were not inspected or exercised.
- **Monetization:** paid continuation remains blocked; no entitlement or
  continuation purchase flow is active.
- **Analytics/privacy:** the UI has optional PostHog capture and a first-party
  bounded chat-interest event endpoint. Runtime collection availability is
  unknown. The post-RC Privacy/Analytics/Funnel adoption decision remains a
  separate gate; provider/data writes were not performed here.
- **Likely follow-up debt:** the active API combines request interpretation,
  recommendation, sales policy, and LLM orchestration; analytics is split
  between browser capture and the first-party event route; provider policy and
  privacy adoption remain unrevised. These are inventory observations, not
  approved implementation scope.

## Operations and Next Gate

- Provider / payment / customer-data operations: 0 / 0 / 0.
- Deploy: 0. Push: 0. Preview and production remain untouched.
- Baseline validator: `node scripts/validate-post-recovery-development-baseline.mjs`.
- `git diff --check`: PASS. Application, package manifest, and lockfile drift:
  0.
- Next product lane: `PRODUCT-LANE-A 伯爵CHAT STRENGTHENING`, pending a scoped
  lint remediation Gate. This task did not start Chat implementation.
- Recommended next model: GPT-6 Luna for the narrow lint cleanup; re-run root
  lint and build afterward. Build remains dependent on font DNS availability.

## Truth Boundary

These results establish only local repository/dependency and validator state.
They do not establish production parity, deployed behavior, provider
availability, payment activation, customer use, fulfillment, or demand.
