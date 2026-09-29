# 伯爵Chat Apple automatic release overlay

## Local gate boundary

This change keeps `loadMergedWorksServer()` as the static Catalog authority and adds a separate server runtime loader for the two live surfaces: `src/pages/api/chat-experience-v3.ts` and `src/pages/api/exhibition.ts`. The static loader and existing build tooling do not require Redis.

The watcher reads Apple’s public artist lookup for ABI伯爵 (`1811526635`, `entity=album`, `limit=200`, `country=US`, `sort=recent`). A collection is identified only by `apple-album-{collectionId}`. The existing Apple result diff and the shared projection used by `scripts/syncAppleMusicWorks.mjs` supply the stable-ID and public-field conventions. Titles are display values and never merge keys.

The committed DistroKid browser automation and Native Messaging bridge remain `DORMANT_NONPRIMARY`; this Gate does not debug or remove them.

Apple response fields are validated before projection. The overlay stores public release facts only, including the Apple collection ID, Apple Music URL, normalized `mzstatic` cover URL, release date authority, and Apple genre where returned. It does not store downloaded artwork, lyrics, instruments, BPM, production intent, or sonic analysis.

## Persistence and sync behavior

- Redis key: `musiam:release-overlay:v1`.
- The store uses the existing `UPSTASH_REDIS_REST_URL` / `KV_REST_API_URL` and `UPSTASH_REDIS_REST_TOKEN` / `KV_REST_API_TOKEN` nullish-precedence convention.
- The snapshot is bounded to 5,000 works and 4 MiB. It contains public catalog facts only; there is no customer, payment, or conversation data.
- The first successful sync stores `bootstrapCutoffDate` from the fresh static Catalog's latest dated music work. Only stable Apple IDs with `releaseDate > bootstrapCutoffDate` can be newly admitted. A pre-floor Apple ID absent from the static and existing overlay catalogs is `UNRESOLVED` with `HISTORICAL_BEFORE_BOOTSTRAP_FLOOR`; matching titles do not establish identity. The stored floor is retained on subsequent syncs even if the static cutoff moves.
- Sync reports `NEW`, `CHANGED`, `EXISTING`, and `UNRESOLVED` by stable Apple collection ID. Existing static IDs are not copied into the overlay. Changed public metadata updates the same stable ID.
- The report separates the raw response row count from `sourceCollectionCount`, exact existing stable IDs, post-floor new candidates, historical pre-floor unresolved items, and newly admitted overlay works.
- Sync merges prior overlay works into the next snapshot. A work omitted by a later lookup is retained. An Apple request failure, malformed prior snapshot, store read failure, or size limit prevents a replacement write.
- The live loader falls back to the base Catalog when Redis is missing, unavailable, or malformed. It reports `EMPTY`, `AVAILABLE`, `STALE`, `UNAVAILABLE`, or `MALFORMED`; a snapshot older than 48 hours is marked stale while its earlier works remain available.
- Exhibition keeps its existing Tokyo-date, future-release, and identity-conflict rules. Chat’s latest/recent selection uses the live merged Catalog. Apple genre is represented as an Apple public catalog fact; no audio properties are inferred.

## Schedule and production boundary

The configured Vercel Cron path is `/api/cron/apple-release-sync` at `30 0 * * *` UTC. It uses a fail-closed `Authorization: Bearer ${CRON_SECRET}` check. No secret is set by this local gate. Vercel invokes configured Cron Jobs on Production deployments, so the schedule becomes active only after the separate Production Readiness gate configures the secret and deploys the route.

Local fixture syncs inject an in-memory store. This gate performs no real Redis operation, deployment, environment mutation, push, DistroKid login/action, Computer Use, or provider call. `sourceTruncated` is based on the 200 collection cap (Apple's response may also contain an artist row). A capped response never proves full historical catalog completeness, which remains `NOT_PROVEN`.

Recent-window coverage is measured independently from historical completeness. When the oldest observed recent collection is on or before the current static cutoff, coverage is `REACHED` even if the 200-collection cap was reached; full historical completeness remains `NOT_PROVEN`. `BACKFILL_WINDOW_NOT_REACHED` means the recent response has not reached the static cutoff.

## Verification record

The earlier Codex-sandbox runtime request and its one bounded `curl` diagnostic failed at DNS resolution. That is retained as historical execution-environment evidence. The user has now supplied the post-fix read-only run from the connected Mac, using the same canonical repository and watcher command. Apple returned 201 raw rows (one artist plus 200 collections): 70 exact existing stable IDs, 68 post-floor new releases, and 62 unmatched historical items held as `UNRESOLVED`. The response was truncated at 200 collections, with observed dates `2025-11-17` through `2026-09-29`; the latest new work was `apple-album-6808806776`, `Sun Without a Map`, released `2026-09-29`.

The fresh base contained 514 works (380 music, 134 books), with cutoff and persisted `bootstrapCutoffDate` both `2026-08-14`. Recent-window coverage is `REACHED`; full historical Apple catalog completeness remains `NOT_PROVEN`. `oneTimeHistoricalBackfillRequired` is `false` for this post-cutoff release window, without asserting full-history completeness. The external run used one fake-store read and write, with zero real Redis operations and zero provider calls. Overlay/bootstrap, request-URL, historical admission, latest-work, persisted-floor, stable-ID update, omission-retention, Chat, Exhibition, cron-auth, and lookup-classification fixtures pass; explicit-file typecheck, scoped lint, diff check, and ops JSON validation pass. The Gate is `PASS_LOCAL`. Production Readiness has not started; no Production or provider operation was performed.

See [`ops/product/count-chat-apple-release-overlay-20260929.json`](../../ops/product/count-chat-apple-release-overlay-20260929.json) for the local gate result and evidence record.
