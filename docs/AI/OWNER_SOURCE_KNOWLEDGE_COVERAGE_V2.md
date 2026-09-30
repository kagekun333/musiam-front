# OWNER SOURCE KNOWLEDGE COVERAGE V2

**Status:** PASS_LOCAL candidate
**Gate:** OWNER_SOURCE_KNOWLEDGE_COVERAGE_V2
**Authority:** MUSIAM_MASTER_STRATEGY_LOCK_2026-09-30.md

## Scope and result

Base: `6b69804cd988661133158169c1457cede4c3813a`, lane `knowledge-v2`. Existing ranking was the starting point; selected Letters were read in full. No archive candidate or AI/SSD prose was promoted to owner intent.

Added **14 works** (13 music, 1 book), **8 EXPLICIT / 6 NOT_EXPLICIT**, from **12 owner-signed Letters**. Total editorial rows: **52**. Static music coverage: **39/286 (13.64%)**, previously 26/286 (9.09%). Remaining uncovered works: **368**, Letter candidates: **198**. The legacy v1-named ranking file remains the continuation interface and now carries `COVERAGE_V2_LOCAL`.

## Reviewed works

| Work / stable ID | Intent | Source |
| --- | --- | --- |
| ABI9PRO / `abi9pro-216` | EXPLICIT | [content/letters/2025-09-01-four-songs-and-the-hottest-summer.md](/content/letters/2025-09-01-four-songs-and-the-hottest-summer.md) |
| Pan / `pan-143` | EXPLICIT | [content/letters/2025-05-16-pan-the-flute-of-the-wild.md](/content/letters/2025-05-16-pan-the-flute-of-the-wild.md) |
| Holy God / `spotify-single-1fMyrxxtfUI8eIIUgDQ5Yc` | NOT_EXPLICIT | [content/letters/2025-11-17-fourteen-songs-in-one-breath.md](/content/letters/2025-11-17-fourteen-songs-in-one-breath.md) |
| Main Character Energy / `main-character-energy-218` | EXPLICIT | [content/letters/2025-09-01-four-songs-and-the-hottest-summer.md](/content/letters/2025-09-01-four-songs-and-the-hottest-summer.md) |
| 流れ往くままに！ / `item-215` | EXPLICIT | [content/letters/2025-08-26-danke-bitte-and-the-flow.md](/content/letters/2025-08-26-danke-bitte-and-the-flow.md) |
| BALIAN / `spotify-album-1vLThFMjRi4noudDkGwf5f` | NOT_EXPLICIT | [content/letters/2026-01-07-six-songs-where-speed-erases-shape.md](/content/letters/2026-01-07-six-songs-where-speed-erases-shape.md) |
| Drey Fugen: Harmonia Mundi / `drey-fugen-harmonia-mundi-211` | NOT_EXPLICIT | [content/letters/2025-08-12-drey-fugen-and-the-tribe.md](/content/letters/2025-08-12-drey-fugen-and-the-tribe.md) |
| Coffee Love / `coffee-love-161` | EXPLICIT | [content/letters/2025-05-23-coffee-love-and-the-mirror.md](/content/letters/2025-05-23-coffee-love-and-the-mirror.md) |
| ENGINE / `spotify-album-3f4tKu7hRTK4QvMglr0Vp6` | NOT_EXPLICIT | [content/letters/2025-05-24-engine-and-the-damp-chips.md](/content/letters/2025-05-24-engine-and-the-damp-chips.md) |
| アマテラスOG短編集 / `og-43` | EXPLICIT | [content/letters/2025-02-17-amateras-and-the-void-sword.md](/content/letters/2025-02-17-amateras-and-the-void-sword.md) |
| 사인 주세요 / `spotify-single-43CyheqfBIFgDSRmB4ZfAt` | NOT_EXPLICIT | [content/letters/2026-01-26-daikanyama-and-a-sign-request.md](/content/letters/2026-01-26-daikanyama-and-a-sign-request.md) |
| カーボンネガティブプロジェクト / `spotify-single-67DToKxvWonpGDlwwtVhyJ` | NOT_EXPLICIT | [content/letters/2025-11-17-fourteen-songs-in-one-breath.md](/content/letters/2025-11-17-fourteen-songs-in-one-breath.md) |
| Eagle Eye / `eagle-eye-183` | EXPLICIT | [content/letters/2025-06-23-five-songs-and-a-fragile-ceasefire.md](/content/letters/2025-06-23-five-songs-and-a-fragile-ceasefire.md) |
| ME / `spotify-single-1xHCXzgoJ7SLYL78n3IDrZ` | EXPLICIT | [content/letters/2026-01-24-me.md](/content/letters/2026-01-24-me.md) |

## Identity and intent review

Every runtime row binds an explicitly reviewed catalog ID. Music binding uses catalog medium, stable provider URL and matching release-day Letter context; it does not create provider aliases from title equality. The book binding additionally verifies ASIN `B0DXL5VR8Z` in both catalog and Letter. Pan and other SSD dates can differ by one day from the primary catalog/Letter; no dates were rewritten. Source paths, SHA-256 values, starting ranks and binding decisions are recorded in `ops/product/owner-source-knowledge-tranche-v2.json`.

ABI9PRO/Main Character Energy, 流れ往くままに！, Coffee Love and Eagle Eye retain pair/group-scoped intentions. Their summaries explicitly identify the group; they do not turn shared release rationale into an individual hidden motive. Holy God, カーボンネガティブプロジェクト and BALIAN receive group context only. Drey Fugen, ENGINE and 사인 주세요 receive supported descriptions but no owner-intent prose. No lyrics, instrumentation, BPM, recording locations or biography were added.

## Deferred candidates and risks

- SILIM: Letter explains the title as Philippine evening darkness/stillness, while SSD describes a Sumerian greeting. Deferred pending source reconciliation; neither account is silently preferred.
- Music 2045: ranking matched the substring in book titles. Not the same medium; no knowledge attached.
- ウィーアーザアース, れいんぼーくっしゅ, Love Machine: individual concept/motive is not supported beyond a release list.
- Ranking remains a search locator. These deferred candidates can remain highly ranked; the review ledger is required before the next tranche.
- Letter provenance establishes published owner editorial, not independently verified audio facts. Runtime/Production parity remains UNVERIFIED.

## Validation

All run with `node --import tsx`:

- `scripts/owner-source/rank-knowledge-coverage.ts`: rebuilt ranking.
- `scripts/owner-source/validate-knowledge-coverage.ts`: PASS_LOCAL, all V1 bindings/hash/intent regressions retained; total count updated to 52.
- `scripts/owner-source/validate-knowledge-coverage-v2.ts`: PASS_LOCAL, every added source hash, owner signature, ID, envelope and Luna attribution policy verified; same-title fake IDs and deferred candidates remain unbound.
- `scripts/validate-owner-source-knowledge-envelope.ts`: PASS_LOCAL.
- `scripts/validate-r7a-catalog-foundation.ts`: PASS, editorial manifest hash/count verified, zero network requests.

No Production, Vercel, remote Git or canonical checkout operation was performed. Protected daily roots and Human-owned state/experiments were not accessed. No push.

## Preview hardening — short reviewed titles and provider duplicates

The first Preview audit exposed two structural gaps before Production:

1. reviewed titles shorter than four ASCII characters (`Pan`, `ME`) were excluded by the conservative editorial query resolver even in explicit title contexts such as `Panってどんな曲？` and `MEはなんで作ったの？`;
2. eight V2 works had a second catalog ID pointing to the same reviewed Spotify album URL, so Chat could use the primary reviewed ID while Exhibition could show a provider duplicate without editorial description.

The resolver now accepts a short reviewed ASCII title only when the query gives explicit work-title context, for example a quoted title or a title at the beginning followed by Japanese title particles such as `は`, `って`, `とは`, or `について`. Ordinary substrings remain rejected: `pandaみたいな曲ある？` does not resolve `Pan`, and `recommend me something` does not resolve `ME`.

Eight provider duplicate bindings were added only after matching the same stable Spotify album URL in the catalog; no title-only binding was used:

- ABI9PRO → `spotify-single-6Xf0QNYo1QDMSXb9zKmPxU`
- Pan → `spotify-single-749Tw6EZCBlZM52tE2JVYt`
- Main Character Energy → `spotify-single-4UmMbxajVR7P6Y2PkUlWcz`
- 流れ往くままに！ → `spotify-single-1OZ2YPhTCoARTJhDvNMGFR`
- Drey Fugen: Harmonia Mundi → `spotify-single-4GtdD71vSh1NCycz68o3Qq`
- Coffee Love → `spotify-single-1prDtJ6sGIsTnWf7WNz01k`
- ENGINE → `engine-163`
- Eagle Eye → `spotify-single-75DrnUJQGstoPG5xEWXEbW`

The V2 validator now proves that each alternate ID receives the reviewed Knowledge Envelope and Exhibition description while deferred candidates remain unbound.

## Work Story completion guard

Production smoke exposed one quality failure that was not a factual hallucination but was still unacceptable: a successful Luna response for `Holy God` ended mid-sentence at `館の世界を一望させ`.

The Work Story route now validates response completion before presenting model prose to the visitor.

- clearly complete prose is returned normally;
- clearly truncated prose is rejected even when the provider returned `ok=true`;
- the visitor receives the existing evidence-grounded deterministic fallback instead;
- observability logs only `trace`, provider, model and response length; user text and generated story content are not copied into the warning log.

The guard is generic across works and supports Japanese plus the existing supported response languages. It does not special-case `Holy God`.

Regression examples:

- `館の世界を一望させ` → incomplete
- `館の世界を一望させる一曲ですね。` → complete
- `This work brings the whole museum into` → incomplete
- `This work brings the whole museum into view.` → complete
