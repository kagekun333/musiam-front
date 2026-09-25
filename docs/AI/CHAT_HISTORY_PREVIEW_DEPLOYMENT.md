# 伯爵MUSIAM — Chat history Preview deployment Gate

`CHAT_HISTORY_PREVIEW_DEPLOYMENT = BLOCKED_DEPLOY_INPUT_RISK`

The explicit approval `APPROVE_CHAT_HISTORY_PREVIEW_DEPLOYMENT` authorized one Preview deployment from `e5c9b089aaf5cfc3e57c3c17a36c75888f530aea` only after a safe deploy-input preflight. State Lock matched that HEAD and `recovery/musiam-clean-20260920`; the tracked tree was clean. The existing untracked `ops/market-learning/daily-20260925/` was protected and its payload was not opened.

## Preflight result

The linked project is `musiam-front` (`prj_OU4nbZIO3n3ieS99cMXY7eWigHAl`, team `team_Hj7QBy2lnfpsuHXgOWKfFdZg`). The Vercel CLI 59.23.2 `deploy --dry --format=json` produced no usable file manifest. Its offline `inspectDeploymentFiles` collector was then run against the untouched starting HEAD and current `.vercelignore`, before any record files were created. This is the same version-bound collection method used in prior Recovery gates; it did not upload or mutate the provider.

The collector returned 3,226 entries (3,220 regular files and six directory entries), 214,071,775 bytes, and manifest SHA-256 `cc8eaf2bd8838ac881a94e39cbb1002f062de1ffab683fc0c37461034c7d5aa4`. The hash is over ordered `[path, mode, contentId]` tuples. The protected directory itself appeared as a zero-byte directory entry; no file below it appeared. No `.env` secret, private-preservation payload, Recovery archive payload, or named audit/fixture payload was included. `.env.example` is a tracked public template and was not counted as a secret. A validator script with “private-preservation” in its filename is source code, not a private payload.

The manifest included 17 unexpected untracked regular files: 16 generated `.husky/_/` hook files and `next-env.d.ts`. Six ignored directory entries also appeared, including the protected directory. The exact hard condition `unexpected untracked included = 0` therefore fails. The protected directory entry makes the exclusion boundary less clear even though its payload count is zero. No broad `.vercelignore` change or deployment was made after this finding. The three Gate record/validator files created after this snapshot also require a fresh preflight before any future upload.

## Local validation and stop point

- Direct `tsc --noEmit`: PASS. The `pnpm typecheck` wrapper attempted dependency-store repair and stopped without a TTY; its temporary `.pnpm-store/` was removed. The direct compiler check passed.
- Strengthening 02: PASS 16/16. History runtime safety: PASS 28/28. Env metadata: PASS 12/12. Preview readiness: PASS 9/9.
- R7-C1: PASS 24/24. R7-C2: PASS 20/20. Catalog: 450 primary / 514 merged. Exhibition: 514 displayed / 0 missing.
- Root ESLint: 0 errors, two known unused-variable warnings at `src/lib/metal-print-redis.server.ts:564`; strict max-warnings exit 1. `git diff --check`: PASS.

The Gate stopped before the Production pre-deployment snapshot, deployment, build, smoke requests, and runtime-log review. Preview deployment count is zero; there is no new deployment ID or URL. No valid history request, normal Chat POST, Redis/customer-data operation, provider call, payment operation, environment mutation, Production mutation, or push was performed. Existing read-only records still identify Production deployment `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX`, but its **current** state and aliases were not resnapshotted in this stopped Gate. Runtime readiness remains `READY_WITH_CONNECTIVITY_UNVERIFIED`; the current local history contract is not verified as deployed to Preview or Production.

The next Gate is a review of exact deploy-input exclusions followed by a new manifest and separate authorization for one Preview deployment. The record and validator are local evidence only; they do not establish Preview build success, Redis connectivity, customer-history behavior, or Production parity.
