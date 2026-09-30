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
