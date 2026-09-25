# 伯爵MUSIAM — Chat history Preview deploy-input remediation

`CHAT_HISTORY_PREVIEW_DEPLOY_INPUT = SAFE_COMMITTED`

`CHAT_HISTORY_PREVIEW_DEPLOYMENT = READY_FOR_REAPPROVAL`

The exact task-generated `.pnpm-store/` was removed after the user explicitly authorized that exact path. The offline collector reports no unexpected untracked files or protected descendant files. The clean committed-state validators all pass, and the local Gate commit is complete. **Preview deployment was not started.** There was no provider upload, Production mutation, push, customer-data operation, provider call, payment, or environment mutation.

## State Lock

- Starting HEAD: `1e47fc52cc9b230c2d087b11b676fdb021f8e66d`
- Branch: `recovery/musiam-clean-20260920`
- Tracked tree: clean at start.
- `ops/market-learning/daily-20260925/`: existing protected untracked path. It was not opened, modified, staged, or deleted. The collector inspected only whether an entry was present in its deploy-input inventory.
- Local commit message: `chore: harden preview deploy input`. It contains `.vercelignore` and the three requested remediation record/validator files; it changes no application source.

## Exact prior 17 paths and classification

The fresh pre-change Vercel CLI 59.23.2 collector on this HEAD returned these 17 ignored-untracked regular files:

`.husky/_/applypatch-msg`, `.husky/_/commit-msg`, `.husky/_/h`, `.husky/_/husky.sh`, `.husky/_/post-applypatch`, `.husky/_/post-checkout`, `.husky/_/post-commit`, `.husky/_/post-merge`, `.husky/_/post-rewrite`, `.husky/_/pre-applypatch`, `.husky/_/pre-auto-gc`, `.husky/_/pre-commit`, `.husky/_/pre-merge-commit`, `.husky/_/pre-push`, `.husky/_/pre-rebase`, `.husky/_/prepare-commit-msg`, and `next-env.d.ts`.

**Husky (16 files):** Husky is pinned to 9.1.7, and `package.json` runs `husky install` from its `prepare` script. That installer generates `.husky/_/h`, `husky.sh`, and 14 hook wrappers. The helpers are local Git hook plumbing and are not required by the deployed Next.js runtime. They are all ignored-untracked by the generated `.husky/_/.gitignore`. The real tracked `.husky/commit-msg` hook is separate and remains in the deploy-input list; the ignore rule is scoped to `.husky/_/`.

**`next-env.d.ts` (1 file):** It is untracked and ignored by the repository `.gitignore`. Next.js 15.5.12 generates it; this repository includes it in `tsconfig.json` for local type checking, but it is generated metadata rather than source of truth. Next.js regenerates it during `next build`, so it is not needed in the uploaded input. The [Next.js TypeScript documentation](https://nextjs.org/docs/pages/api-reference/config/typescript) documents its generated status, `tsconfig` inclusion, and regeneration by `next build`.

**Protected directory entry:** The collector represented `ops/market-learning/daily-20260925` as one directory entry (`mode=16877`, `size=0`, no content ID) and returned zero descendant file entries. Metadata-only filesystem counting found five descendant regular files totaling 10,582 bytes; their names and contents were not inspected or changed. The collector omitted all five descendants. The root is a real directory, not a symlink, and the deployment manifest contains no descendant file payload or content ID. Classification: `EMPTY_DIRECTORY_ENTRY_NO_DATA_EXPOSURE` (collector scope). The local Vercel CLI manifest uses a zero-size directory metadata row; no provider upload was attempted, so remote receipt was not observed.

## Deploy-input snapshots

The previous Gate measured 3,226 entries / 214,071,775 bytes at `e5c9b089aaf5cfc3e57c3c17a36c75888f530aea`, hash `cc8eaf2bd8838ac881a94e39cbb1002f062de1ffab683fc0c37461034c7d5aa4`. On the requested starting HEAD, a fresh pre-change collector measured 3,227 entries / 214,075,946 bytes, hash `81c35da4d2e64800681edc9174ca6f2e83c59faf9217956711cd18d3a54a4268`. The one-entry / 4,171-byte increase is `scripts/validate-chat-history-preview-deployment.mjs`, added in commit `1e47fc5` after the previous snapshot; the previous snapshot predates that validator.

After the generated helper and audit exclusions, a second metadata review found that tracked `.claude/settings.local.json` (633-byte local developer settings file) was still in the collector inventory. It was excluded by that exact file path only. The final same-version Vercel CLI `inspectDeploymentFiles` collector measured:

| Measure | Result |
| --- | ---: |
| Entries | 3,208 (3,200 regular files, 8 directory entries) |
| Bytes | 214,053,118 |
| Manifest SHA-256 | `c86dad16b2fdac9a11a08bf4daa3f0680037baa9a63e19f10f152e00f95d5284` |
| Unexpected untracked regular files included | 0 |
| Protected operational files included | 0 |
| `.env*` files included, including `.env.example` | 0 |
| Secret/private configuration files included | 0 (`.claude/settings.local.json` excluded by exact path) |
| Private-preservation payloads included | 0 |
| Chat fixture files included | 0 |
| Gate-specific governance records and audit tools included | 0 |

The manifest hash is SHA-256 over the ordered `[path, mode, sha]` tuples returned by the offline collector. The protected directory's single zero-byte metadata entry remains visible; it has no descendant file entry or content ID.

## `.vercelignore` changes

Added exact exclusions for `.husky/_/`, `next-env.d.ts`, the tracked local `.claude/settings.local.json` developer configuration, the previous and new Preview deploy-input validators, and the previously flagged C4-C private-preservation validator source. Removed the `!.env.example` exception so the existing `.env.*` rule excludes every `.env*` file, including the public example template. The exact protected root exclusion was already present and was not changed. No `.husky/**`, `ops/**`, or source-tree rule was added. Vercel documents `.vercelignore` as the deployment exclusion list for files and directories ([Vercel documentation](https://vercel.com/docs/deployments/vercel-ignore)).

## Local validation

- Typecheck: PASS (`node_modules/.bin/tsc --noEmit`).
- Chat Strengthening 02: PASS, 16/16.
- Preview readiness: PASS, 9/9 after commit in the clean committed worktree.
- History runtime safety: PASS, 28/28 after commit in the clean committed worktree.
- Environment metadata: PASS, 12/12 after commit in the clean committed worktree.
- R7-C1: PASS, 24/24. R7-C2: PASS, 20/20.
- Catalog: PASS, 450 primary / 514 merged.
- Exhibition: PASS, 514 displayed / 0 missing.
- `git diff --check`: PASS after commit; the remediation validator also checks the committed diff.
- Root ESLint: 0 errors and the 2 known unused-variable warnings at `src/lib/metal-print-redis.server.ts:564` (`qualified`, `nurture`) remain. Direct ESLint confirmed this. The `pnpm lint` wrapper stopped before lint because it attempted module-directory repair without a TTY.
- History runtime safety and environment metadata validators were attempted before commit and stopped at their existing worktree allowlist checks. Both require a final rerun after the authorized cleanup and commit.

## Exact local cleanup completed

The task-generated `.pnpm-store/` was verified as a real directory with exact matching realpath `/Users/kagekun/Desktop/musiam-front-clean/.pnpm-store`, zero tracked descendants, zero symlinks/special entries, and 259 metadata-counted descendants (one regular file totaling 8,192 bytes). No names or contents were read. After explicit user authorization for this exact path, it was recursively removed and its absence was confirmed. The protected market-learning directory was not touched.

The normal Husky `commit-msg` hook ran and Commitlint passed. Pnpm reported the existing `node_modules`/lockfile setting difference in warning mode; no dependency install or purge occurred. The local commit contains only the four authorized Gate paths.
## Stop point

- Preview deployment count: 0.
- Production mutation: 0.
- Application source changes: 0.
- Local commit: created with message `chore: harden preview deploy input`.
- Post-commit worktree: only the protected `ops/market-learning/daily-20260925/` remains untracked; `.pnpm-store/` is absent.
- Verdict: `CHAT_HISTORY_PREVIEW_DEPLOY_INPUT = SAFE_COMMITTED`.
- Next Gate: `CHAT_HISTORY_PREVIEW_DEPLOYMENT = READY_FOR_REAPPROVAL`. A separate reapproval is required before any Preview deployment.
- Recommended next model: `gpt-6-astra/high` for the reapproval/deployment Gate.

Offline collection and repository validators establish only local source/input facts. They do not establish a Vercel upload, Preview build, deployed runtime behavior, Redis connectivity, or Production parity.
