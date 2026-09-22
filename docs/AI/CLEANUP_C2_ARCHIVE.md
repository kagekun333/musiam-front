# 伯爵MUSIAM — C2 Archive Creation

## Executive Result

`C2_ARCHIVE = VERIFIED_ARCHIVES_CREATED_SOURCE_REMOVAL_NOT_AUTHORIZED`。4つの監査済みARCHIVE
groupを指定rootへ複製し、全content hash/size、NFC path mapping、collision checkがPASSした。
exact raw path spellingでない100 pathsはcanonical-equivalentとして許容し、source spellingは
UTF-8 sidecar `SOURCE_PATH_MANIFEST.json` に保存した。

## Authorized Scope

Canonical HEAD `2eb3a6379feb3e2a76db5ee472ddedd9e023ae24`、branch
`recovery/musiam-clean-20260920`。Audit `ops/recovery/cleanup-audit-20260922.json`の
`ARCHIVE` 4 entriesだけを対象とした。Sourceは読み取り専用。C1後のcanonical/original
`node_modules`と`.next`は不存在。

## Source Groups

| Group | Exact source path | Files | Content bytes | Source manifest SHA-256 | Exact extracted paths | NFC paths | Content matches |
|---|---|---:|---:|---|---:|---:|---:|
| canonical-output | `/Users/kagekun/Desktop/musiam-front-clean/アウトプット` | 1,126 | 468,794,580 | `2519b446cf69fd53439c22b01d1be582374aa36f97f8ba87506cb085481b586c` | 1,079 | 1,126 | 1,126 |
| dirty-output | `/Users/kagekun/Desktop/musiam-front/アウトプット` | 1,134 | 1,489,014,934 | `557f6c79dd12bf3e28bb95e29bec7a5d4f473e8ba9d8e40e41780ee6400976c5` | 1,084 | 1,134 | 1,134 |
| dirty-archive | `/Users/kagekun/Desktop/musiam-front/_archive` | 791 | 110,150,890 | `fec4704f28e8ad5760e36496e4f51cf845aa280d63ab4ae85f343ba86c4ab99a` | 788 | 791 | 791 |
| dirty-outputs | `/Users/kagekun/Desktop/musiam-front/outputs` | 3 | 8,871,572 | `cde1e15b29c1e8a5d5552a41f144a1acf24b185be7a16cced070fe8180292dac` | 3 | 3 | 3 |

Totals: 3,054 files; 2,076,831,976 content bytes.

## Destination

`/Users/kagekun/Library/Application Support/MUSIAM/archive/cleanup-c2-20260923/`

## Archive Files

| Archive | Size | SHA-256 |
|---|---:|---|
| `canonical-output.tar.gz` | 450,843,681 | `48726e6500c8b2a440415572726abdf5da1f2d6934cd7c6a0869182a5bb0828c` |
| `dirty-output.tar.gz` | 1,433,855,247 | `ef023575e19726fe9246cfe67244e5ef0cca57814eaf42d31e34f03a3c6220bd` |
| `dirty-archive.tar.gz` | 95,906,787 | `4adbf1d86aa475b2369c505873b9eeb9323af14b84f64030cf46321f919fa292` |
| `dirty-outputs.tar.gz` | 254,304 | `943283326200153d7079155431639d7ae1810fce3e20e911ebb20db711eb1b00` |

Total archive bytes: 1,980,860,019.

## Restore Verification

All four archives were extracted beneath `.verify` and verified: 3,054/3,054 file counts, sizes,
and SHA-256 values match. NFC-normalized paths match 3,054/3,054; source and extracted normalization
collisions are both 0; normalized path mapping is one-to-one. Raw relative path strings match
2,954/3,054 because 100 extracted spellings use canonically equivalent Unicode. Archive member
listing was read without re-extraction and classified `ARCHIVE_MEMBER_RAW_PATHS = NORMALIZED_EQUIVALENT`.
The exact `.verify` directory was removed after all checks passed.

`SOURCE_PATH_MANIFEST.json` preserves every raw source path spelling alongside its NFC comparison
key, size, and SHA-256. Sidecar SHA-256:
`4d4185fba3a1995576ae9dbef8ebf5e93e3e5c17a7cae983e88de1105cbf09f0`.

## Duplicate Relationship

Audit group `output-subtree-20260922`: all 1,126 canonical-output files match same-relative-path
files in dirty-output by content, totaling 468,794,580 bytes. Both source groups were archived
separately to preserve provenance.

## Source Integrity

Post-archive source manifests equal pre-archive manifests for all 4 groups (`SOURCE_MUTATION = 0`).
All original source roots remain present. Original dirty repo before/after: branch
`codex/fix/stripe-metal-print-webhook-20260914`, HEAD
`117379b6c61ab3fc072b6cd4b80ce1d406b0e175`, tracked modified 102, staged 0, untracked 433.

## Disk Usage

Preflight free space was approximately 12.3 GiB against a 4.9 GiB minimum. Four archive files
occupy 1,980,860,019 bytes. Source allocation recorded by audit: 2,083,004,416 bytes.

## Source Removal Boundary

No source file or directory was deleted, moved, or renamed. C2 does not authorize source removal.

## Next Gate

`C2_SOURCE_REMOVAL_HUMAN_GATE`: archive verification does not authorize removal. Keep all original
sources until the user separately decides whether to authorize source removal.

## Truth Boundary

Canonical equivalence is not raw codepoint equality. macOS/APFS restore usability is not
cross-platform raw-name identity. File content equality is not metadata equality. The raw source
path sidecar preserves original spelling evidence. A verified archive does not authorize source
deletion. R0-R5, EVIDENCE_HOLD, UNKNOWN, application files, providers, deployment, and push were
untouched.
