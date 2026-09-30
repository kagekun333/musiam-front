# OWNER SOURCE CORPUS PROBE

**Gate:** `OWNER_SOURCE_CORPUS_PROBE`  
**Status:** PASS_PROBE candidate  
**Authority:** `MUSIAM_MASTER_STRATEGY_LOCK_2026-09-30.md`

## 1. Purpose

伯爵作品について、Web上の一般情報が少なくても、

- 過去のChatGPT / Codex archive
- Suno / creation logs
- official lyrics
- Letters / Intelligence Underground
- published product artifacts
- artwork briefs
- distribution records

から、作品ごとの知識を安全に復元できるかを検証する。

目的は「空欄をAIで埋める」ことではない。

> **何が本人の発言で、何が公式作品データで、何がAIの解釈で、何がまだ不明かを失わずに知識化すること。**

---

## 2. Source classes

### OWNER_MESSAGE

伯爵本人の直接発言。

最も強い制作意図ソース。

例：

- 「こういう気持ちで作った」
- 「この場所をテーマにした」
- 「こういう音にしたかった」

### OWNER_PUBLISHED_MEDIA

伯爵署名のLetter、blog、公開文章等。

本人名義で公開された制作背景は強いOwner Sourceとして扱える。

### OFFICIAL_RELEASE_DATA

DistroKid / Apple / own release export等の、

- title
- release date
- UPC / ISRC
- official lyrics
- public links
- credits

等。

歌詞内容は作品内容の強い根拠だが、歌詞テーマをそのまま「作者の実人生」へ変換しない。

### APPROVED_ARTIFACT

実際に作成・承認・公開された、

- 伯爵の魔導書
- artbook
- product dossier
- official MV plan
- published exhibition text

等。

AI支援で制作されている可能性があるため、文章の一文一文を自動的に「伯爵本人が語った事実」とは扱わない。

### AI_DERIVED_FROM_OFFICIAL_SOURCE

AIがofficial lyrics / audio / artwork等を分析した結果。

例：

- 歌詞テーマ要約
- MV構成の分析
- visual motifs
- 音声分析

これは有用だが、**作者意図ではない。**

### AI_DRAFT

過去のChatGPT / Codex / その他モデルが提案しただけの文章。

未承認ならOwner Sourceではない。

### OPERATIONAL_LOG

release sync、DistroKid upload、catalog update、build等。

identity / date / workflowの証拠にはなるが、作品意味の証拠にはしない。

### KNOWLEDGE_GAP

十分な根拠が見つからなかった状態。

これは失敗ではない。

---

## 3. Critical rule — assistant suggestion ≠ owner intent

過去会話の中に、

> 「この曲は○○を表現しています」

というAI回答が存在しても、それだけではOwner Sourceへ昇格させない。

必要なのは最低でも、

- 直前のユーザー制作指示に明確に基づく
- official lyrics / official assetに基づく
- published owner artifactとして採用済み

等のprovenance。

AIが自分で作った美文を後のAIが「伯爵本人の制作背景」として引用する循環を禁止する。

---

## 4. Stable identity binding

Evidence Packetはtitleだけで作品へ結合しない。

優先：

1. canonical/runtime workId
2. explicit catalogAlias
3. UPC / ISRC / Apple collection ID / Spotify ID等のstable identifier
4. reviewed mapping

title-only bindingは禁止。

同名作品・表記違い・duplicate provider recordsを誤結合しない。

---

## 5. Five-work probe

### Fuego en la Noche — STRONG

Runtime workId:

`fuego-en-la-noche-228`

Evidence:

- signed/published ABI伯爵 Letter
- official release lyrics and identifiers
- archived evidence of a produced 伯爵の魔導書 artifact

The published Letter directly supports:

- a deliberate contrast from a quieter/mythic preceding work
- the value of range/contrast in the館
- night as both sleeping time and a time of burning/intensity

This is the probe's strongest owner-intent example.

### Görli Garden — STRONG CONTENT / MEDIUM OWNER INTENT

Runtime workId:

`g-rli-garden-149`

Evidence:

- full official German lyrics
- prior MV workflow reading `lyrics.txt`
- AI analysis derived from those lyrics

The lyrics strongly support:

- Berlin park setting
- community
- freedom
- non-judgment
- multicultural coexistence

But no direct owner statement saying:

> “I created this song because…”

was confirmed in the probe.

Therefore lyrical meaning may be discussed confidently; autobiographical creation motive may not.

### Sesoko Island — PARTIAL

Runtime workId:

`apple-album-6800129451`

Evidence:

- release identity
- geographic title / curated Okinawa discovery mapping
- operational archive showed Sesoko-related image research

Not yet confirmed:

- owner creation motive
- lyrics
- direct creation conversation

An image search does not prove artistic intent.

### Sun Without a Map — PARTIAL / KNOWLEDGE GAP

Runtime workId:

`apple-album-6808806776`

Evidence:

- public release identity/date/link
- generic jacket-generation brief using only the title
- prior staging records explicitly left semantic understanding unknown

The generic cover brief does **not** prove song meaning.

Do not turn the title “Sun Without a Map” into an invented owner philosophy.

### 星海の眠り　〜Slumber in the Star Sea〜 — PARTIAL

Runtime workId:

`spotify-album-79CuhhEhb0GtBzgkk7fwsY`

Evidence found in probe:

- catalog identity/date
- cover/title references
- historical MUSIAM recommendation usage

Direct creation background was not confirmed.

---

## 6. Conversation behavior when source is missing

Knowledge Gap must not force a boring canned answer.

Bad:

> 制作時の具体的な記録は残っていません。ただ、いま私がこの作品を語るなら——

Repeated mechanically, this becomes a disclaimer bot.

Instead Count Chat may:

1. answer known facts naturally;
2. distinguish opinion only when necessary;
3. use playful curatorial interpretation;
4. ask an interesting follow-up;
5. offer listening/opening action.

Example style:

> 「これはまだ伯爵本人の制作メモを掘り切れてません。なので史実っぽい顔では語りません。僕の読みなら？ あります。たぶん結構あります。」

or:

> 「理由はまだ発掘中。でも、このタイトルだけで勝手に人生訓を始めるほど僕も無謀じゃないです。聴きながら一緒に当てます？」

These are **examples, not scripts**.

Do not repeat the same uncertainty joke every time.

---

## 7. Lyrics handling

Official lyrics can be used internally for:

- language
- theme
- entities
- places
- recurring motifs
- semantic retrieval
- recommendation relation
- bounded work explanation

Do not copy full lyrics into general public knowledge records by default.

Store:

- source locator
- compact semantic summary
- short permitted excerpts only when needed
- language and structural facts
- confidence

The source itself remains the authority.

---

## 8. Archive mining pipeline

```
COUNT CHAT KNOWLEDGE GAP
        ↓
WORK ID
        ↓
LOCAL ARCHIVE SEARCH
        ↓
LIBRARY / CHAT EXPORT SEARCH
        ↓
OFFICIAL RELEASE DATA
        ↓
OWNER MEDIA
        ↓
SOURCE CLASSIFICATION
        ↓
EVIDENCE PACKET
        ↓
CONTRADICTION CHECK
        ↓
KNOWLEDGE ENVELOPE
        ↓
RUNTIME CANDIDATE
```

Runtime integration must happen only after the packet passes provenance checks.

---

## 9. Search priority

For a work needing enrichment:

1. exact stable IDs / UPC / ISRC
2. exact title and known aliases
3. owner conversation around release date
4. Suno / lyrics / audio project folder
5. Letters / blog / social post
6. cover / MV brief
7. official lyrics / release export
8. archived AI analysis
9. public web if needed

Search should prioritize owner-created source over generic public inference.

---

## 10. Local archives discovered

### Codex export

`/Users/kagekun/Desktop/MUSIAM_CODEX_EXPORT`

Contains:

- `index.tsv`
- `messages/`
- upload chunks

Useful for locating prior work but heavily operational.

### Filtered MUSIAM history

`/Users/kagekun/Desktop/Hakusyaku_Cowork/03_CASH_HakusyakuMusiam/CodexMUSIAM歴史`

Contains:

- `MUSIAM_FILTERED_INDEX.tsv`
- `MUSIAM_FILTERED_CHUNK_001.md`
- `MUSIAM_FILTERED_CHUNK_002.md`

### PCHAN project memory

`/Users/kagekun/Desktop/PCHAN_PROJECT_MEMORY/00_MUSIAM_FRONT`

Useful for historical file/artifact locations and old repository state.

### ChatGPT Library

The Library probe surfaced:

- owner-signed Letters
- official distribution exports
- lyrics
- work history
- Codex chunks

Library search is therefore a useful second retrieval surface when local archives are incomplete.

---

## 11. Probe conclusion

The Owner Source Corpus strategy is viable.

But source quality is uneven.

The correct next step is **not** to write descriptions for all works immediately.

The next step is:

> `OWNER_SOURCE_CORPUS_INDEX_V1`

Build a searchable non-runtime source index that:

- identifies works by stable ID
- stores source provenance
- separates owner / official / artifact / AI-derived / gap
- ranks source strength
- can create Evidence Packets automatically
- never promotes AI suggestions to owner intent
- can be invoked by ChatGPT / Work / Codex when Count Chat detects a knowledge gap

Only after that index is audited should selected envelopes move into Count Chat runtime.

---

## 12. PASS criteria achieved

- local Codex archive found
- filtered MUSIAM archive found
- PCHAN project memory found
- Library sources found
- direct owner-published source found
- official lyrics source found
- AI-derived-vs-owner distinction proven
- recent-release semantic gap proven
- five representative works classified
- no runtime mutation
- no Production mutation
- no protected-root access required for probe

**Verdict: OWNER_SOURCE_CORPUS_PROBE = PASS**
