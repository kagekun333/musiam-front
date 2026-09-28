# Count Chat release automation foundation

This Gate adds a local foundation for following DistroKid releases through Apple public metadata and into the runtime Catalog. The extension captures only allowlisted release fields after an explicit click. It does not save page HTML, transmit to an external service, or change a DistroKid account. The inbox and Catalog application steps remain separate human actions.

## Capture extension

Load `tools/distrokid-capture-extension/` as an unpacked extension from Chrome's extensions page. The extension has no cookies, storage, or background permissions and injects its parser only after the popup is opened and a capture button is clicked. Use **Capture this page** for the current page, or **Capture All Visible Releases (max 20)** on My Music. Batch requests stay on the DistroKid origin, wait 250 ms between pages, and report per-page failures. A result is only kept in the popup until the user selects Download or Send to local inbox.

The extension emits the canonical `{ schemaVersion: 1, releases: [...] }` format. It reads visible title, artist, status, release date, label, upload date, UPC, ISRC, album UUID, primary/secondary genre fields when present, track title/ISRC, and allowlisted public music/HyperFollow links. Missing fields remain null. It rejects password, hidden, file, token, cookie, secret, payment, account-security, email, and phone fields; the raw HTML is not written to disk.

## Local inbox transport

The extension now uses Chrome Native Messaging through `com.hakusyaku.musiam.release_inbox`. The host accepts only `ping` and `saveReleaseBatch`, validates batches with the canonical DistroKid parser, caps messages at 1 MiB and batches at 20 records, and writes canonical JSON to `$HOME/Library/Application Support/HakusyakuMUSIAM/release-inbox` with directory mode 0700 and file mode 0600. It does not update Catalog files or save page HTML.

`scripts/install-musiam-release-native-host.mjs` installs the exact extension origin in the macOS user-level Chrome NativeMessagingHosts directory. This installer has not been run as part of the implementation Gate; Chrome install and extension reload remain a Human Gate. If the native host is absent, the extension reports `NATIVE_HOST_NOT_INSTALLED`; it does not fall back to HTTP.

The former `tools/release-inbox/receive.mjs` localhost HTTP receiver is retained as historical code. It is deprecated and must not be started in the normal release-capture workflow.

## Import and Apple resolution

Inspect downloaded/inboxed canonical JSON with the importer first. A normal invocation is dry-run; `--apply` writes only the distributor metadata sidecar after its exact change set has been reviewed. Released records can then be passed to `scripts/resolve-distrokid-release-inbox.mjs`. Upcoming records are classified as UPCOMING and skip Apple lookup. Released rows use UPC lookup and verify exact artist, available track ISRC, and release date; title is never identity authority. The default run is a dry-run, and applying requires `--apply --confirm-new=<exact sorted apple-album IDs>` from that reviewed output. Applying stores only confirmed Apple resolution metadata; the runtime loader derives stable `apple-album-{collectionId}` works from it. Do not use apply when lookup is unavailable or the candidate output has not been reviewed.

The artist-wide Apple sync is supplemental discovery. `scripts/syncAppleMusicWorks.mjs` defaults to dry-run and compares stable Apple IDs rather than release dates. A result count at the 200-item limit is `APPLE_ARTIST_LOOKUP_COMPLETENESS = NOT_PROVEN`; no completeness claim follows from a capped response. Its explicit `--apply` mode also requires `--confirm-new=<exact sorted apple-album IDs>` copied from a reviewed dry-run, then writes candidate work rows and downloads Apple artwork.

Apple UPC resolution records the Apple genre separately from DistroKid's supplied genre. Store links and artwork URLs are retained only when they use HTTPS Apple hosts. A future release never projects to runtime Catalog. The chat's upcoming-release answer uses the nearest future date from distributor metadata and says when a public store link is not yet verified; latest-released selection remains bounded by Tokyo's current date.

## Evidence boundary for this Gate

The VII Apple lookup was attempted read-only but the network request failed with DNS `ENOTFOUND`; this is `LOOKUP_UNAVAILABLE`, not `NO_RESULT` or `PUBLIC_STORE_PROPAGATION_PENDING`. The Canvas release is upcoming and therefore skips lookup. No distributor login, account mutation, Catalog apply, local inbox installation, provider call, deployment, or external write is part of this Gate.
