# 伯爵MUSIAM — Production Parity / Release Candidate Verification

## Executive Decision

`PRODUCTION_PARITY = PARTIAL`。

`PRODUCTION_PARITY_STATUS = RC_SOURCE_PROVENANCE_INCOMPLETE`。

The current production alias is healthy and points to a new READY deployment, but that deployment is a direct deployment without Git provenance. No exact production source tree, commit SHA, or source diff can therefore be established. Recovery source must not be merged, copied, or assembled into a Release Candidate in this Unit.

## Recovery Authority

- Repository: `/Users/kagekun/Desktop/musiam-front-clean`
- Branch: `recovery/musiam-clean-20260920`
- Recovery HEAD: `3f34aac3cae09ca0fd46d2d29d99728d77bba167` (`3f34aac`)
- Local authority: `RECOVERY_FINAL_INTEGRATION = LOCAL_RECOVERY_INTEGRATED_WITH_KNOWN_BLOCKER_COMMITTED`

The tree was clean at the State Lock. Recovery remains local-only; this report does not change the completed Recovery Final Integration state.

## Current Production

- Account / team / project: `kagekun333` / `hakusyakus-projects` / `musiam-front`
- Current production deployment: `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX`
- Direct URL: `https://musiam-front-qfjd1cp49-hakusyakus-projects.vercel.app`
- Production alias: `https://www.hakusyaku.xyz`
- State: `READY`
- Created: 2026-09-21 19:44:16 CEST
- Framework / runtime: Next.js / Node `22.x`
- Build evidence: Vercel reports READY, build duration 3m16s.

The alias inspection was performed against `www.hakusyaku.xyz`; it is not inferred from a historical deployment ID.

## Production Provenance

`DIRECT_DEPLOY_SOURCE`.

The inspected current deployment contains no `gitSource`, provider, repository, branch, commit SHA, or commit-message metadata. The current `origin/main` ref was observed separately but is not production-source evidence and was not substituted for an unavailable deployment SHA. No source snapshot was materialized.

## Source Comparison

`PRODUCTION_SOURCE_PARITY = PARTIAL`.

An exact Git source comparison is unavailable. Changed-file count, added, modified, and deleted counts are all `UNAVAILABLE_NO_EXACT_PRODUCTION_SOURCE`, not zero. There is no production-only adoption decision in this Unit.

## Diff Classification

All source-level categories (`RECOVERY_ONLY_EXPECTED`, `PRODUCTION_ONLY_VALID`, `SUPERSEDED_BY_RECOVERY`, `CONFLICT`, and `UNKNOWN`) remain `UNAVAILABLE_NO_EXACT_PRODUCTION_SOURCE` for the exact tree comparison. This is an evidence limitation, not an assertion that production and Recovery have no differences.

## High-Risk Files

Recovery contains the high-risk catalog masters, `globals.css`, active v3 Chat, history storage, exhibition projection, Home/Realm, Letters, Broadcast/Now Playing, Oracle redirects, TodaysPick, Metal Print checkout/webhook, and deployment configuration. Its offline invariants are retained.

The production artifact lists output routes including `api/chat-experience-v3`, `api/chat-history`, `api/chat-reco`, `api/metal-print/checkout`, `api/metal-print/consultation`, `api/metal-print/webhook`, `api/todays-pick`, `api/cron/daily-oracle`, and `oracle`. Artifact presence does not prove their source content, behavior, or canonicality. No production-only valid change, superseded implementation, or conflict is classified from that evidence.

## Environment Contract

`PRODUCTION_ENV_CONTRACT = COMPATIBLE_NAMES_ONLY`.

Vercel production has 18 configured names. Four Recovery active-path groups are name-compatible: site URL; LLM provider (both OpenRouter and Groq fallback names); history/operations Redis through the KV alias pair; and the scheduled Metal Print cron secret. This is six required names across four logical groups, with zero missing required groups.

Required-for-optional-feature names for mail, Metal Print identity/Stripe, and analytics are present. The unavailable Upstash aliases are not missing because the Recovery accepts the configured KV aliases. Oracle price, VAPID, Anthropic, and local evidence-HMAC names are not required for the currently defined active paths; Oracle remains inactive by design.

No value was read, decrypted, or compared. Presence proves neither correctness nor suitability of a value.

## Dependency Compatibility

Recovery records Next `15.5.12`, React `19.2.0`, and a pnpm v9 lockfile (with no declared package manager or Node engine in `package.json`). Production reports Next.js and Node `22.x`, but its direct-deploy dependency tree and install command are unavailable. Result: `PARTIAL_RUNTIME_COMPATIBILITY_ONLY`.

## Build Compatibility

`BUILD_COMPATIBILITY = BLOCKED_BY_FONT_DNS`.

One permitted `NEXT_TELEMETRY_DISABLED=1 npm run build` attempt failed before application compilation because `next/font` could not resolve `fonts.googleapis.com` for Cinzel, EB Garamond, Inter, and Noto Serif JP. No workaround, configuration change, or rerun was performed. The workspace-root warning is separate from the DNS blocker.

## Runtime Smoke

`RUNTIME_SMOKE = PASS_READ_ONLY`.

Public GETs returned HTTP 200 for `/`, `/chat`, `/letters`, and `/classic`; `/exhibition` redirected to `/works` and returned HTTP 200. Page titles were observed where server-rendered. No API invocation, Chat message, provider call, payment action, Redis operation, or customer-flow action occurred.

## Migration Audit

`MIGRATION = UNKNOWN`.

The current production source cannot be compared as a tree. No database, Redis, payment metadata, catalog, route, or schema migration was run or proposed.

## Rollback Reference

No rollback was performed. The current production reference is `dpl_2qm83Ehqtb7rXzs7oZVWEsVSirsX`. Vercel also retains prior READY production deployment `dpl_6UMKrWmTLWhf8kVHausj7MXDjEsB` (`musiam-front-5lzdt4jqu-hakusyakus-projects.vercel.app`). Its actual rollback eligibility and effect are unverified because no rollback was attempted.

## Release Candidate Decision

`RC_SOURCE_PROVENANCE_INCOMPLETE`.

Before assembly, a Human Gate must establish a reproducible current production source: either a future Git-integrated deployment with its verified SHA, or an approved immutable source artifact export that can be compared offline. The next Unit should then make the source diff, classify production-only changes, and present a merge plan. Do not deploy, promote, roll back, copy source, cherry-pick, merge, or activate R7-C2 in response to this report.

## Required Merge Plan

None was created. Exact source provenance is a prerequisite; inventing a production-vs-Recovery merge plan from route fingerprints would be unsafe.

## Human Gates

- Decide how the current direct-deploy source becomes reproducible without modifying production in this Unit.
- Review whether the environment values whose encrypted representations were incidentally emitted by the CLI require rotation; no values were decrypted or used.
- Approve a separate source-diff/merge-plan Unit only after reproducible provenance exists.

## Known Unknowns

- Current production Git provider, repository, branch, SHA, message, install command, and full dependency tree.
- Exact production-vs-Recovery file counts and high-risk file classifications.
- Environment-value correctness, external provider health, data parity, payment correctness, and migration requirements.

## Truth Boundary

- production alias != source proof
- deployment READY != Recovery compatibility
- env name present != env value correct
- historical deploy != current deployment
- runtime fingerprint != exact source
- source match != data parity
- local build != production build
- production build != current Recovery build
- public HTTP 200 != business correctness
- test != customer
- payment path exists != payment verified
- recovered != deployed
