# MUSIAM Media OS MVP — 2026-09-30

Status: local DRAFT compiler; no publication authority. Strategy: MUSIAM_MASTER_STRATEGY_LOCK_2026-09-30.md §§9–10. Lane: media-os, base 6b69804cd988661133158169c1457cede4c3813a. User no-push instruction overrides control-plane remotePublishPolicy. No shared paths changed.

## Audit / State Lock

- Continuation lock: branch `lane/media-os`, base `6b69804cd988661133158169c1457cede4c3813a`. The existing dirty state contained a staged Node prototype and an untracked Python candidate. Both were kept in the allowlist and validated; no lane changes were reset.
- Source-read boundary: the two recipe-pinned Letter files were read only by the media validators for byte hashes, frontmatter metadata, evidence excerpts and link checks. No source content was edited or inventoried.
- `src/lib/letters.ts` derives Letter URLs from filenames, not frontmatter slugs. Existing source content is not a verified news corpus; dated quantities, attributed quotations and commercial promises need fresh evidence before reuse.
- Existing src/lib/daily-music-social-copy.mjs and scripts/build-daily-music-release-pack.mjs create music-specific platform copy, catalog identity, tracked Chat URLs and approval gates. scripts/build-daily-music-publication-queue.mjs includes ingress/media/approval readiness. These are separate flows; no approval or standing publication permission is inherited.
- /works and /atelier page files exist. No Intelligence Underground/newsletter publishing integration was established by this audit. V1 creates seeds only; it does not imply either channel is operational.
- Demo: human-role-in-ai-music.md (2026-06-12), focusing on selection, omitting unverified production-volume numbers. Exact owner quotes remain OWNER_SOURCE, not independently verified claims. No source edits.

## Run and schema contract

Python 3.9+ standard library only, no API key, no network, no dependency installation:

```sh
python3 scripts/media/pipeline.py ops/media/sources/human-role-selection-v1.json
python3 scripts/media/pipeline.py ops/media/sources/human-role-selection-v1.json --check
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/media -p 'test_*.py'
```

The Python interface is the canonical V1 contract. `ops/media/source.schema.json` now describes the same recipe shape. The compiler remains the semantic authority for checks that JSON Schema alone cannot prove, including source-byte hashes, Letter frontmatter parity, exact evidence excerpts and line locators, authority/kind compatibility, CTA source relevance, route existence, cross-channel prose reuse, and DRAFT-only publication boundaries. The earlier parallel Node prototype and its sample artifacts were removed during merge review so V1 has one executable contract.

Generate command intentionally fails if the package directory exists. To create another package, author a new recipe with a new id; never overwrite an approved/reviewed candidate. --check is read-only.

Source recipe schema v1 (demo JSON is the concrete example):

| Field | Contract |
| --- | --- |
| schema_version, id | 1; lowercase ASCII letters/digits/hyphens, unique revision identity |
| source | content/letters basename .md, byte SHA256, filename-based relative URL, title, date |
| evidence | keyed records with kind quote/fact, authority OWNER_SOURCE/FACT, scope, exact excerpt and 1-based line |
| channels | exactly letter, intelligence, seo_article, x, threads, instagram, short_video, newsletter |
| channel purpose, segments | distinct editorial purpose; nonempty text, kind quote/fact/inference, nonempty evidence_ids |
| cta | source-existing relative href with local route, label, evidence_id, editorial relevance reason |

Compiler enforces hash/excerpts/line references, channel coverage, links for CTA, provenance, draft state and deterministic bytes. FACT is limited to source_text_only: observation that a source says something, not verification of its world claim. quote/fact output must equal an evidence excerpt. Inference is editorial interpretation, not author intent. An external factual claim requires a future independently sourced evidence adapter; V1 rejects that authority escalation.

Every channel output has source metadata, DRAFT/UNREVIEWED state and segment evidence IDs; package contains the full excerpt/line map. review.md carries the same traceability. Letter output is a derivative entry seed, not replacement for the original Letter. The global CTA is a related optional destination; editors adapt placement for each platform rather than paste it everywhere.

## Queue, cadence and approval

One idea per weekly editorial cycle initially (planning hypothesis, no performance evidence). Suggested order/day offsets: Letter 0, investigation 1, article 2, X 3, Threads 4, Instagram 5, video 6, newsletter 7. Offsets are relative planning values, not scheduled sends. All rows executable=false; queue is compiled inside each package, not connected to the existing publication queue. Review capacity controls intake; skip channels with no additional reader value. Prioritize source specificity, relevance and evidence readiness over volume.

Editorial workflow: DRAFT → IN_REVIEW → CHANGES_REQUESTED or APPROVED → separate explicitly authorized distribution handoff. These are future/manual review states; compiler only emits DRAFT/UNREVIEWED and has no approval command. Record reviewer, time, exact recipe/source/output hashes and per-channel decision in a separate review receipt before any handoff. Technical PASS never implies creative approval. Source or copy changes invalidate review and create a new revision. No automatic transitions, login, scheduling execution, publishing or outbound posts exist.

Reuse: shared evidence quotes allowed, editorial prose must differ by channel. New angle or source revision requires a new id. Re-check time-sensitive claims and destination availability before handoff; source hash changes block validation. Do not reuse affiliate/commercial claims without disclosure, rights and live terms review. No copyrighted media is downloaded/generated by this pipeline.

CTA: use a source-linked destination only when it advances the idea. Demo selection → /works. A route file proves local existence, not deployed availability. Do not attach generic shop offers, scarcity, price or inventory claims. Remove CTA if relevance cannot be explained; a future no-CTA recipe variant requires schema evolution. Newsletter means draft copy, not a consented list or working subscription system.

## Quality gate and limits

Hard checks reject fabricated evidence/locators, stale source, missing provenance, unsupported quote/fact text, digits/quote markers/URLs in inference, repeated segments, identical channel bodies, shared inference prose and a small hype denylist. X ≤140 Unicode characters and Threads ≤450 are conservative local editorial budgets, not a claim about current platform limits. These checks reduce specific failure modes; they do not prove truth or literary quality.

Human review must examine implied facts without numerals, fake paraphrased attribution, source credibility, misleading quotation context, near-duplicate phrasing, visual/script feasibility, audience usefulness, rights and CTA wording. The denylist is deliberately small; no generic template filling or automatic synonym spinning. Long-form outputs remain seeds requiring reporting, not finished articles. No demand/reach/conversion/revenue measurements exist. Record those as unknown until actual authorized experiments; do not invent metrics.
