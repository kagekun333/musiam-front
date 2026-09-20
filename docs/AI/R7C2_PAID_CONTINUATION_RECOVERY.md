# R7-C2 — 15-turn / Paid Continuation / Entitlement Recovery

`R7C2_STATUS = BLOCKED_PRODUCT_CONTRACT`。

`PAID_CONTINUATION_NOT_ACTIVATED`。active `/chat` と
`/api/chat-experience-v3` に15-turn paywall、Checkout、payment verification、
entitlement、resumeを接続していない。従って、未完成の購入経路によって利用者を
15ターンで締め出すことはない。real Stripe、Redis、provider、network callは0である。

## Current State

- Active `/api/chat-experience-v3` has `HARD_MAX_USER_TURNS = 20`. It is a
  transcript-derived long-conversation / abuse-and-cost guard: over the limit it returns
  `longClose`, not a purchase state, Checkout link, credit, or entitlement.
- The active route has no Redis access reservation, payment verification, Checkout call,
  entitlement, or resume hook. Active `/chat` has no paid-continuation UI state.
- R7-C1 history uses a browser UUID only to persist, restore, and delete conversation
  history. It is not an access identity. Deleting history therefore cannot reset an
  access counter because no such active counter exists.

## Historical Candidate

Read-only old dirty source contains `src/lib/count-access.server.ts` and a matching v3
route hook. The candidate has a 15-turn Redis Lua reservation, an HttpOnly signed cookie,
per-IP/day throttles, and a `credits:<identity>` key. Its potentially reusable concepts
are server-side identity and atomic reservation; it is not copied into this recovery.

It is `IMPLEMENTED_BUT_DISCONNECTED` / `UNSAFE` for this Unit: the gate is connected
before a product, price, Checkout, verification, entitlement issuance, and resume
contract exist. Its reply says both that a 500-yen purchase will resume the Chat and that
the product and confirmation are still being prepared. That is a dead-end paywall. The
candidate also treats Redis credentials as an HMAC secret and has no reservation id to
make duplicate provider retries idempotent.

## Product Authority

`PRODUCT_CONTRACT_NOT_CANONICAL`.

The clean repository has canonical-looking definitions only for existing digital goods
and separately scoped Metal Print offers. None defines a Chat continuation product with a
product ID, public name/description, price/currency, Stripe product/price binding, and a
delivery/entitlement meaning. Existing digital goods cannot be silently repurposed as
Chat credits: their delivery assets and order semantics are distinct.

Historical 500円 is a candidate, not a canonical price or offer. No 500-yen value was
added or preserved as an active price.

## Turn Policy

No 15-free-turn policy is active. If reopened after an owner-defined product contract,
the count must mean one **successfully committed assistant response** per user turn;
failed provider calls, stale responses, duplicate sends, retries, history reloads, and
history deletion must not consume or restore access. Client transcript count must not be
authoritative.

## Access Identity

The historical signed anonymous cookie is `PARTIAL`: it is distinct from history UUID,
but it has no independently managed signing secret, expiry/rotation design, or purchase
binding. A future anonymous access identity must be server-verified, expiry-aware,
rotation-compatible, and separate from both a client conversation UUID and the payment
provider's identifiers. No login system was added.

## Atomic Enforcement

The historical Lua reservation is `PARTIAL`: its counter is atomic for the shown Redis
keys, but there is no durable reservation id, completion/rollback model, or idempotent
link to a successfully committed assistant response. It cannot be reused unchanged. No
production Redis or local Redis fixture was used.

## Checkout Contract

`MISSING` for paid continuation. A future Checkout Session may be created only after the
canonical contract identifies the exact product and price. It must bind a server-created
order/access identity and preserve product identity, Stripe price/product identity, and
idempotency identifiers in server-verifiable metadata. No new Stripe integration or
Price/Product was created.

## Payment Verification

`MISSING` for paid continuation. Existing digital-order and Metal Print payment paths
are product-specific and must not be repurposed. A future continuation flow must verify
on the server that a completed paid Checkout/PaymentIntent, exact product/price, and
bound access identity all agree; a redirect or success URL is insufficient.

## Entitlement

`MISSING`. There is no canonical definition of what a purchase grants: number of turns,
duration, consumption rule, source order/payment, or revocation. A future entitlement
must have a unique identity, source payment/order, grant time, remaining/consumed state,
idempotency, and revoked/refunded state. History must remain independent.

## Resume

`MISSING`. Resume cannot be enabled until verification succeeds and a valid server-side
entitlement is available. A deleted/new conversation history may not erase an
entitlement, and retained history may not grant paid access.

## Refund / Revocation

`MISSING` for this product. Metal Print refund logic is explicitly out of scope and not
reused. The future product contract must state whether unconsumed entitlement is revoked
after a verified refund and how partially consumed credit is treated.

## Component Classification

|Component|Status|Decision|
|---|---|---|
|free-turn policy|PARTIAL|15-turn candidate only; no active policy|
|server-side counter|IMPLEMENTED_BUT_DISCONNECTED|old Redis candidate only|
|atomic enforcement|PARTIAL|Lua increments atomically but lacks response/idempotency lifecycle|
|anonymous identity|PARTIAL|old signed cookie is not a purchase identity|
|history independence|IMPLEMENTED_AND_VALID|R7-C1 UUID/history is separate and remains so|
|product definition / price authority|MISSING|no Chat continuation product or canonical price|
|Checkout creation|MISSING|no continuation route|
|PaymentIntent / Checkout binding|MISSING|no continuation metadata contract|
|payment verification|MISSING|no continuation verifier|
|entitlement creation / consumption|MISSING|old `credits` counter is not entitlement issuance|
|Chat resume|MISSING|no verified entitlement hook|
|retry / idempotency|PARTIAL|old counter has no response/payment reservation lifecycle|
|refund / revocation|MISSING|no product-specific rule|
|delivery artifact|MISSING|no continuation delivery meaning|
|telemetry|OBSOLETE|sales telemetry is not payment or entitlement evidence|

## Activation Decision

`PAID_CONTINUATION_NOT_ACTIVATED`. The all-or-nothing activation preconditions are not
met, so the active 20-turn safety cap remains unchanged and no 15-turn purchase stop is
introduced.

## Validation

- `node --import tsx scripts/validate-r7c2-paid-continuation.ts` validates 20
  fail-closed fixtures against the actual clean active route/UI/history and these recovery
  records: PASS (20/20), provider/network 0.
- `node --import tsx scripts/validate-r7b-chat-recommendation-core.ts`: PASS (15
  fixtures), provider/network 0.
- `node --import tsx scripts/validate-r7c1-chat-ui-history.ts`: PASS (22 fixtures),
  provider/network 0.
- `pnpm exec tsc --noEmit --pretty false --target ES2022 --module commonjs
  --moduleResolution node --esModuleInterop --strict --skipLibCheck
  scripts/validate-r7c2-paid-continuation.ts`: PASS.
- Root `pnpm exec tsc --noEmit --pretty false`: FAIL only in the pre-existing preserved
  R3 Lane C candidate (`ops/simulation-refinement/.../count-semantic-turn.ts`) because
  its candidate-only modules are absent. No R7-C2 diagnostic was emitted; this does not
  establish root typecheck PASS.
- `git diff --check`: PASS.

## Deferred / Owner Action

Before a new Unit can activate paid continuation, an owner must establish a canonical
product contract: public product/description, price and currency, approved Stripe
product/price binding, what is granted, delivery/fulfillment meaning, refund/revocation
semantics, and an approved server-side identity/entitlement store. Then implement and
test the entire Checkout → verified payment → issued entitlement → resume path offline
before activation. Stripe configuration, production Redis, deploy, and external calls
remain separate Human Gates.

## Truth Boundary

- turn count != payment
- history != entitlement
- success redirect != payment verification
- checkout created != paid
- paid != delivered
- test payment != revenue
- product candidate != canonical product
- local PASS != production parity
- `PRODUCTION_PARITY = UNVERIFIED`
