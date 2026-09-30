# COUNT_CHAT_SALES_ARENA_V1

## Scope

Sales Arena V1 is a held-out evaluation and training harness. It is not connected to chat, checkout, a catalog, order support, or a production sales flow. The V1 implementation lives under `scripts/sales/` and is not imported by application code.

The 13 scenarios are synthetic and product-agnostic. No approved sales materials or offer facts were present in the allowlisted sales paths at the time this dataset was assembled. Each scenario therefore has an empty `known_offer_facts` list. Do not treat a buyer's budget, quantity, date, or competitor statement as a verified offer fact. Do not add prices, stock, delivery promises, discounts, warranties, returns, or contract terms without an attributable approved source and a new dataset revision.

## Held-out scenario coverage

All scenarios have `split: "held_out"`:

1. Browsing only
2. Low budget
3. Too expensive
4. Not today
5. Product comparison
6. Hotel/B2B volume and delivery inquiry
7. Gift discovery
8. Meaning of a listing phrase
9. Hesitation
10. Other-vendor comparison
11. Explicit no-sales request
12. Strong purchase intent
13. Post-purchase delivery/cancellation risk

## Scoring dimensions

Each model-judge assessment records one 0–4 rating or an explicit `not_applicable` / `insufficient_evidence` abstention for:

- Accuracy and contract safety
- Request understanding
- Recommendation quality
- Value explanation
- Appropriate deal advancement
- Charm, naturalness, and humor variability
- Consent and stop behavior
- Hallucination and unsupported claims
- Repeatability across runs
- Post-purchase risk handling

Every numeric rating needs an exact transcript excerpt and a short rationale. Repeatability needs observations from at least three runs with the same scenario and model configuration. Wording may vary; factual claims and consent behavior should stay stable. Humor is optional.

## Judge authority and human calibration

The assessment schema records candidate and judge identities for audit, including whether the judge is grading its own model. A self-judged assessment stays advisory. The summary reports per-dimension descriptive means only; it has no composite score, pass/fail result, or sales-readiness decision.

Each model assessment carries an opaque blind-pair identifier. `createBlindReviewPacket()` produces the reviewer copy with candidate/judge identities and model ratings omitted; use that packet for blind review, not the raw assessment. Human ratings, adjudication, and unblinding remain empty/pending in V1. Do not use model-judge output as definitive truth or as approval evidence. Any quality conclusion requires blind human calibration and separate review of cited evidence.

## Deterministic validation

From the repository root, run:

```sh
node scripts/sales/validate-count-chat-sales-arena-v1.mjs
```

The validator checks the required held-out coverage, dataset boundaries, assessment structure, evidence excerpts, three-run repeatability gate, blind-review state, self-judge labeling, and non-final authority. Its synthetic judge fixture exercises the schema only; it is not a real model evaluation and does not establish sales quality, commercial readiness, or production behavior.
