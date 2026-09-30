# OWNER SOURCE KNOWLEDGE ENVELOPE V1

**Gate:** `OWNER_SOURCE_KNOWLEDGE_ENVELOPE_V1`
**Status:** PASS_LOCAL candidate
**Authority:** `MUSIAM_MASTER_STRATEGY_LOCK_2026-09-30.md`
**Depends on:** `OWNER_SOURCE_CORPUS_PROBE`, `OWNER_SOURCE_CORPUS_INDEX_V1`

## 1. Purpose

MUSIAMが自分の作品について、

- 公開事実
- 伯爵本人の公開文章
- editorial summary
- 制作意図
- AIによる解釈
- unknown

を混同せずに扱いながら、伯爵Chatの会話を硬い「分かりません」応答から進化させる。

V1は、review済みOwner Sourceを既存の `KnowledgeEnvelope` へ接続し、Count Chatが作品背景を自然に語れることを目的とする。

---

## 2. Core rule

### FACT is not OWNER INTENT

release date、title、Apple genre等のFACTと、

> 伯爵本人がなぜ作ったか

は別のauthority。

### OWNER EDITORIAL is not AUDIO FACT

Letterに書かれた作品紹介は強い資料だが、

- BPM
- instruments
- vocal presence
- full lyrics
- recording location

等を自動的に証明しない。

### CURATORIAL INTERPRETATION is allowed

Owner intentが未確認でも、伯爵Chatは会話を止めなくてよい。

ただし、

> 「僕の読みなら」

のように館主の解釈として語り、作者の伝記・史実・制作エピソードへ昇格させない。

---

## 3. Runtime editorial source

Runtime sidecar:

`public/works/editorial-knowledge.json`

V1で既存12件に加え、review済みmusic knowledgeを2件追加した。

### Fuego en la Noche

Stable IDs:

- `fuego-en-la-noche-228`
- `spotify-single-0isH27stV7eiEpIbqfhood`

Source:

`content/letters/2025-09-04-fuego-en-la-noche.md`

SHA-256:

`9b3bf01d6ac97806886a91c0a5c2d41e99da29e38a8324f335b411e6861893ab`

Source class:

`OWNER_PUBLISHED_MEDIA`

Owner intent:

`EXPLICIT`

The Letter directly supports:

- preceding quiet/mythic workとの意図的なcontrast
- 振れ幅を館の個性とする考え
- 夜の「眠る」と「燃え上がる」という両義性

### Görli Garden

Stable IDs:

- `g-rli-garden-149`
- `spotify-single-0n4YxepwuViPkKvIuLXtwR`

Source:

`content/letters/2025-05-21-brandenburg-gate.md`

SHA-256:

`cca5dcaf3c61c453c36ab5c7b44649dec71e9348f1e0b6f22d2abd57ab1b2551`

Source class:

`OWNER_PUBLISHED_MEDIA`

Owner intent:

`NOT_EXPLICIT`

The Letter supports:

- ベルリンの公園の一曲
- 世界の街と日本の闇のあいだを回遊する作品群という文脈

It does not prove a direct statement:

> 「私は○○の理由でGörli Gardenを作った」

That distinction remains intact.

---

## 4. Stable identity rule

Editorial knowledge is attached only through explicit IDs in:

- `workId`
- `workIds[]`

Title equality alone never attaches editorial knowledge.

When the base catalog contains duplicate provider records with the same title, a reviewed Editorial row may resolve the visitor query to its explicitly enumerated `workIds[]`; this is reviewed stable-ID binding, not a title-only merge.

A fake work with title `Fuego en la Noche` and an unrelated ID must receive no editorial summary.

This prevents:

- provider duplicate confusion
- same-title collision
- accidental owner-intent leakage

---

## 5. KnowledgeEnvelope extension

`buildWorkKnowledgeEnvelope()` now contains:

```ts
editorial: {
  summaryJa
  ownerIntentSummaryJa
  facets
  sourceClass
  ownerIntentStatus
  sourceHref
} | null
```

### ownerIntentStatus

- `EXPLICIT`
- `NOT_EXPLICIT`
- `UNKNOWN`

If and only if:

```
ownerIntentStatus === EXPLICIT
AND
ownerIntentSummaryJa exists
```

then `ownerProductionIntent` may leave UNKNOWN.

For all other works, owner production intent stays unknown.

---

## 6. Luna Evidence Pack

`buildLunaEvidencePack()` now carries:

- normal catalog facts
- editorial knowledge
- editorial source class
- owner-intent status
- explicit policy booleans

Important policy fields:

```
ownerIntentMayBeAttributedToOwner
editorialSummaryMayDescribeWork
nonExplicitOwnerIntentMustNotBeInvented
curatorialInterpretationAllowedIfClearlyFramedAsInterpretation
biographicalFabricationForbidden
```

The model does not decide these permissions itself.

---

## 7. Work Story vs Sonic Details

Previously,

> どんな曲？

was bundled with:

- instruments
- BPM
- lyrics
- sonic texture

and therefore often fell directly into UNKNOWN.

V1 separates the intents.

### Work Story

Examples:

- どんな曲？
- どういう作品？
- テーマは？
- 何を描いてる？
- なぜ作ったの？
- 制作背景は？
- what is this song about?
- why was this made?

This route may use Editorial Knowledge and curatorial interpretation.

### Technical Sonic Details

Examples:

- どんな楽器？
- BPMは？
- ピアノ入ってる？
- 歌詞は？
- ボーカルは？
- どんな音色？

These still require actual source evidence.

Editorial prose does not magically fill them.

---

## 8. Count Chat Work Story route

When a visitor asks about a resolved work story:

```
query
→ stable work resolution
→ Knowledge Envelope
→ Luna Evidence Pack
→ Count persona prompt
→ evidence-bounded natural response
→ real work card
```

If the current query does not repeat the title, the last presented work may be used as conversational context.

Example:

```
User: Fuego en la Nocheってどんな曲？
Count: ...
User: なんで作ったの？
```

The second turn can remain attached to the same real work.

---

## 9. Voice policy

Work Story answers must not become a new disclaimer template.

Prompt rules:

- answer the question first
- 2–4 sentences
- conversational, not documentation
- humor 0–1 times when appropriate
- do not use “たぶん” every time
- do not begin every answer with “資料がありません”
- when owner intent is non-explicit, lead with the supported work itself before placing a short boundary on motive
- when editorial evidence is absent, do not lead with database/registration status; a clearly framed curatorial reading may lead
- technical UNKNOWN in Japanese should stay truthful without reverting to bureaucratic canned copy
- do not expose internal FACT / UNKNOWN labels
- keep foreign work titles intact
- no fake biography

### Explicit owner intent

For Fuego, Count may naturally say the owner explicitly wrote that the track was placed after a quiet/mythic work to create heat and contrast.

### Non-explicit owner intent

For Görli, Count may describe the verified work/editorial context, but if asked “why did 伯爵 make it?” it must not invent an owner motive.

It may add a clearly framed curatorial reading.

### Knowledge Gap

For a work such as Sun Without a Map, the model may still offer a playful reading based only on known title/catalog facts if clearly framed as its own interpretation.

It must not fabricate:

- travel memory
- breakup
- person
- event
- recording story
- hidden lyric
- instrument

---

## 10. Fallback behavior

If Luna fails:

### EXPLICIT

Use the reviewed owner-intent summary.

### editorial summary only

Use the summary and avoid inventing the owner's reason.

### no editorial source

State briefly that the creation story is still being excavated, then offer a curatorial reading as interpretation if appropriate.

Fallback is a last resort, not the normal voice.

---

## 11. Exhibition integration

`src/lib/exhibition-projection.ts` now uses editorial summary as a description fallback when a work has no direct description.

This means reviewed Letter knowledge can improve:

- Exhibition cards
- work browsing
- Count Chat

without writing invented semantic content into the base catalog.

Same-title wrong-ID works do not inherit the description.

---

## 12. Manifest integrity

`catalog-foundation.manifest.json` tracks `editorial-knowledge.json`.

V1 expected:

- itemCount: 14
- SHA-256:
  `eceb8b8711987b0da97b75cca72546b7e341eed387468f5ab208ed3a50de8f19`

The two new Letter hashes were checked against the current repository source files and matched exactly.

---

## 13. Local validation

Validator:

`scripts/validate-owner-source-knowledge-envelope.ts`

Checks:

- editorial item count
- Fuego stable-ID binding
- Fuego owner intent EXPLICIT
- Fuego production intent no longer unknown
- Görli owner intent NOT_EXPLICIT
- Görli production intent remains unknown
- Sun Without a Map remains editorial-null
- same-title fake ID receives no knowledge
- Luna pack carries policy booleans
- Work Story detection
- technical sonic detection
- Exhibition description projection
- alternate provider ID receives the same reviewed editorial packet

---

## 14. What V1 does not claim

V1 does not mean all works are now understood.

It does not mean:

- all lyrics are indexed
- all creative motives are known
- all audio has been analyzed
- all 421 indexed works have runtime Editorial Knowledge
- every AI interpretation is approved
- every Letter sentence is biography
- Sun Without a Map's meaning is known

V1 establishes the safe runtime path.

Coverage expansion comes next.

---

## 15. Next Gate

After Production verification:

`OWNER_SOURCE_KNOWLEDGE_COVERAGE_V1`

Goal:

- use Owner Source Index to select high-value works
- review strong sources
- promote reviewed packets
- expand runtime knowledge without title-only or AI-draft contamination
- prioritize frequently asked / newest / representative works
- keep automated mining non-runtime until provenance is reviewed

**Verdict target: OWNER_SOURCE_KNOWLEDGE_ENVELOPE_V1 = PASS_PRODUCTION**
