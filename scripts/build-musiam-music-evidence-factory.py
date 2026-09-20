#!/usr/bin/env python3
"""Create a bounded, source-scoped music evidence batch without catalog mutation.

The factory has deliberately narrow claims: stable identity, source scope, decode
facts, and machine measurements. It never derives mood, no-vocal status, lyrics,
rights, or whole-master equivalence. Network use is opt-in and limited to Apple's
public iTunes Lookup plus the returned public preview URL.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import subprocess
import sys
import tempfile
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import librosa
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PHASE3 = ROOT / "ops/simulation-refinement/phase3-owner-offline-20260912"
PHASE4 = ROOT / "ops/simulation-refinement/phase4-quality-20260913"
DEFAULT_OUTPUT = ROOT / "ops/simulation-refinement/phase5-generalization-20260913/music"
PRIVATE = Path("/private/tmp/musiam-music-evidence-factory-20260913")

# First six are owner-selected representative/current-favorite rows; Rava stays
# explicitly unresolved. The final four are selected only because existing local
# or direct Apple source evidence offers a practical small-batch bridge.
DEFAULT_PRIORITY = [
    {"workId": "apple-album-1889783981", "title": "Deus sive Natura", "priority": "OWNER_SELECTED_REPRESENTATIVE", "appleCollectionId": "1889783981"},
    {"workId": None, "title": "Rava", "priority": "OWNER_SELECTED_REPRESENTATIVE", "unresolved": "No exact stable public work ID supplied; do not assign by title similarity."},
    {"workId": "spotify-album-6acsBbFbxxCTKQpSdlkxpx", "title": "ルーツ・オブ・トゥルース", "priority": "OWNER_SELECTED_REPRESENTATIVE"},
    {"workId": "spotify-single-01SX5jNiRBCTY02dtGz3iM", "title": "雨上がりの国でカナリアは歌う", "priority": "CURRENT_OWNER_FAVORITE"},
    {"workId": "spotify-single-7LIlsNpzXZBZH2edcK4RQQ", "title": "PRIMAL SURGE", "priority": "CURRENT_OWNER_FAVORITE"},
    {"workId": "apple-album-6797260614", "title": "LOW TRICKSTER", "priority": "CURRENT_OWNER_FAVORITE", "appleCollectionId": "6797260614"},
    {"workId": "distro-d9aacae4dec04661b92ed7f700fa4bd8", "title": "Latin Exorcism Club", "priority": "EXISTING_MACHINE_SCOPED"},
    {"workId": "distro-e323c7e6039546bcbaf3ae9584656065", "title": "Beautiful Anyway", "priority": "EXISTING_LOCAL_SOURCE"},
    {"workId": "distro-91227b1cd8e24ffe90c8666f8ebc1af3", "title": "Veda Bass Mantra", "priority": "EXISTING_LOCAL_SOURCE"},
    {"workId": "apple-album-6797260493", "title": "Fractal Hands", "priority": "METADATA_ONLY_PRIORITY", "appleCollectionId": "6797260493"},
]


def utc() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def atomic_json(path: Path, value: object, force: bool) -> None:
    if path.exists() and not force:
        raise FileExistsError(f"refusing to overwrite {path}; use --force only after review")
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(value, f, ensure_ascii=False, indent=2)
            f.write("\n")
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def existing_context() -> tuple[dict, dict, dict]:
    return (
        load_json(PHASE3 / "music-coverage-audit.json"),
        load_json(PHASE4 / "music-small-batch-evidence-packet.json"),
        load_json(PHASE4 / "music-preview-source-packet.json"),
    )


def apple_lookup(collection_id: str, country: str, allow_network: bool) -> dict | None:
    if not allow_network:
        return None
    url = f"https://itunes.apple.com/lookup?id={collection_id}&entity=song&country={country.lower()}"
    req = urllib.request.Request(url, headers={"User-Agent": "MUSIAMMusicEvidenceFactory/1.0"})
    with urllib.request.urlopen(req, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def apple_track(lookup: dict, collection_id: str) -> dict | None:
    album = next((x for x in lookup.get("results", []) if str(x.get("collectionId")) == collection_id), None)
    track = next((x for x in lookup.get("results", []) if x.get("wrapperType") == "track" and str(x.get("collectionId")) == collection_id and x.get("previewUrl")), None)
    if not album or not track or album.get("artistName") != track.get("artistName"):
        return None
    return {"artistName": album.get("artistName"), "collectionId": str(album.get("collectionId")), "collectionName": album.get("collectionName"), "trackId": str(track.get("trackId")), "trackName": track.get("trackName"), "trackDurationMillis": track.get("trackTimeMillis"), "previewUrl": track.get("previewUrl")}


def download_preview(url: str, slug: str) -> Path:
    PRIVATE.mkdir(mode=0o700, parents=True, exist_ok=True)
    out = PRIVATE / f"{slug}.m4a"
    if out.exists():
        return out
    req = urllib.request.Request(url, headers={"User-Agent": "MUSIAMMusicEvidenceFactory/1.0"})
    with urllib.request.urlopen(req, timeout=30) as response:
        data = response.read()
    fd, tmp = tempfile.mkstemp(prefix=f".{slug}.", dir=PRIVATE)
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, "wb") as f:
            f.write(data)
        os.replace(tmp, out)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)
    return out


def low_level_features(path: Path) -> dict:
    # Decode locally with ffmpeg. This avoids audioread fallback for public AAC
    # previews and makes bounded preview analysis reproducible without network.
    sr = 22050
    decoded = subprocess.run(
        ["ffmpeg", "-nostdin", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(sr), "-f", "f32le", "pipe:1"],
        check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    ).stdout
    y = np.frombuffer(decoded, dtype=np.float32)
    if not len(y):
        raise ValueError("decoded audio has zero samples")
    hop = 512
    rms = librosa.feature.rms(y=y, hop_length=hop)[0]
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=hop)[0]
    rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr, hop_length=hop)[0]
    zcr = librosa.feature.zero_crossing_rate(y, hop_length=hop)[0]
    # This remains a beat-tracker estimate, not a confirmed tempo or genre.
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr, hop_length=hop)
    tempo_value = float(np.asarray(tempo).reshape(-1)[0]) if np.asarray(tempo).size else None
    rms_db = 20 * np.log10(np.maximum(rms, 1e-8))
    return {
        "analysisEngine": "librosa local decode and feature extraction",
        "analyzedDurationSeconds": round(float(len(y) / sr), 4),
        "sampleRateHz": int(sr),
        "tempoBpmEstimate": round(tempo_value, 2) if tempo_value else None,
        "energy": {"meanRms": round(float(np.mean(rms)), 6), "rmsDynamicRangeDbP95P05": round(float(np.percentile(rms_db, 95) - np.percentile(rms_db, 5)), 3)},
        "textureSignals": {"spectralCentroidHzMean": round(float(np.mean(centroid)), 2), "spectralRolloffHzMean": round(float(np.mean(rolloff)), 2), "zeroCrossingRateMean": round(float(np.mean(zcr)), 6)},
        "capability": "Machine-measured segment-level signal features; not genre, mood, lyric, vocal-absence, quality, or listener-fit evidence.",
        "confidence": "MEASURED_MACHINE_FEATURES_SCOPED_TO_ANALYZED_SOURCE"
    }


def local_sources(packet: dict) -> dict:
    result = {}
    for work in packet.get("works", []):
        source = work.get("localSource")
        if source:
            result[work["title"]] = {"path": Path(source["path"]), "sha256": source["sha256Verified20260913"], "scope": source["scope"], "identity": work.get("stableIdentity", {}), "binding": "Existing packet: stable identity plus limited preview correspondence where recorded."}
    return result


def preview_sources(packet: dict) -> dict:
    result = {}
    for work in packet.get("works", []):
        runtime = work.get("runtimeIdentity", {})
        preview = work.get("preview", {})
        if runtime.get("workId") and preview.get("localTemporaryPath"):
            result[runtime["workId"]] = {"path": Path(preview["localTemporaryPath"]), "sha256": preview["sha256"], "scope": preview["scope"], "identity": {"artistName": work.get("officialAppleLookup", {}).get("artistName"), "collectionId": work.get("officialAppleLookup", {}).get("collectionId"), "trackId": work.get("officialAppleLookup", {}).get("trackId"), "trackName": work.get("officialAppleLookup", {}).get("trackName")}, "binding": "Existing packet: public Apple lookup identity and one downloaded preview."}
    return result


def source_record(priority: dict, local: dict, previews: dict, allow_network: bool, reuse_by_sha: dict, reuse_source_by_work_id: dict) -> dict:
    row = dict(priority)
    row["source"] = None
    row["machineObservation"] = None
    previous = reuse_source_by_work_id.get(priority.get("workId"))
    if previous and Path(previous.get("path", "")).is_file() and sha256(Path(previous["path"])) == previous.get("sha256"):
        row["source"] = previous
        row["sourceReuse"] = "REUSED_IDENTICAL_RUNTIME_WORK_AND_SOURCE_SHA256"
    if row["source"] is None and priority["title"] in local:
        s = local[priority["title"]]
        row["source"] = {"kind": "LOCAL_FULL_FILE_CANDIDATE", "path": str(s["path"]), "sha256": s["sha256"], "scope": s["scope"], "stableBinding": s["identity"], "bindingEvidence": s["binding"], "capabilities": ["local-file hash and decode", "machine features across this local file"], "prohibited": ["whole public master equivalence", "rights", "lyrics", "mood", "no-vocals"]}
    elif row["source"] is None and priority.get("workId") in previews:
        s = previews[priority["workId"]]
        row["source"] = {"kind": "PUBLIC_PREVIEW", "path": str(s["path"]), "sha256": s["sha256"], "scope": s["scope"], "stableBinding": s["identity"], "bindingEvidence": s["binding"], "capabilities": ["hash and machine features of this preview"], "prohibited": ["album/full-track claim", "rights", "lyrics", "mood", "no-vocals"]}
    elif row["source"] is None and priority.get("appleCollectionId"):
        lookup = apple_lookup(priority["appleCollectionId"], priority.get("appleCountry", "us"), allow_network)
        track = apple_track(lookup, priority["appleCollectionId"]) if lookup else None
        configured_track = str(priority.get("appleTrackId")) if priority.get("appleTrackId") else None
        if track and track["trackName"] == priority["title"] and (not configured_track or track["trackId"] == configured_track):
            path = download_preview(track["previewUrl"], priority["workId"])
            row["source"] = {"kind": "PUBLIC_PREVIEW", "path": str(path), "sha256": sha256(path), "scope": "One Apple public preview only; not full track or album.", "stableBinding": track, "bindingEvidence": "Fresh Apple public lookup: collection and artist match, then returned track preview URL.", "capabilities": ["hash and machine features of this preview"], "prohibited": ["album/full-track claim", "rights", "lyrics", "mood", "no-vocals"]}
        else:
            row["missingReason"] = "Apple lookup unavailable or did not produce the configured artist/collection/track-ID/title preview binding."
    elif row["source"] is None:
        row["missingReason"] = priority.get("unresolved", "No locally or publicly bound audio source in this bounded batch.")
    if row["source"]:
        source_path = Path(row["source"]["path"])
        if source_path.is_file() and sha256(source_path) == row["source"]["sha256"]:
            cached = reuse_by_sha.get(row["source"]["sha256"])
            if cached:
                row["machineObservation"] = cached
                row["machineObservationReuse"] = "REUSED_IDENTICAL_SOURCE_SHA256"
            else:
                row["machineObservation"] = low_level_features(source_path)
        else:
            row["missingReason"] = "Source file unavailable or changed after the recorded hash; analysis skipped."
            row["source"] = None
    return row


def limited_claims(row: dict) -> tuple[list[str], list[str]]:
    source = row.get("source")
    prohibited = ["No lyric, language, mood, genre, quality, listener-fit, rights, or vocal-absence conclusion.", "No public promotion or recommendation-ready state."]
    if not source:
        return [], prohibited
    obs = row["machineObservation"]
    scope = source["scope"]
    claims = [f"A SHA-256-bound {source['kind']} was measured within this scope: {scope}", f"Machine segment features are available: tempo estimate {obs['tempoBpmEstimate']} BPM, mean RMS {obs['energy']['meanRms']}, and mean spectral centroid {obs['textureSignals']['spectralCentroidHzMean']} Hz."]
    return claims, prohibited


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--config", type=Path, help="JSON with a priority array; keeps each bounded batch reviewable and replaceable without editing this script")
    parser.add_argument("--reuse-observations", type=Path, default=DEFAULT_OUTPUT / "music-machine-observations.json", help="prior machine-observations JSON; identical source hashes are reused without reanalysis")
    parser.add_argument("--reuse-manifest", type=Path, action="append", default=[], help="prior evidence manifest; may be repeated to reuse recovered or earlier runtime-work/source pairs without lookup/download")
    parser.add_argument("--allow-public-apple", action="store_true", help="allow Apple public lookup/preview GET for missing direct Apple sources")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    priority = load_json(args.config).get("priority") if args.config else DEFAULT_PRIORITY
    if not isinstance(priority, list):
        raise ValueError("config.priority must be an array")
    output_paths = [args.output_dir / "music-evidence-manifest.json", args.output_dir / "music-machine-observations.json"]
    if not args.force and any(path.exists() for path in output_paths):
        raise FileExistsError("output batch already exists; refusing before lookup, download, or analysis")
    coverage, local_packet, preview_packet = existing_context()
    local = local_sources(local_packet)
    previews = preview_sources(preview_packet)
    reuse_by_sha = {}
    if args.reuse_observations.is_file():
        for prior in load_json(args.reuse_observations).get("records", []):
            source = prior.get("source") or {}
            if source.get("sha256") and prior.get("machineObservation"):
                reuse_by_sha[source["sha256"]] = prior["machineObservation"]
    reuse_source_by_work_id = {}
    reuse_manifests = args.reuse_manifest or [DEFAULT_OUTPUT / "music-evidence-manifest.json"]
    for reuse_manifest in reuse_manifests:
        if reuse_manifest.is_file():
            for prior in load_json(reuse_manifest).get("sourceRecords", []):
                if prior.get("workId") and prior.get("source"):
                    reuse_source_by_work_id[prior["workId"]] = prior["source"]
    rows = [source_record(item, local, previews, args.allow_public_apple, reuse_by_sha, reuse_source_by_work_id) for item in priority]
    seen = [row.get("workId") for row in rows if row.get("workId")]
    if len(seen) != len(set(seen)):
        raise ValueError("priority batch has duplicate non-null stable IDs")
    observations = []
    for row in rows:
        claims, prohibited = limited_claims(row)
        observations.append({"workId": row.get("workId"), "title": row["title"], "priority": row["priority"], "source": row.get("source"), "machineObservation": row.get("machineObservation"), "machineObservationReuse": row.get("machineObservationReuse"), "recommendableLimitedClaims": claims, "prohibitedConclusions": prohibited, "missingReason": row.get("missingReason")})
    manifest = {"schemaVersion": 1, "generatedAt": utc(), "configPath": str(args.config) if args.config else "DEFAULT_PRIORITY_EMBEDDED", "batchSize": len(rows), "ownerPriorityCount": sum(1 for r in rows if r["priority"].startswith("OWNER_") or r["priority"] == "CURRENT_OWNER_FAVORITE"), "ownerPriorityRows": [{"workId": r.get("workId"), "title": r["title"], "priority": r["priority"], "sourceAvailable": bool(r.get("source")), "missingReason": r.get("missingReason")} for r in rows if r["priority"].startswith("OWNER_") or r["priority"] == "CURRENT_OWNER_FAVORITE"], "sourceRecords": rows, "coverageBaseline": coverage.get("runtimeInventory", {}), "boundary": "No catalog/runtime/public mutation. Stable identity, source, scope, capability, confidence, and source SHA-256 stay attached to every usable record."}
    machine = {"schemaVersion": 1, "generatedAt": utc(), "records": observations, "summary": {"eligibleActualSoundRecords": sum(1 for r in rows if r.get("machineObservation")), "missingOrUnbound": sum(1 for r in rows if not r.get("machineObservation")), "contentCoverageIncreaseJustified": False, "reason": "Measured source-scoped machine features improve internal evidence transport but do not complete content-eligibility or public promotion."}}
    atomic_json(args.output_dir / "music-evidence-manifest.json", manifest, args.force)
    atomic_json(args.output_dir / "music-machine-observations.json", machine, args.force)
    print(json.dumps({"status": "PASS", "batch": len(rows), "eligibleActualSoundRecords": machine["summary"]["eligibleActualSoundRecords"], "ownerPriorityRows": manifest["ownerPriorityCount"], "outputDir": str(args.output_dir)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
