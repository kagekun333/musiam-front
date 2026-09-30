# CATALOG INTELLIGENCE GRAPH V1

Status: PASS_LOCAL candidate
Gate: CATALOG_INTELLIGENCE_GRAPH_V1
Authority: MUSIAM_MASTER_STRATEGY_LOCK_2026-09-30.md

## Purpose

Replace example-specific recommendation patches with a reusable discovery layer over real catalog works.

The first production problems motivating this Gate were:

- 「沖縄の曲ある？」
- 「ドイツ語の曲ある？」

The implementation deliberately does not add Okinawa-only or German-only branches to Count Chat.

## Architecture

Each work can receive discovery facets from `public/works/work-intelligence.json`.

Supported facet kinds:

- language
- country
- region
- place
- culture
- theme
- visual
- time
- search_alias

Every facet carries:

- canonical value
- visitor-facing label
- search aliases
- source type
- source reference
- confidence
- language scope (`primary` / `mixed` / `included` / `instrumental`)

These facets are discovery metadata only. They do not become `catalogAliases` and do not prove stable identity.

## Identity rule

Intelligence is attached only through explicit stable IDs:

- work.id
- existing catalogAliases

Title equality never attaches intelligence.

A visitor search alias such as 「瀬底島」 may help discover `Sesoko Island`, but it is not a merge key and is not automatically accepted as a stable action identity.

## Source policy

Current seed records use two source classes.

### TITLE_EXPLICIT_GEOGRAPHY / CURATED_GEOGRAPHY

Used when the public work title names a real place and the geographic mapping is explicit enough to curate.

Initial Okinawa examples include:

- Sesoko Island
- 古宇利オーシャンロード
- 風の記憶、久米島
- 伊良部サンセット
- 座間味サンセット
- 阿嘉島
- 久高島、祈り

### LEGACY_SSD_NOTE_EXPLICIT

Legacy SSD notes are not restored wholesale as semantic truth.

Only explicit, bounded claims are promoted into discovery facets.

Initial examples:

- Danke&Bitte: German language, Germany, Berlin
- Görli Garden: German language, Germany, Berlin
- BRANDENBURGER TOR: Germany, Berlin, instrumental
- Beijo A Beijo: Portuguese + Spanish
- DEMIURGOS: Ancient Greek
- DOMINE VIVO: Latin + Japanese
- Fuego en la Noche: Spanish + English
- GLOBAL MATSURI ANTHEM: Japanese + Chinese + Hindi + English
- WORLD STRIKE Thirteen Tongues: French, Arabic, Russian, Indonesian, Swahili, Bengali and additional languages as an explicitly multilingual work
- 사인 주세요 / 하늘 위로: Korean
- 心上人 / 赔偿节奏 / 龙之觉醒: Chinese
- Madre del Silenzio: Italian

This distinction prevents a German-place instrumental from being returned merely because the visitor asked for a German-language song.

## Runtime integration

`loadMergedWorksServer()` applies static intelligence after canonical catalog assembly.

`loadLiveMergedWorksServer()` reapplies the same sidecar after Apple overlay merge, allowing Apple-only release IDs to receive intelligence without title matching.

`selectOneRecommendation()` adds intelligence scoring to the existing title/tag/mood/genre logic.

There are no special if-branches for German or Okinawa queries.

## Initial local evidence

Validator:

`scripts/validate-catalog-intelligence.ts`

PASS evidence:

- canonical catalog count: 514
- intelligence records: 22
- verified language query coverage: 16 language labels
- German-language query returns a real catalog music work
- BRANDENBURGER TOR does not match German-language query
- Germany query can match BRANDENBURGER TOR
- Okinawa query returns a real catalog work
- Apple overlay Kume Island ID receives Okinawa intelligence
- same-title wrong-ID record does not inherit intelligence
- search alias remains separate from stable identity
- primary language outranks mixed/included language when both exist
- an included language is described as “contains that language” rather than falsely presented as a single-language work
- response-language instructions such as 「日本語で答えて」 do not influence work-language recommendation
- deterministic catalog copy preserves legitimate non-Japanese scripts; the LLM-only language sanitizer must not erase Korean/Chinese/Arabic work titles

## Known limitation

V1 establishes the generalized retrieval architecture and a verified seed set. It does not claim full language/geography/theme coverage for all works.

Coverage expansion belongs to OWNER_SOURCE_CORPUS / archive mining and controlled enrichment. New facets should be added as sourced data, not as new query-specific code.

## Next validation

Preview must verify real Count Chat responses for at least:

- 「沖縄の曲ある？」
- 「ドイツ語の曲ある？」
- 「フランス語の曲ある？」
- 「中国語の曲ある？」
- 「韓国語の曲ある？」
- 「イタリア語の曲ある？」
- 「ドイツの曲ある？」
- a generic nonmatching geography/language request
- no 5xx/error regression
