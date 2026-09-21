# 伯爵MUSIAM — Production Source Provenance

## Executive Result

`PRODUCTION_SOURCE_PROVENANCE = EXACT_REPRODUCIBLE_SOURCE`。

The exact current production input tree survives at
`/private/tmp/musiam-production-hotfix-20260921`. It is not claimed to be the
original deployment cwd. Instead, its non-mutating Vercel dry-run manifest and
the immutable Vercel input manifest for the current deployment agree for every
included file: 3,150 relative paths, modes, and content IDs; zero paths are
missing or mismatched. This establishes reproducible source equality without
inventing a Git SHA or cwd.

`PRODUCTION_PARITY = PARTIAL` remains unchanged. Exact source identity does not
establish a production-vs-Recovery diff, data parity, provider behavior, payment
behavior, or release readiness.

## Current Production

- Deployment: `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX`
- Alias: `https://www.hakusyaku.xyz`
- Vercel project: `musiam-front` / `hakusyakus-projects`
- Created: 2026-09-21 19:44:16 CEST
- State: `READY`
- Source provenance recorded by Vercel deployment metadata: `DIRECT_DEPLOY_SOURCE`

## Deployment Timeline

- 19:44:17 CEST: Vercel began the build and retrieved the deployment file list.
- 19:44:17–19:44:50 CEST: Vercel downloaded 3,150 deployment source files and
  restored the cache from `dpl_6UMKrWmTLWhf8kVHausj7MXDjEsB`.
- 19:44:51 CEST: `vercel build` began.
- 19:47:19 CEST: the build completed; deployment output then completed and was
  promoted by the historical production deployment operation.

## Forensic Evidence

| Rank | Observation | Result |
| --- | --- | --- |
| 1 | Vercel current input-file metadata | 3,150 `src/` source entries with path, mode, and content UID |
| 2 | Surviving local candidate dry-run | 3,150 included entries, `nextjs`, 3 ignored paths |
| 3 | Exact normalized manifest comparison | all 3,150 path/mode/content-ID tuples match; SHA-256 `1a4ee637d55be29b4f7307daa10e9d9fc0ac7b36348337300ed34aa0c126af0b` |
| 4 | Current build log | 3,150 files downloaded; Next.js 15.5.12; 1,808 static pages |
| 5 | Targeted shell history | `npx vercel --prod` exists, but lacks a cwd and timestamp |

The full manifests are preserved outside Recovery as read-only forensic
artifacts: `/private/tmp/musiam-current-deployment-files-20260921.json` and
`/private/tmp/musiam-production-hotfix-20260921-dry.json`. No production source
file was copied into this repository.

## Deployment Command

The safe command form `npx vercel --prod` survives in targeted shell history.
Its exact timestamp and cwd do not. It is supporting evidence only; the source
proof does not rely on it.

## Deployment Working Directory

`NOT_PROVEN`.

The surviving tree is an exact source artifact, but not named as the original
cwd. Its local `.vercel` project metadata names `musiam-production-hotfix-20260921`,
whereas the current deployment is in `musiam-front`; no unrecorded project
override is inferred.

## Base Source

The base is classified as
`VERCEL_CURRENT_DEPLOYMENT_INPUT_MANIFEST_MATCHED_LOCAL_TREE`, not a Git commit.
No production Git SHA survives. The provider manifest directly identifies the
complete included source tree, while the local dry-run fixes the matching local
paths, modes, content hashes, and ignore behavior.

## Hotfix Delta

The prior READY deployment `dpl_6UMKrWmTLWhf8kVHausj7MXDjEsB` is a rollback
reference, not an assumed base. A local helper preserves a historical three-path
webhook patch lead. Two runtime bytes are established in current source:

- `src/app/api/metal-print/webhook/route.ts`: prior snapshot hash
  `a31737daccf8119b0b7adb664e4ce0d357665b11ef3d1c98ab9d368a532ecce5`; current
  source and Recovery `9b71038` hash
  `058735310546ed7d33afa6be39c99a5d90b7e18975670e3d95c21a2d36d0eef8`.
- `src/lib/metal-print-webhook-identity.ts`: absent from the prior closure;
  current source and Recovery `9b71038` hash
  `5c7418b4defa2c9297a83f20948e615bf1b1151cbc20b03a4103fc7cda730a3c`.

The historical offline validator is not present in the current candidate.
Provider input metadata for prior-to-current source differs in 2,984 modified
entries plus one added entry. Therefore the exact complete hotfix delta is
`NOT_ESTABLISHED`; it must not be described as a two-file production transition.
No production-vs-Recovery diff was performed.

## Candidate Source Manifest

- Candidate path: `/private/tmp/musiam-production-hotfix-20260921`
- Candidate source files included by dry-run: 3,150
- Ignored paths: `.gitignore`, `.vercel`, `node_modules`
- Total included size: 236,743,709 bytes
- Normalized manifest SHA-256:
  `1a4ee637d55be29b4f7307daa10e9d9fc0ac7b36348337300ed34aa0c126af0b`
- Exact matches to current deployment input manifest: 3,150 / 3,150
- Missing/mismatched included paths: 0 / 0

No `.env*` file was opened; no environment value was read.

## Vercel Dry-Run Fingerprint

`vercel deploy --dry --format=json` completed without upload or deployment
creation. It detected Next.js, produced content hashes for all 3,150 included
files, and reported three ignored paths. This dry-run is an offline inclusion
fingerprint, not a deployment.

## Build Fingerprint

The read-only current build log reports a matching 3,150 uploaded files,
Next.js 15.5.12, pnpm-lock v9 detection, pnpm 10.28.0, and 1,808 generated
static pages. It corroborates the exact manifest match; build fingerprints are
not the independent source-equality proof.

## Exactness Test

The original cwd / command proof route is unavailable. The full current provider
input manifest route passes instead:

- Complete provider input manifest: PASS
- Complete surviving local tree: PASS
- Relative path / mode / content-ID equality: 3,150 / 3,150 PASS
- Deterministic local inclusion and ignore rules: PASS
- Unknown included source inputs: 0
- Build fingerprint corroboration: PASS

This satisfies reproducible exact source identity. It does not establish Git
provenance or authorize any source adoption.

## Missing Evidence

- Original deployment cwd and timestamped command line.
- Current production Git provider, repository, branch, and commit SHA.
- An exact complete semantic description of the historical hotfix transition.
- Production-vs-Recovery diff, merge classification, data parity, environment
  correctness, provider behavior, payment behavior, and release readiness.

## Security / Secret Boundary

No `.env*` contents, tokens, API keys, authorization headers, encrypted
environment representations, or source contents are recorded here. `ENV_ROTATION_REVIEW_REQUIRED`
remains a Human Gate; it does not assert a secret disclosure. Environment files
were not inspected and secret values accessed are `0`.

## Next Gate

The next Gate is **Exact Production vs Recovery Diff / Merge Plan**. It is a
separate Unit and was not started here. No merge plan, Release Candidate
assembly, deploy, push, promote, rollback, or provider/payment/data operation
occurred.

## Truth Boundary

- direct-deploy metadata without Git SHA != Git provenance
- exact source equality != original deploy cwd proof
- exact source equality != data parity or business correctness
- historical hotfix prose != complete source delta
- build fingerprint != the source proof by itself
- exact source discovery != authorization to merge, adopt, or deploy
