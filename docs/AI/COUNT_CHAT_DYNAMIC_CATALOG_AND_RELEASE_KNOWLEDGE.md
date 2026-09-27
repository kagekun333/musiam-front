# Count Chat Dynamic Catalog and Release Knowledge

## Gate result

This Gate adds a runtime-derived knowledge envelope and release-selection helpers over `loadMergedWorksServer()`. The catalog is loaded at request/validation time; no release count or title is stored as a runtime constant. The current tracked catalog has no explicit distribution `primaryGenre`, `secondaryGenre`, UPC, or ISRC fields in its merged projection. Existing HyperFollow URLs and Apple lookup enrichment are not a connected DistroKid release-metadata feed.

`DISTROKID_FEED_STATUS=NOT_CONNECTED`

`INGESTION_PIPELINE=READY`

No DistroKid login, scraping, guessed API, audio analysis, or provider call is part of this Gate.

## Source authority

- **RELEASE FACT**: only explicitly sourced distribution fields (`source`, `artist`, `releaseDate`, genres, ISRC, UPC, release/store identifiers, URLs). Missing values stay null/unknown.
- **CATALOG METADATA**: current runtime Catalog title, medium/type, `releasedAt`, tags, mood tags/seeds, artwork, and recorded public actions.
- **INTERPRETATION**: conversational relevance inferred from the bounded candidate evidence pack. It is never rewritten as a fact.
- **UNKNOWN**: sonic attributes, lyrics, rights, intent, or any absent source field. Genre does not establish instruments, tempo, vocals, lyrics, or exact sound.

Legacy `releasedAt` is labeled as MUSIAM catalog evidence. It is usable for current catalog ordering, but is not silently upgraded to a DistroKid fact.

## Approved future ingestion contract

The future feed is an operator-supplied CSV/JSON/export or separately approved connector. A normalized row may provide:

```json
{
  "source": "approved-export-name",
  "workId": "stable-catalog-id",
  "canonicalWorkId": null,
  "alias": null,
  "title": "display only; never an identity key",
  "artist": null,
  "releaseDate": null,
  "primaryGenre": null,
  "secondaryGenre": null,
  "isrc": null,
  "upc": null,
  "releaseId": null
}
```

The source label is supplied by the approved importer and retained on projected distribution metadata. It must not be inferred from a URL or a matching title.

Identity resolution order is exact work ID, explicit canonical mapping, unique exact ISRC, unique exact UPC/release identifier, then an explicit recorded alias. Title-only and ambiguous identifier rows remain `UNRESOLVED` for human review. A row is never joined to the first matching title.

Incremental state is keyed by stable `workId`: `NEW` has no prior fingerprint, `CHANGED` has a different metadata fingerprint, `UNCHANGED` reuses the prior projection, and `UNRESOLVED` has no safe identity. Only `NEW`/`CHANGED` request projection refresh. A title edit on an identified work is `CHANGED`, not a new identity.

## Runtime behavior

`buildWorkKnowledgeEnvelope` projects one stable work without copying the full catalog. `latestReleasedWorks` uses current release-date fields, excludes future dates, filters by medium, and orders deterministically. Chat handles direct latest-release questions from the request-time catalog. “Another work” excludes the last/recent recommendation IDs, while explicit rejection is session-scoped and only clear rejection language sets it. No personal profile database is introduced.

For sonic questions, the current knowledge has no verified audio-analysis evidence. The response states that those details are unknown and includes only the selected work's recorded public listen action when one exists. The optional `audioAnalysis` extension remains null; no analysis is generated.

The Luna evidence pack contains one identified candidate, its known catalog/distribution fields, recorded actions, and explicit unknowns. It does not send the full catalog. A recorded URL proves only that a URL is recorded, not playback, availability, rights, or full-track access.
