# OWNER SOURCE CORPUS INDEX V1

**Gate:** `OWNER_SOURCE_CORPUS_INDEX_V1`
**Status:** PASS_LOCAL candidate
**Authority:** `MUSIAM_MASTER_STRATEGY_LOCK_2026-09-30.md`
**Depends on:** `OWNER_SOURCE_CORPUS_PROBE`

## 1. Purpose

Owner Source Corpus Probe proved that useful source material exists, but also proved that source quality is uneven.

Index V1 solves a narrower problem:

> **Given a MUSIAM work, where should an agent look next?**

It does not write runtime knowledge and does not decide artistic truth.

It creates a non-runtime searchable source index over local archives while preserving source provenance and uncertainty.

---

## 2. Runtime boundary

Index V1 is deliberately excluded from the Vercel application payload.

Files:

- `scripts/owner-source/build-owner-source-index.ts`
- `scripts/owner-source/validate-owner-source-index.ts`
- `ops/product/owner-source-corpus-index-v1.json`

`scripts/owner-source/` is excluded by `.vercelignore`.

The generated index must not be imported by Count Chat runtime until a later reviewed Gate.

---

## 3. Inputs

### Static/runtime catalog authority

The builder begins from the deduped canonical static catalog.

Current build indexed:

- 421 work identities after display-level dedup plus probe-only works
- 5 reviewed representative Evidence Packets

The index does not treat title equality as stable identity proof.

### Local archive

Current automatic archive surface:

`/Users/kagekun/Desktop/MUSIAM_CODEX_EXPORT/messages`

Observed:

- 343 markdown session files
- 10,400 parsed USER/ASSISTANT sections

### Reviewed probe packets

The builder also consumes:

`ops/product/owner-source-corpus-probe-20260930.json`

This is how reviewed Library/official-source conclusions enter the non-runtime index without pretending the local Codex archive contains those sources.

---

## 4. Binding policy

Two binding levels exist.

### REVIEWED_STABLE_ID_PACKET

Used only for sources reviewed in the Probe and explicitly bound to a stable work ID.

This may later become a Knowledge Envelope input.

### UNVERIFIED_TITLE_CANDIDATE

Used for automatic archive matches.

A title appearing in an archive only means:

> “this section may be relevant to this work.”

It does **not** mean:

- this is definitely the same work;
- the section is owner-authored;
- the statement is true;
- the statement is approved;
- the statement may enter runtime.

Title-only candidates require further review.

---

## 5. Role classification

Codex message files are parsed by section.

### OWNER_MESSAGE_CANDIDATE

A `## USER` section that contains a work title and does not look like a Codex approval/wrapper prompt.

This is still only a candidate.

The word “USER” in a Codex transcript is not by itself proof that every embedded statement is a direct 伯爵 statement.

### AI_MESSAGE_CANDIDATE

A normal `## ASSISTANT` section.

Useful for locating:

- prior interpretation;
- prior tooling;
- prompts;
- production plans;
- derived semantic work.

Never becomes owner intent automatically.

### WRAPPER_OR_APPROVAL_CONTEXT

Sections containing patterns such as:

- “The following is the Codex agent history…”
- approval requests;
- action-assessment wrappers;
- injected system/tool context.

These are aggressively demoted.

This classification proved important: a large fraction of apparent “USER” matches in the export are actually approval wrappers containing an embedded agent transcript.

---

## 6. Privacy / payload policy

The index does not copy conversation bodies.

Each automatic candidate stores only:

- archive name
- relative source path
- role
- section metadata/time
- line start/end
- matched title
- evidence-signal labels
- numerical score
- SHA-256 of the source section
- binding status

It intentionally does **not** store:

- raw conversation text
- full lyrics
- long excerpts
- personal details

An authorized agent can open the original locator later when a Knowledge Envelope is being reviewed.

---

## 7. Evidence signals

The index detects bounded signals such as:

- lyrics
- Suno
- prompt
- cover
- MV
- creation
- revision
- theme
- audio
- reason/inspiration
- title
- language

Signals increase search priority only.

They do not prove that a claim is correct.

---

## 8. Initial build evidence

Command:

```bash
./node_modules/.bin/tsx scripts/owner-source/build-owner-source-index.ts
./node_modules/.bin/tsx scripts/owner-source/validate-owner-source-index.ts
```

Initial V1 result:

- works indexed: **421**
- reviewed packets: **5**
- works with local archive candidates: **272**
- files scanned: **343**
- sections scanned: **10,400**
- title mentions: **2,207**
- owner-message candidates: **41**
- AI-message candidates: **234**
- wrapper/approval candidates: **924**
- generated index size: **1,038,172 bytes**
- content fingerprint: **3bbc8580443606fb3b6756f752a1125615db4bbbc0e07a179f993328a0f97753**
- repeated rebuild fingerprint equality: **PASS**

The high wrapper count is a useful result, not an error: it demonstrates why raw archive search cannot safely equate `USER` with owner truth.

---

## 9. Representative quality audit

### Fuego en la Noche

Reviewed packet:

- STRONG
- owner intent verified from owner-published media
- official lyrics available

Automatic local Codex candidate count may be zero.

This is acceptable and proves that Library/official sources can be stronger than the local Codex transcript.

### Görli Garden

Reviewed packet:

- strong official content
- owner intent not yet directly verified

Automatic candidates are dominated by wrapper contexts and a small number of AI-message candidates.

The index correctly does not promote those wrappers to owner statements.

### Sesoko Island

Reviewed packet:

- partial
- owner intent gap

Automatic index found a small AI candidate set, but no direct owner candidate.

Correct behavior: keep the gap.

### Sun Without a Map

Reviewed packet:

- partial
- owner intent gap

Many apparent USER hits were actually approval wrappers containing operational histories.

Correct behavior: they remain wrapper candidates.

### 星海の眠り

Reviewed packet:

- partial
- owner intent gap

Automatic matches are wrapper-heavy.

Correct behavior: no invented cosmic creation story.

---

## 10. Source-strength rule

A future Knowledge Envelope builder should prefer:

1. reviewed OWNER_MESSAGE / OWNER_PUBLISHED_MEDIA
2. reviewed OFFICIAL_RELEASE_DATA
3. reviewed APPROVED_ARTIFACT
4. reviewed AI_DERIVED_FROM_OFFICIAL_SOURCE
5. unreviewed OWNER_MESSAGE_CANDIDATE
6. AI_MESSAGE_CANDIDATE
7. WRAPPER / OPERATIONAL source
8. no source → KNOWLEDGE_GAP

A lower source class must never silently overwrite a stronger conflicting source.

Contradictions become an explicit review item.

---

## 11. Library integration

ChatGPT Library is not directly scanned by the local index builder.

The Probe proved that Library can hold stronger sources than the local Codex archive, including:

- signed Letters;
- official distribution exports;
- lyrics;
- historical project snapshots.

Future ChatGPT/Work agents may augment a work packet with Library sources and then write a reviewed packet into the repo.

The local builder should then consume only the reviewed packet, not assume it can query the Library itself.

---

## 12. Future original ChatGPT export

A raw `conversations.json` / ChatGPT data export was not found in the searched Desktop/Documents/Downloads locations during this Gate.

If the original ChatGPT export is later supplied or located, it should become a new source adapter.

It must preserve:

- conversation ID
- message ID
- author role
- timestamp
- exact source locator
- project/chat identity when available

and distinguish actual user messages from model messages.

---

## 13. Automation contract

When Count Chat later detects a work Knowledge Gap, the autonomous process should be:

```
workId
→ query Owner Source Index
→ use reviewed packet first
→ inspect top unresolved candidates if needed
→ search Library / external owner sources if allowed
→ classify source
→ build Evidence Packet
→ contradiction check
→ human review only if ambiguous/high-impact
→ Knowledge Envelope candidate
```

The index is a locator, not an oracle.

---

## 14. What V1 explicitly does not do

V1 does not:

- modify Count Chat runtime;
- publish lyrics;
- infer biography;
- infer owner intent from title;
- approve AI-written prose;
- merge works by title;
- expose archive conversation contents publicly;
- treat every USER transcript as 伯爵;
- rewrite Catalog Intelligence.

---

## 15. PASS criteria

V1 passes when:

- 400+ catalog work identities are indexed;
- all five reviewed Probe works are present;
- reviewed packets retain stable-ID binding;
- automatic title matches remain `UNVERIFIED_TITLE_CANDIDATE`;
- wrapper prompts are separated;
- no full source body is copied into the index;
- no unreviewed candidate is labelled `OWNER_MESSAGE`;
- scripts remain non-runtime;
- output can be rebuilt deterministically from the same archive state.

**Verdict: OWNER_SOURCE_CORPUS_INDEX_V1 = PASS_LOCAL**
