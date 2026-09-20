# Phase 6 public preview action manifest

The manifest contains nine priority works with stable cached collection and track IDs, exact cached artist/title bindings, public store URLs, and deterministic iTunes lookup URLs. Each row is an action candidate for retrieving `previewUrl` and `trackTimeMillis` from public metadata. No preview URL was invented.

After the initial sandbox DNS failure, an authorized bounded retry used `curl --ipv4 -sS -L --connect-timeout 8 --max-time 20` against each known iTunes track ID. All nine returned HTTP 200 with valid JSON and exact artist/title/collection/track bindings, public track URLs, durations, and `previewUrl` values. Raw JSON snapshots and status files are in `/private/tmp/musiam-preview-get-20260913`; they contain only public metadata responses. This verifies public preview availability, not full-track identity or semantic coverage.

`地球レビュー星1.8` carries an additional ambiguity: its local WAV candidate measured 191.28 seconds while the cached catalog metadata says 150 seconds. The public preview action may proceed by stable Apple track ID, but the local file must not be used to claim full public identity until that conflict is resolved.

Rava has no stable collection/track identity, so no lookup action is emitted. No runtime, catalog, auth state, private audio, upload, or coverage count changed. The manifest is a separate Knowledge/capability candidate for later integration.
