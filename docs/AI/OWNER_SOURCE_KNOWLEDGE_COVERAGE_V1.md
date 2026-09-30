# OWNER SOURCE KNOWLEDGE COVERAGE V1

**Gate:** `OWNER_SOURCE_KNOWLEDGE_COVERAGE_V1`
**Status:** PASS_LOCAL candidate
**Authority:** `MUSIAM_MASTER_STRATEGY_LOCK_2026-09-30.md`
**Depends on:** Owner Source Corpus Probe / Index V1 / Knowledge Envelope V1

## 1. Purpose

Knowledge Envelope V1 established a safe runtime path for owner/editorial knowledge.

Coverage V1 expands that path from two reviewed music works to a first meaningful tranche of MUSIAM music while preserving:

- stable identity;
- source provenance;
- owner intent boundaries;
- UNKNOWN where evidence is insufficient;
- no title-only merge;
- no AI draft promotion.

The goal is not “fill every blank.”

The goal is:

> **make the works that actually have strong owner-published evidence become conversationally rich, while leaving weakly sourced works honest.**

---

## 2. Starting point

Before Coverage V1:

- Editorial Knowledge rows: **14**
- Music Editorial rows: **2**
  - Fuego en la Noche
  - Görli Garden

Owner Source Index:

- 421 indexed works
- 272 works with archive candidates
- 343 Codex session files
- 10,400 parsed message sections
- 2,207 title mentions

The local Letter archive contains far stronger owner-published material than many Codex wrappers.

---

## 3. Letter cross-match

Exact catalog titles were matched against the repository's `content/letters/` collection.

Result before the V1 tranche:

- music works with at least one owner-published Letter mention: **154** in the initial exploratory scan;
- after the formal ranking pass over uncovered deduped works, **212 uncovered works** had at least one matching owner-published Letter across media types;
- short/common ASCII titles required a stricter explicit-title guard.

### Short-title guard

Titles such as:

- `ME`
- `Pan`

must not match ordinary prose such as “me”, “Japan”, or “panda”.

For ASCII titles of four alphanumeric characters or fewer, the ranking tool now requires an explicit work-like occurrence such as:

- `『ME』`
- `「ME」`
- `**ME**`
- an exact frontmatter keyword token

This is a ranking/search guard. It does not change runtime identity.

---

## 4. First tranche

Coverage V1 adds **24 music works** from **12 owner-signed Letters**.

After the tranche:

- Editorial Knowledge rows: **38**
- added rows: **24**
- newly explicit owner-intent rows: **21**
- newly non-explicit rows: **3**
- source Letters hash-verified: **12**

### Added works

#### Africa

- ENA
- Mama Afrika

Source:

`/letters/ena-and-mama-afrika`

Owner-published context explicitly connects the pair to a year-long attention to Africa. Mama Afrika is explicitly described as praising the continent itself as a mother.

#### Forced Update pair

- FORCED UPDATE!
- 強制アップデート

Source:

`/letters/forced-update`

The Letter explicitly states that they are English/Japanese interpretations of the same “forced update” theme.

#### Primordial water / Earth system

- ABZU
- EARTH OS

Source:

`/letters/a-badge-removed-a-house-dissolved`

These receive verified editorial summaries, but remain `NOT_EXPLICIT` for owner production intent. The Letter defines the conceptual subjects but does not provide a sufficiently direct “I made this because…” statement for either work.

#### Creation / distant star

- DEMIURGOS
- HD 10700

Source:

`/letters/demiurgos-and-a-distant-star`

The Letter explicitly frames them as two forms of “creation” and as expressions of longing toward domains beyond human imagination.

#### Scale of delivery

- HIBIYA BRASS WALK
- 親愛なる日本の皆様

Source:

`/letters/a-brass-walk-and-a-dear-message`

The owner explicitly writes that both arise from the same wish to deliver something to someone, despite radically different scale.

#### Land and spirituality

- Spirit River Rising
- WORLD STRIKE Thirteen Tongues
- 神奈備

Source:

`/letters/spirit-river-and-thirteen-tongues`

The Letter places the three works around land, spirituality, and respect for place.

#### Imagination / body / ideal state

- IMAGINE NO BUTTON
- サウナトランス ととのい
- ピース・イズ・エンジニアード

Source:

`/letters/imagine-no-button-and-the-sauna-trance`

Explicit intent is recorded for:

- IMAGINE NO BUTTON
- サウナトランス ととのい

`ピース・イズ・エンジニアード` receives an editorial summary but remains `NOT_EXPLICIT` for production intent.

#### Speed and quantum love

- 速度が形を消すとき
- 量子恋愛アルゴリズム

Source:

`/letters/six-songs-where-speed-erases-shape`

Both have direct owner descriptions of what was translated into sound.

#### Two forms of release

- Truth Unbound
- 心上人

Source:

`/letters/unbound-and-the-beloved`

The Letter explicitly frames them as social and personal versions of “freedom.”

#### OMNI

- OMNI

Source:

`/letters/omni`

The owner explicitly states that the title's “all/everything” meaning carries pride in the館's omnivorous ability to absorb multiple media and forms.

#### Death and hope

- Infinite Graves

Source:

`/letters/infinite-graves-and-shine`

The Letter explicitly states that the death-themed work was intentionally placed beside a hope-themed work so that neither light nor darkness alone would falsify the world.

#### The first sound

- Back Me
- House in the World

Source:

`/letters/the-first-sound-back-me`

Back Me has unusually strong production evidence. The owner describes its creation “spell” as:

- standing beside someone;
- saying “go on”;
- pushing the back gently rather than striking it.

House in the World is described as the sound of finding one's place in the world and as one half of MUSIAM's first musical greeting.

---

## 5. Provenance rules

Every new V1 row:

- binds through stable IDs;
- uses `sourceClass = OWNER_PUBLISHED_MEDIA`;
- stores the SHA-256 of its source Letter;
- stores the public Letter href;
- is validated against the current repository Letter bytes.

### EXPLICIT

Only rows with direct owner statements about artistic intent receive:

`ownerIntentStatus = EXPLICIT`

and an `ownerIntentSummaryJa`.

### NOT_EXPLICIT

Rows where the Letter supports the work's concept but does not clearly state the owner's production motive receive:

`ownerIntentStatus = NOT_EXPLICIT`

and must not carry `ownerIntentSummaryJa`.

V1 NOT_EXPLICIT examples:

- ABZU
- EARTH OS
- ピース・イズ・エンジニアード

---

## 6. Provider duplicate binding

Production smoke exposed three works where the same real release existed under more than one explicit catalog ID:

- Back Me
  - `back-me-130`
  - `spotify-single-5e8xTCcPJWfd2SUHsjd1BW`
- Infinite Graves
  - `infinite-graves-168`
  - `spotify-single-022wqGt3TzfjInPuDgHGXf`
- House in the World
  - `spotify-album-2DMwcXtZzZaeazATCTW5Xx`
  - `house-in-the-world-131`

These bindings were not inferred from title equality. Each pair was verified against the same stable Spotify album URL and release date in the catalog.

The reviewed Editorial row now explicitly lists both IDs in `workIds[]`, so Chat and Exhibition receive the same knowledge regardless of which provider-facing ID is displayed.

The Coverage validator now verifies all three bindings and checks that the provider duplicate receives an Exhibition description.

Current Editorial Knowledge SHA-256 after these explicit bindings:

`747983aa6b78b699f34c15acb455b17066d38d3b1cfcfaa9d18e3dd8d0e91acb`

## 7. Work Story intent coverage

Coverage V1 also extends the generic Work Story detector so creation-meaning questions do not fall back to ordinary recommendation.

Covered examples include:

- どんな曲？
- テーマは？
- なぜ作ったの？
- 何を込めた曲？
- どんな思いを込めたの？
- この曲で何を伝えたいの？

This is a general intent expansion, not an OMNI-specific branch.

## 8. Validation

Validator:

`scripts/owner-source/validate-knowledge-coverage.ts`

It verifies:

- exactly 38 Editorial rows in this V1 snapshot;
- all 24 new stable IDs exist in canonical catalog or explicit aliases;
- all 12 source Letters exist;
- every source hash matches;
- no stable Editorial ID is bound to more than one row;
- every EXPLICIT row has owner-intent prose;
- every NOT_EXPLICIT row lacks owner-intent prose;
- representative Knowledge Envelopes preserve the owner-intent boundary;
- same-title fake IDs receive no Editorial Knowledge.

Local result:

```
OWNER_SOURCE_KNOWLEDGE_COVERAGE_V1=PASS_LOCAL
editorialItems=38
trancheAdded=24
explicitOwnerIntent=21
nonExplicitOwnerIntent=3
sourceLettersVerified=12
```

---

## 9. Coverage ranking for autonomous continuation

Tool:

`scripts/owner-source/rank-knowledge-coverage.ts`

Output:

`ops/product/owner-source-knowledge-coverage-v1.json`

The ranking considers:

1. reviewed source packet;
2. owner-published Letter;
3. owner-message candidate;
4. recency;
5. AI candidate as locator only;
6. wrapper-heavy penalty.

Current static unique catalog snapshot:

- unique works: **420**
- unique music works: **286**
- music works with Editorial Knowledge: **26**
- static music Editorial coverage: **9.09%**

Current uncovered backlog:

- uncovered works: **382**
- uncovered works with owner-published Letter candidate: **212**
- uncovered works with owner-message candidate: **20**

This means the remaining problem is no longer “there is no source.”

A large part of the remaining problem is **review throughput**.

---

## 10. Live runtime coverage caveat

Current live Production has more works than the static 420-work deduped base because Apple overlay adds post-cutoff releases.

At the current Production snapshot:

- live unique works: **488**
- live music: **354**
- live books: **134**

The current runtime Editorial music count is still small relative to live music coverage because many post-cutoff Apple works do not yet have reviewed owner sources.

Recent works such as:

- Sun Without a Map
- Runic Voltage
- TEQUILA MOON RITUAL
- Still Here

currently remain mostly in:

- official release facts;
- generic cover briefs;
- operational logs;
- Knowledge Gap / curatorial-reading territory

unless stronger creation sources are found.

Do not upgrade generic jacket-generation prompts into owner intent.

---

## 11. Latest-release mining result

A targeted scan of recent Apple-only releases found that many recent titles are present in:

- Codex approval wrappers;
- generic jacket-generation batches;
- operational release history.

These are weak sources.

Therefore Coverage V1 does **not** prioritize “latest at all costs.”

Priority is:

> **latest + strong source**

not:

> **latest + any text containing the title**

This protects MUSIAM from becoming confidently fictional about its newest works.

---

## 12. Next-ranked works

After the first tranche, the ranking tool identifies future candidates such as:

- ABI9PRO
- Pan
- Holy God
- Main Character Energy
- SILIM
- 流れ往くままに！
- BALIAN
- Drey Fugen: Harmonia Mundi
- Coffee Love
- 2045
- ENGINE
- ウィーアーザアース
- 사인 주세요

These are **candidates, not approved runtime knowledge**.

Each next tranche must still read the source Letter and classify:

- summary support;
- owner intent support;
- contradictions;
- stable identity.

---

## 13. What remains intentionally unknown

Coverage V1 does not fill:

- unverified lyrics;
- instruments;
- BPM;
- hidden biography;
- recording location;
- personal events;
- unrecovered Suno prompts;
- motivations not present in owner source.

The correct response to missing evidence is still not necessarily a boring refusal.

Count Chat may use clearly framed curatorial interpretation without turning it into owner history.

---

## 14. Autonomous loop after V1

Future `次` execution can use:

```
rank-knowledge-coverage
→ select next strong-source tranche
→ read source Letters / owner messages
→ classify EXPLICIT vs NOT_EXPLICIT
→ add stable-ID Editorial packets
→ hash validation
→ Count Chat held-out stories
→ Preview
→ Production
→ receipt
→ rerank
```

This allows coverage to increase without manually choosing every song.

---

## 15. V1 target

Production target for this Gate:

- 38 Editorial Knowledge rows
- 24 newly promoted music works
- 21 explicit owner-intent works
- 3 non-explicit concept-only works
- source hashes verified
- representative Count Chat story responses grounded in Letters
- no title-only leakage
- no technical sonic invention
- no new error/5xx regression

**Target verdict: OWNER_SOURCE_KNOWLEDGE_COVERAGE_V1 = PASS_PRODUCTION**
