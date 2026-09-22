# 伯爵MUSIAM — Recovery-only RC Validation / Preview Preflight

## Result

`LOCAL_VALIDATION_PASS_PREVIEW_GATE_REQUIRED`.

The governance source is `a5a374d`; the frozen application identity remains
`a918b05`. Their delta contains only the four prior RC governance files:
`RECOVERY_ONLY_RC.md`, `RECOVERY_PLAN.md`, the RC JSON record, and its
validator. No `src/`, `public/`, package, lockfile, Next/Vercel, TypeScript, or
runtime/build configuration file changed. `APPLICATION_DRIFT = 0`.

The fixed decisions remain `KEEP_RECOVERY_FOR_THIS_RC`,
`KEEP_DIGITAL_SHOP_DEFERRED`, and `KEEP_CURRENT_LLM_ROUTER`; `RC_PATH` remains
`RECOVERY_ONLY`. A1-A3, D1-D2, and LLM-router redesign were not started.

## Local Validation

The governance/current validators passed: RC Assembly Review (29 checks),
production-vs-Recovery diff (1,822), source provenance (27), parity report
(21), final integration (45), R7-A, R7-B, R7-C1, R7-C2, R7-D1, R7-D2, and R1
Metal Print webhook routing. The original `validate-recovery-only-rc.ts` is a
pre-commit base-state validator: it passed at its required `a918b05` state
(26 checks). Its direct invocation at governance HEAD is intentionally
inapplicable because it asserts that HEAD is the application base. The
governance-only zero-drift check re-establishes that its application invariant
continues to apply without changing that historical validator.

Root `npm run typecheck`, targeted critical-runtime lint, RC-validator lint,
and `git diff --check` passed. Secret scanning found one committed example env
file and known test/example fixtures only; no Authorization value or private
key block was found, and no value is recorded here.

## Runtime Invariants

- Catalog: canonical `loadMergedWorksServer`, runtime 514, stable IDs only.
- Chat: `/api/chat-experience-v3`; R7-B and R7-C1 retained; history is not entitlement.
- R7-C2: `BLOCKED_PRODUCT_CONTRACT / PAID_CONTINUATION_NOT_ACTIVATED`.
- Exhibition: displayed 514; missing released works 0.
- Oracle and Omikuji: `ORACLE_INACTIVE_BY_DESIGN` redirects.
- Home/Realm, Letters, Broadcast/Now Playing, and TodaysPick retained.
- R1 Metal Print webhook identity boundary retained.

## Build and Deploy Input

`LOCAL_BUILD = BLOCKED_BY_FONT_DNS`. The one build reached only exact
`fonts.googleapis.com` DNS failures for Cinzel, EB Garamond, Inter, and Noto
Serif JP. This is not classified as an application failure; no source or
configuration was changed. Preview remains the next build authority.

The offline Vercel CLI 59.24.0 `inspectDeploymentFiles` collector recorded the
governance HEAD input: 3,208 files, 214,358,158 bytes, 46 ignored entries, and
SHA-256 `27027cd4fa82597b2d8b4d87b79a26b5a26f2c207b87df7aff8cddae6f0994ee`.
The old 3,205-file manifest is different solely as
`NON_RUNTIME_GOVERNANCE_MANIFEST_DRIFT`; it is not application drift. The
collector was offline and did not mutate a provider.

## Preview Smoke Plan

At the separate Human Gate, Preview-only smoke checks cover `/`, `/chat`,
`/exhibition`, `/letters`, `/classic`, and a representative stable-ID work
route for HTTP, render, navigation, and fatal console/server errors. Chat is
limited to page/UI/history/card initialization with no provider message.
Exhibition checks count and stable detail links; Letters checks list/detail and
back/scroll; Broadcast does not force playback; Payment performs no purchase;
Oracle remains an inactive redirect.

## Truth Boundary

- The application identity is `a918b05`; `a5a374d` is governance-only.
- An offline deploy-input inventory is not production environment, runtime, data, provider, payment, or customer-state proof.
- Local validation and a DNS-limited local build are not Preview or production success.
- Stable identity is not a content, rights, availability, recommendation, or sales claim.
- History is not entitlement, and the Chat guard is not paid continuation.
- Preview is not authorized. No deploy, push, production mutation, provider, payment, or data operation occurred.
