# Count Chat release automation foundation

This Gate adds a local foundation for following DistroKid releases through Apple public metadata and into the runtime Catalog. The extension captures only allowlisted release fields after an explicit click. It does not save page HTML, transmit to an external service, or change a DistroKid account. The inbox and Catalog application steps remain separate human actions.

## Capture extension

Load `tools/distrokid-capture-extension/` as an unpacked extension from Chrome's extensions page. The extension has no cookies, storage, or background permissions and injects its parser only after the popup is opened and a capture button is clicked. Use **Capture this page** for the current page, or **Capture All Visible Releases (max 20)** on My Music. Batch requests stay on the DistroKid origin, wait 250 ms between pages, and report per-page failures. A result is only kept in the popup until the user selects Download or Send to local inbox.

The extension emits the canonical `{ schemaVersion: 1, releases: [...] }` format. It reads visible title, artist, status, release date, label, upload date, UPC, ISRC, album UUID, primary/secondary genre fields when present, track title/ISRC, and allowlisted public music/HyperFollow links. Missing fields remain null. It rejects password, hidden, file, token, cookie, secret, payment, account-security, email, and phone fields; the raw HTML is not written to disk.

## Optional local inbox

The bridge is not installed or started by this Gate. After separately choosing an inbox location outside the repository, start it manually with the unpacked extension ID shown by Chrome:

```sh
node --import tsx tools/release-inbox/receive.mjs \
  --inbox="$HOME/Library/Application Support/HakusyakuMUSIAM/release-inbox" \
  --extension-origin=chrome-extension://<32-character-extension-id>
```

It binds only to `127.0.0.1:43127`, accepts only the exact configured extension origin, requires a one-use random challenge valid for 60 seconds, limits batches to 20 records and request bodies to 1 MiB, validates the canonical schema, and writes mode-0600 JSON files under a mode-0700 inbox directory. It does not update Catalog files. If the bridge is not running, use the extension's Download option.

## Import and Apple resolution

Inspect downloaded/inboxed canonical JSON with the importer first. A normal invocation is dry-run; `--apply` writes only the distributor metadata sidecar after its exact change set has been reviewed. Released records can then be passed to `scripts/resolve-distrokid-release-inbox.mjs`. Upcoming records are classified as UPCOMING and skip Apple lookup. Released rows use UPC lookup and verify exact artist, available track ISRC, and release date; title is never identity authority. The default run is a dry-run, and applying requires `--apply --confirm-new=<exact sorted apple-album IDs>` from that reviewed output. Applying stores only confirmed Apple resolution metadata; the runtime loader derives stable `apple-album-{collectionId}` works from it. Do not use apply when lookup is unavailable or the candidate output has not been reviewed.

The artist-wide Apple sync is supplemental discovery. `scripts/syncAppleMusicWorks.mjs` defaults to dry-run and compares stable Apple IDs rather than release dates. A result count at the 200-item limit is `APPLE_ARTIST_LOOKUP_COMPLETENESS = NOT_PROVEN`; no completeness claim follows from a capped response. Its explicit `--apply` mode also requires `--confirm-new=<exact sorted apple-album IDs>` copied from a reviewed dry-run, then writes candidate work rows and downloads Apple artwork.

Apple UPC resolution records the Apple genre separately from DistroKid's supplied genre. Store links and artwork URLs are retained only when they use HTTPS Apple hosts. A future release never projects to runtime Catalog. The chat's upcoming-release answer uses the nearest future date from distributor metadata and says when a public store link is not yet verified; latest-released selection remains bounded by Tokyo's current date.

## Evidence boundary for this Gate

The VII Apple lookup was attempted read-only but the network request failed with DNS `ENOTFOUND`; this is `LOOKUP_UNAVAILABLE`, not `NO_RESULT` or `PUBLIC_STORE_PROPAGATION_PENDING`. The Canvas release is upcoming and therefore skips lookup. No distributor login, account mutation, Catalog apply, local inbox installation, provider call, deployment, or external write is part of this Gate.
