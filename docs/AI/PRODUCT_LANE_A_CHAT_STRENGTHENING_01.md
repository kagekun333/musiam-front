# MUSIAM Product Lane A — Chat Strengthening 01

`PRODUCT_LANE_A_CHAT_STRENGTHENING_01 = VALIDATION_PENDING`

## State Lock

- Starting HEAD: `0bc815e603c258f0257ebda87a3bf1181637f9f2`
- Branch: `recovery/musiam-clean-20260920`
- Initial tracked tree: clean.
- Protected pre-existing untracked data: `ops/market-learning/daily-20260925/`.
- Recovery/Cleanup: complete. Post-Recovery Development Baseline: ready.
- Product scope: `/chat` presentation and interaction only.

## Current experience audit

The direct `/chat` entry showed the Count's time-based greeting and prompt chips, but did not explain that this is a MUSIAM work-discovery conversation or distinguish the conversational AI from the artist ABI伯爵. Prompt chips had no short instruction explaining that visitors could choose one or type freely. If the opening request failed, the page showed a generic error without a recovery action. A reply also waited at least 3.45 seconds before display, then typed at 80 ms per character. On narrow screens the composer stacked the send button below the text area, increasing the space it occupied.

Existing positive foundations retained: recommendation reasons are tied to the current request, cards use stable catalog IDs, URLs are accepted only when recorded and safe, retries retain the user message, history is anonymous and separate from entitlement, and the API opening is deterministic.

## Improvement candidates and decision

| Priority | Problem and impact | Business impact | Complexity / regression risk | Decision |
| --- | --- | --- | --- | --- |
| 1 | First-time visitors lack a clear account of who the Count is and how the chat helps them discover MUSIAM works. | Better orientation can help visitors reach relevant works; no conversion claim is made. | Low / low | Implement a localized first-entry introduction that distinguishes AI Count from artist ABI伯爵. |
| 2 | Visitors see starter prompts without guidance on how to use them. | Lower friction to start a conversation and discuss a work. | Low / low | Add localized starter instructions and clarify free text is welcome. |
| 3 | Opening API failure has no visible retry action. | A recoverable first-load error can otherwise end the visit. | Low / low | Add opening retry while preserving existing reply retry behavior. |
| 4 | Fixed reply pacing delays every answer, and typewriter animation takes a long time on longer text. | Faster feedback supports conversational continuation. | Low / low | Reduce the post-read delay to 900 ms and typewriter interval to 22 ms; reduced-motion behavior remains honored. |
| 5 | Mobile composer stacks the send control beneath the message field and the conversation has generous padding. | Easier message entry can support continued use on phones. | Low / low | Keep composer controls side by side and tighten mobile spacing while preserving touch targets. |
| 6 | Recommendation cards could offer additional catalog facts. | Could deepen work exploration. | Medium / medium | Defer: current deterministic reason and recorded actions are sufficient; avoid expanding factual claims/API contract in this Gate. |
| 7 | Conversation continuity could have a more prominent restored marker. | Helps returning visitors understand resumed context. | Low / medium | Defer: existing memory status already reports restoration; avoid duplicating it. |

## Implementation

- Added localized first-entry explanation for all six supported languages.
- Clarified how to begin with prompt suggestions and free text.
- Added a retry action for a failed opening request; preserved message retry.
- Reduced reply pacing and typewriter interval; reduced-motion preference is still honored.
- Improved mobile composer layout, spacing, and recommendation cover loading.
- Added an accessible label to the input and a status role to the typing indicator.

## Contract and truth boundaries

- Active route remains `/api/chat-experience-v3`; request/response shape is unchanged.
- Recommendation selection, stable `workId`, recorded public links, reason generation, and single-card limit are unchanged.
- History storage, restore, deletion, and stale/race guards are unchanged. `history != entitlement`.
- No payment, checkout, entitlement, paid continuation, or delivery changes.
- No analytics/tracking additions or storage changes.
- No provider, payment, or customer-data operations; no deploy or push.
- R7-C2 stays `BLOCKED_PRODUCT_CONTRACT` / `PAID_CONTINUATION_NOT_ACTIVATED`; Oracle remains inactive.

## Validation and outcome

| Check | Result |
| --- | --- |
| Typecheck | PASS |
| Official root lint | Before: 0 errors / 2 warnings; after: 0 errors / the same 2 existing warnings. `--max-warnings=0` exits 1. The Chat page, shared Nav, and new validator pass scoped lint. |
| R1, R7-A, R7-B, R7-C1, R7-C2, R7-D1, R7-D2 | PASS; provider/network calls 0. |
| Chat sales legacy validator | FAIL: it expects `salon_work_click`, while the unchanged current surface uses `salon_work_action_click`. Not in the required Recovery set and unrelated to edited files. |
| Catalog / Exhibition | 450 primary / 514 runtime. Exhibition displays 514, missing 0. |
| R7-C2 / Oracle | `BLOCKED_PRODUCT_CONTRACT` / `PAID_CONTINUATION_NOT_ACTIVATED`; `ORACLE_INACTIVE_BY_DESIGN`. |
| Build | `BLOCKED_EXTERNAL_FONT_DNS`: `fonts.googleapis.com` failed for the existing next/font imports. |
| Browser UI | Desktop and 390px mobile first-entry, starter, reply, and composer visuals checked locally. Mobile nav stays on one line with horizontally scrollable links. Recommendation/error/retry/history restore were not browser-mocked. |
| New validator | PASS, 13 checks; provider calls 0. |

The local browser preview issued one history GET and one opening-message PUT from the existing page lifecycle. Both returned 503 because Upstash Redis is not configured; the handler failed before any Redis read or write. The PUT contained only the generated opening greeting and no visitor message. No provider call or customer-data mutation occurred. UI memory correctly reported unavailable.

The scripted browser fixture run could not start because Puppeteer Chrome 141 is not installed in this workspace. The production build remained blocked by DNS; no font/configuration workaround was applied. The successful initial-state visual check used the local deterministic opening path, not a provider response. These checks do not establish Production behavior or native/device quality.

`PRODUCT_LANE_A_CHAT_STRENGTHENING_01 = PASS_COMMITTED`

Next Gate: review the committed Chat experience and decide whether the next product pass should focus on deeper catalog discovery or a verified browser fixture harness. No commerce, analytics, or provider-routing integration is authorized by this record.
