# Europe Opportunity Desk V1

2026-09-30 / MUSIAM_EUROPE_OPPORTUNITY_DESK_V1 / local research candidate

Authority: `MUSIAM_MASTER_STRATEGY_LOCK_2026-09-30.md` §1.3, §7.6 and the europe-opportunity allowed paths in `ops/control-plane/parallel-lanes.json`. Initial branch `lane/europe-opportunity`, HEAD/base `6b69804cd988661133158169c1457cede4c3813a`; tracked working tree was clean. Existing metal-print economics, policy and inventory structures were inspected read-only. This desk does not register products or connect to their order/payment systems.

## Run and artifacts

Dependency-free Node 22; run from this worktree:

```sh
node scripts/commerce/opportunity-desk.mjs 2026-09-30T16:12:21Z
node scripts/commerce/validate-opportunity-desk.mjs
```

Omit the timestamp to evaluate age at current runtime. The first command writes only `ops/commerce/desk-output.v1.json`. There are no network, seller contact, payment, purchase, listing or deployment methods. Validation is read-only. The committed output uses the research access time for reproducibility; it is not a live stock receipt.

- `ops/commerce/candidate.schema.v1.json`: closed JSON Schema draft 2020-12, version 1.0.0.
- `ops/commerce/research-sample.2026-09-30.v1.json`: three evidence-bearing candidates.
- `ops/commerce/desk-output.v1.json`: ranked research decisions and derived expected gross spread/contribution.
- `scripts/commerce/opportunity-desk.mjs`: schema subset validator, semantic evidence validation, economics and risk scorer.
- `scripts/commerce/validate-opportunity-desk.mjs`: adversarial and regression checks.

Schema changes require a new version and explicit migration; incompatible records fail rather than silently default. The runtime validator supports every keyword used in this schema, not arbitrary external JSON Schema. Input IDs and source IDs must be unique. Money is EUR only; cross-currency references need an evidenced conversion in a future version. `sourcePublishedAt: null` means the source publication date is unknown. Access timestamps record this research retrieval, not when a seller last refreshed their page.

Each material observation is `VERIFIED`, `ESTIMATE`, `ASSUMPTION` or `UNKNOWN`, with units, notes and source IDs. VERIFIED means the named source displayed the claim, not independently authenticated physical stock. UNKNOWN requires null. No source-backed claim without a URL/access timestamp; all derived economics remain estimates. Country identifies the sourcing location and is distinct from manufacture country. Risk/confidence ratings are analyst judgments, not statistical probabilities. Future observations and nonzero speculative inventory fail validation.

## Ranking and economics

Score weights: authenticity safety 25%, return safety 15%, liquidity 20%, availability 15%, content value 15%, contribution margin at most 10%. Margin points = clamp(contribution / revenue × 40, 0, 10).

Unsafe screening, unverifiable seller, deceptive claims, unknown authenticity or authenticity risk ≥60 exclude the candidate entirely. Commercial research is capped at 49/100 if any gate fails: source freshness ≤24 hours and live retrieval, confirmed first-party provenance, known judgments, returns <50, liquidity ≥50, time-to-sell ≤30 days, availability ≥80, verified acquisition/reference price, complete positive landed contribution. These thresholds are conservative uncalibrated V1 policy, not evidence of conversion or demand. Even passing candidates cannot execute commerce. External retailer review is deliberately conservative pending stronger provenance evidence.

Expected gross margin = illustrative revenue − acquisition. Contribution subtracts marketplace/payment fees, inbound/outbound shipping, packaging, tax, customs, return and FX reserves. Missing cost produces null contribution. Do not promote gross spread into profit. Labor, overhead and customer acquisition are not included; an eventual quote must add them. Scenario taxes/customs are intentionally unknown, and no legal/tax conclusion is made. A verified reference price would still be an asking/reference price, never a sold-price claim unless its source proves that.

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
