# Count Chat DistroKid release ingestion

`public/works/distrokid-release-metadata.json` is a canonical, source-neutral metadata sidecar. It keeps distributor rows separate from `works.json`. CSV or JSON sources are normalized to this shape before import:

```json
{
  "schemaVersion": 1,
  "releases": [{
    "releaseSource": "DistroKid",
    "sourceReleaseId": "source-provided-id-or-null",
    "title": "Release title or null",
    "artist": "Artist or null",
    "releaseDate": "YYYY-MM-DD or null",
    "primaryGenre": "raw distributor value or null",
    "secondaryGenre": "raw distributor value or null",
    "isrc": "ISRC or null",
    "upc": "UPC or null",
    "artworkRef": "source reference or null",
    "publicUrls": [],
    "sourceObservedAt": "ISO timestamp or null"
  }]
}
```

Optional `releaseType`, `releaseIdentifiers`, and explicit work mapping fields can preserve extra source identifiers. Genre values are retained as supplied; this ingestion layer does not map them to MUSIAM semantic axes.

Run `node --import tsx scripts/import-distrokid-release-metadata.ts --input=/path/to/canonical.json` for a dry run. A `.csv` input uses canonical field names in its header; `publicUrls` and `releaseIdentifiers` cells contain JSON. `--apply` explicitly writes only the canonical sidecar. Re-running the same import is idempotent. Unresolved title-only rows are reported and never merged.

Existing work projection requires explicit `workId`/canonical mapping, exact ISRC, an explicit release identifier, a unique UPC/release match, or an explicit alias. Rows with a source identity but no existing work are retained as `PENDING_CATALOG_COMPLETION`; they do not become runtime works until a human supplies a stable MUSIAM ID, title/type, and a recorded public action through the normal Catalog process. No artwork, URL, genre, identity, or action is fabricated. The current runtime release index is calculated from eligible Catalog works on every load.

This repository has no verified DistroKid metadata connector. Current public help material documents downloadable CSV earnings reports, which are financial reports rather than a release metadata feed. Do not treat those as a catalog export or implement an undocumented API. A future official connector or human-approved canonical export can use the same importer contract.
