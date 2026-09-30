# Europe Opportunity Desk V1

2026-09-30 / MUSIAM_EUROPE_OPPORTUNITY_DESK_V1 / local research candidate

Authority: `MUSIAM_MASTER_STRATEGY_LOCK_2026-09-30.md` §1.3, §7.6 and the europe-opportunity allowed paths in `ops/control-plane/parallel-lanes.json`. Current HEAD/base is owned by the Control Plane and must be read from lane status rather than pinned in this document. Existing metal-print economics, policy and inventory structures were inspected read-only. This desk does not register products or connect to their order/payment systems.

## Run and artifacts

Dependency-free Node 22; run from this worktree:

```sh
node scripts/commerce/europe-opportunity.mjs --write
node --test scripts/commerce/europe-opportunity.test.mjs
```

Without `--write`, the desk prints deterministic JSON to stdout. With `--write`, it writes only `ops/commerce/europe-opportunity-desk.v1.json`. The evaluation time comes from `asOf` in the candidate input; the CLI accepts no timestamp argument. There are no network, seller contact, payment, purchase, listing or deployment methods. Tests are read-only apart from temporary process state. The committed output uses the recorded research access time for reproducibility; it is not a live stock receipt.

- `ops/commerce/europe-opportunity-candidate.schema.v1.json`: closed JSON Schema draft 2020-12, version 1.0.0.
- `ops/commerce/europe-opportunity-candidates.v1.json`: three evidence-bearing candidates.
- `ops/commerce/europe-opportunity-desk.v1.json`: research decisions plus derived scenario economics and rankings.
- `ops/commerce/europe-opportunity-validation.v1.json`: deterministic validation receipt for the research snapshot.
- `scripts/commerce/europe-opportunity.mjs`: semantic validator, economics calculator and guarded scorer.
- `scripts/commerce/europe-opportunity.test.mjs`: adversarial and regression tests.

`ops/commerce/europe-opportunity-candidate.schema.v1.json` documents the closed V1 record contract. `scripts/commerce/europe-opportunity.mjs` performs hand-coded semantic validation for the fields, ranges, provenance and capital guards used by the desk and is the execution authority; it is not a general JSON Schema engine. Incompatible records fail rather than silently default, and an incompatible future schema change requires a new version and explicit migration. Candidate IDs are de-duplicated before ranking. Monetary metric currency, when present, must be EUR; cross-currency references require an evidenced conversion in a future version. `source.publishedAt: null` means the source publication date is unknown. Access timestamps record this research retrieval, not when a seller last refreshed a page.

Candidate facts are `VERIFIED` page observations with HTTPS source URL and access timestamp. Decision metrics use `VERIFIED`, `ESTIMATE`, `ASSUMPTION` or `UNKNOWN`, with a note and nullable provenance. `UNKNOWN` requires a null value and null provenance; `VERIFIED` requires source URL and access timestamp. Derived economics remain scenarios, not observed sales. Country identifies the sourcing location and is distinct from manufacture country. Risk/confidence values are analyst judgments, not statistical probabilities. Future observations and nonzero speculative inventory fail validation.

## Ranking and economics

The desk keeps editorial and commercial ranking separate. `editorialScore = contentValue × 100` when content value is known; it does not improve commercial clearance. `commercialScore` is a 0–100 research score using scenario net-contribution margin 30%, authenticity safety 20%, return safety 15%, liquidity 20%, and availability confidence 15%. Net-contribution margin is clamped to 0–1 for scoring. The score is descriptive only; it is never purchase authority.

A valid candidate becomes `HOLD` if any commercial gate fails. Current V1 gates require verified acquisition and reference prices; authenticity risk ≤0.25; return risk ≤0.50; liquidity ≥0.40; availability confidence ≥0.50; no future evidence; non-UNKNOWN observations no older than 24 hours and carrying access timestamps; positive complete net contribution; nonzero reference price; known time-to-sell ≤30 days; and purchase exposure at least acquisition plus shipping, tax, customs and packaging. Only a gate-clean candidate is `REVIEW_REQUIRED`, and only `REVIEW_REQUIRED` candidates with every commercial-score input known can enter `commercialRanking`. `REVIEW_REQUIRED` still cannot execute commerce. These thresholds are conservative uncalibrated V1 policy, not evidence of conversion, demand, authenticity, ownership or stock.

Scenario gross profit = reference price − acquisition price. Scenario net contribution = gross profit − fees − shipping − tax − customs − packaging − return reserve. If any required cost is unknown, net contribution is null; unknown never means zero. The stored `expectedGrossMargin` is retained as an input observation, while the desk independently derives `scenarioGrossMargin` and `scenarioNetContributionMargin`. Do not promote reference-price spread or scenario contribution into realized profit. Labor, overhead, customer acquisition and FX are not modeled in V1; an eventual quote must address them separately. Scenario taxes/customs are intentionally unknown in the sample, and no legal/tax conclusion is made. A verified reference price is still a displayed reference/asking price, never a sold-price claim unless its source proves that.

## Operating handoff

Default future model: content → interest → live recheck → quote → customer payment → purchase → ship. This deliverable implements research and internal drafts only; it does not authorize any later transaction or publication.

1. Draft an editorial find using only sourced facts and attributed interpretation. Do not promise stock, scarcity, exclusivity, investment value or savings without evidence. Images require separate rights clearance.
2. After a future authorized interest capture, recheck exact SKU, edition, size, seller provenance, stock, checkout price, shipping destination and return conditions. A cart button is not availability confirmation. Record a new observation, retaining old evidence.
3. Prepare an expiring transparent quote with acquisition, service fee, all logistics, tax/customs, currency/FX, delivery window, cancellation/refund terms, seller-of-record and responsibility for returns. Do not quote from this sample. France/EU and Japan need separate landed-cost scenarios; tax treatment and import eligibility need review.
4. Future commercial execution requires explicit authority, confirmed customer funds covering purchase/logistics and a funded refund/chargeback buffer. Payment is not proof that refund exposure is zero. On stock/price change after payment, re-quote with consent or refund; never substitute silently.
5. Only then purchase and ship under separately authorized fulfillment procedures. No speculative purchase, seller contact, outreach, marketplace listing or account change is available here.

Product route outputs remain research candidates, never approved/final catalog records. Exclude food, alcohol, nicotine, medicines, supplements, cosmetics, weapons, protected-species materials, hazardous goods, regulated electronics, unverifiable luxury/counterfeit-risk listings and deceptive resale propositions. V1 categories are a research allowlist, not a blanket exemption from applicable product obligations. Food-contact coffee gear needs product/document review before commerce. Books may contain adult imagery; editorial selection requires audience judgment.

## Validation and limits

PASS: complete sample/schema validation, evidence references, invalid amounts, unknown-vs-zero protection, future timestamps, speculative capital rejection, authenticity/deception/unsafe exclusions, high-margin return/liquidity guards, stale/cached evidence, null-cost propagation and deterministic generated output. No site integration, build, production smoke or sales test is claimed. The repository-wide build is outside this isolated script/document change.

Remaining: live checkout/variant stock, merchant provenance for the grinder, return policies, target-market matched prices, actual demand, taxes/customs, fulfillment quote, refund buffer and publication approval. No purchases, contacts, listings, payments, account changes, protected-root access, deployment or push performed.
