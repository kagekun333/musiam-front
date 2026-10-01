# MUSIAM GROWTH ANALYTICS SPINE V1

Status: PASS_LOCAL candidate
Lane: analytics-spine
Authority: MUSIAM_MASTER_STRATEGY_LOCK_2026-09-30.md

## Purpose

Create a privacy-bounded server-side measurement spine for Count Chat without changing its conversational behavior.

The V1 funnel distinguishes observed presentation from real downstream user action.

Current Count Chat server observations:

- chat_start — opening response
- chat_first_request — first user request receives a successful response
- recommendation_presented — work card shown
- work_links_presented — one or more real public work links shown
- action_link_presented — explicit open/listen/read/buy link response
- product_interest_bridge — explore/offer/decline bridge shown
- product_cta_presented — product CTA rendered

Reserved taxonomy names such as visit, work_action, quote, checkout, paid and repeat are not claimed merely because Count Chat presented something. They require later evidence from the appropriate surface/payment system.

## Privacy boundary

The event schema deliberately has no arbitrary strings.

It does not store:

- user message content
- assistant message content
- names
- email
- address
- IP address
- session/conversation ID
- work ID
- work title
- product ID
- URLs
- health or other personal content

Properties are restricted to small enums and bounded counts:

- actionKind
- bridgeAction
- linkCount

eventId and requestId are server-generated UUIDs and are not visitor identities.

## Persistence

V1 reuses existing Upstash/KV infrastructure.

Storage is disabled unless `MUSIAM_ANALYTICS_SPINE_ENABLED=1`.

No new paid analytics vendor is introduced.

Redis namespace:

`growth:v1:{production|preview|development|local}:count-chat:YYYY-MM-DD`

Characteristics:

- 200ms request timeout
- environment-isolated namespace (Preview never shares the Production key)
- bounded 100,000 rows/day per environment
- absolute expiry after approximately 30 days
- failure-isolated from Count Chat response
- no request/response payload logged on failure

## Semantics

`recommendation_presented` means the server returned a card. It does not mean the visitor clicked it.

`work_links_presented` means real links were rendered. It does not mean a listen/open occurred.

`product_cta_presented` means a CTA was shown. It does not mean checkout, payment, or purchase.

The later analytics spine must connect real work actions, checkout and settled payment only where authoritative evidence exists.

## Integration

All successful Count Chat HTTP 200 response paths flow through one `respond()` helper.

That helper:

1. projects the safe event set;
2. attempts bounded persistence;
3. returns the original payload unchanged.

400/429/error paths are not treated as successful funnel events.

## Validation

Run:

`./node_modules/.bin/tsx scripts/analytics/validate-spine.ts`

The validator checks:

- exact event sequence from a representative response
- first-request/opening semantics
- strict schema
- PII/string leakage exclusion
- event/request UUID behavior
- link count bounds
- storage disabled during test
- store failure isolation
- original payload immutability
- successful API paths routed through the observer

V1 is instrumentation only. It does not claim funnel performance yet.

## Foundation repair candidate (2026-10-01)

This section describes isolated candidate code, not current deployed behavior.

The client sends `{id, createdAt}` once per logical request. Network retransmission of the same serialized request and the explicit retry button retain both fields. A new chat request receives a new UUID even when its text matches. Opening requests also carry delivery metadata. No automatic retry is introduced, and reload/cross-client recovery is not supported. Missing, invalid, expired or future delivery metadata skips telemetry without invalidating chat. No raw delivery UUID, content, personal/session/conversation identity is persisted. Event identity derives from the random delivery UUID, immutable timestamp and event name; crossing midnight during a retry retains the original namespace day.

The candidate uses one authoritative Redis event row per derived event ID: `growth:v1:{environment:count-chat:YYYY-MM-DD}:event:UUID`. `SET NX EXAT` writes the event and its absolute expiry together. There is no independent dedupe marker. A daily budget key shares the hash slot and bounds accepted rows to 100,000. Lua checks key types and existing rows before writes. Redis scripting isolates concurrent callers but does not roll back command effects: failure after a budget increment can consume a capacity slot, while failure after a row SET leaves a complete, expiring row that a retry recognizes. Both the budget and event expire at the delivery day's midnight plus 31 days (about 30–31 days retention). Readback uses the known event key; legacy daily-list readback is not compatible with this candidate layout.

Production smoke requests possessing the existing private `CRON_SECRET` bearer credential are labeled `synthetic_test`, using the existing production verification credential solely for telemetry classification. No credential is sent by the browser or stored in Analytics; no chat/payment permission is granted by the label. Missing/wrong credentials cannot assert human or payment authority. Non-production is synthetic; recognized User-Agent bot patterns are heuristically bot; every other Production request remains unknown. Raw User-Agent and Authorization headers are not stored. `human_verified` is reserved and never emitted. Bot/unknown detection remains incomplete, so downstream KPI extraction must exclude synthetic/bot and keep unknown distinct from verified humans.

Behavior contracts cover byte-identical transport replay across midnight, fresh requests, omitted/invalid metadata, privacy, authenticated test classification, retention plans, partial batch retries, corrupted/wrong-type keys and injected failures against an explicitly labeled in-memory contract model. That model does not execute Lua. Actual Redis wrong-type/command-failure/expiry tests and hosted Preview readback remain UNRUN because no permitted Redis test runtime was available. Do not call this gate PASS on the strength of model tests.
