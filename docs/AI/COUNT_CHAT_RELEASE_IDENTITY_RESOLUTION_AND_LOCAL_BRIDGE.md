# Count Chat Release Identity Resolution and Local Bridge

## Evidence status

- `DISTROKID_REAL_PAGE_IDENTITY_CAPTURE = PASS` for albumuuid `D631F8A9-14A5-40E7-867D01081E026EF1`, UPC `700989739020`, ISRC `QT6J32604414`, artist `ABI伯爵`, raw title `Ⅶ`, label `Hakusyaku Lab`, genre `Electronic`, Spotify release URL, and specific HyperFollow URL.
- `DISTROKID_DETAIL_DATE_CAPTURE = UNRESOLVED_NONBLOCKING`. `releaseDate` and `uploadDate` were null in the real capture. No title-derived or inferred date is permitted. `uploadDate` is informational and never gates Catalog registration, latest-release selection, recommendations, identity, or the knowledge envelope.
- The earlier Apple UPC lookup for the VII capture could not reach Apple because DNS returned `ENOTFOUND`. Result: `PUBLIC_RELEASE_DATE_PENDING`. No public release date or Apple collection identity is asserted by that attempt.
- Capture evidence is metadata-limited. It does not mean all DistroKid metadata was captured.

## Field authority and identity

DistroKid is authoritative for albumuuid, UPC, ISRC, artist, raw title, label, primary/secondary genre, HyperFollow, and a release date only when it explicitly captured that date. Apple/public distribution data is authoritative for its public release date, collection ID, Apple URL, artwork, Apple genre, and explicitly returned track information. Owner/Human verified corrections and creator-provided genre/context remain explicit authority. Missing values stay null.

Identity resolution order is: existing explicit `workId` or canonical mapping; exact ISRC; exact UPC or source release identifier; exact Apple collection ID; explicit alias. A title-only match never identifies a work. UPC is the primary DistroKid-to-Apple bridge.

For a release with no DistroKid `releaseDate`, a unique Apple UPC result matching the exact artist and, when returned, the ISRC may supply the public release date for a released Catalog projection. If Apple lookup is unavailable, ambiguous, has no matching result, or returns no date, retain `releaseDate = null` and status `PUBLIC_RELEASE_DATE_PENDING`. A future Apple date does not establish an upcoming release date. Upcoming dates require explicit DistroKid edit-form capture or Owner-provided verified metadata. The `uploadDate` field is optional throughout.

## Local inbox transport

The extension sends only to `http://127.0.0.1:43127`. The receiver binds to `127.0.0.1`, requires the exact Chrome extension origin, and accepts only the declared preflight methods and headers. The extension manifest grants that loopback host and its extension-page CSP permits only that loopback connection.

To check the origin contract after reloading the unpacked extension:

1. Open `chrome://extensions`, enable Developer mode, and copy the MUSIAM DistroKid Release Capture ID.
2. Read the `--extension-origin=chrome-extension://…` value used to start the local receiver.
3. Compare them without sending release data:

   ```sh
   node scripts/check-release-inbox-origin.mjs \
     --extension-id=<32-character-Chrome-extension-ID> \
     --configured-extension-origin=chrome-extension://<32-character-Chrome-extension-ID>
   ```

The helper prints `MATCH`, `MISMATCH`, or an input-validation status. On mismatch, restart the receiver with the origin copied from the current extension ID. Never widen the listener beyond `127.0.0.1` or add `localhost`, wildcard origins, or remote interfaces.

The popup reports only normalized transport categories or numeric HTTP statuses, such as `LOCAL_INBOX_CHALLENGE_FETCH_FAILED`, `LOCAL_INBOX_CHALLENGE_HTTP_403`, `LOCAL_INBOX_POST_HTTP_500`, `LOCAL_INBOX_ORIGIN_REJECTED`, `LOCAL_INBOX_SESSION_REJECTED`, and `LOCAL_INBOX_INVALID_PAYLOAD`. It never renders exception text, response bodies, nonce values, headers, or file paths.

## Gate boundary

This gate adds source policy, deterministic fixtures, and a synthetic loopback transport validation. It does not apply Catalog data or write `works.json`. A successful dry run is not an import or Catalog application. Batch backfill is a separate next Gate and requires its own bounded review.
