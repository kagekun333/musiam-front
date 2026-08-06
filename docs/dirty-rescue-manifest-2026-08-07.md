# Dirty Worktree Rescue Manifest — 2026-08-07

Status: `STATE_LOCKED`

## Safety rules

- Delete nothing.
- Do not move or rename raw/proof/media assets during the rescue.
- Do not push or deploy until each source commit passes its validation gate.
- Keep `public/` media available until direct-public-URL use is audited.
- Keep candidate, approved, and published evidence semantically distinct.

## Commit lanes

### A. Runtime foundation and owned acquisition

Tracked and untracked application code outside the Chat surface: catalog loading,
works/shop/business/realm entry points, metal-print and office-art pages, Stripe,
Redis, consultation, fulfillment, attribution, sitemap, and runtime configuration.

Validation: `npm run typecheck`, `npm run build`, metal-print validators.

### B. Chat sales and conversation continuity

Chat UI/API, sales ranking, interest bridge, music affinity, metal-print sales
conversation, history persistence API/storage, golden set, analytics contract, and
Chat validators.

Validation: `npm run typecheck`, `node --import tsx scripts/validate-chat-sales.ts`,
`npm run build`, then production history round-trip after deploy approval.

### C. Audience and operations tooling

Daily music/Launch Wave scripts, metal-print builders/auditors/validators, operating
policy, ledgers, approval candidates, and evidence documents. These are repository
assets, not public runtime output.

Validation: JSON parse, script syntax, and named validators where applicable.

### D. Public campaign media

Files under `public/audience/` and `public/metal-print-campaign*/` are retained because
they may be addressed directly by published posts or campaign URLs. They are not
deleted or moved until a public-reference audit is complete.

### E. Protected large local assets (not committed)

- `ops/metal-print-vip/proof-assets/**/*.tiff`
- `ops/metal-print-vip/proof-assets/**/*.jpg`
- `ops/audience-engine/daily-music-release-media/**/*.mp4`
- `ops/audience-engine/media-repair-candidates/**/*.mp4`

These files remain in place and are excluded from ordinary Git/Vercel payloads.
Three repaired videos are byte-identical to their corresponding `public/audience/`
copies; both locations remain untouched pending an explicit archive decision.

## Runtime exceptions inside ops

The following small registries are imported by production source and must remain
available to the Vercel build until they are deliberately migrated into `src/data/`:

- `ops/audience-engine/abi-hakusyaku-account-registry.json`
- `ops/metal-print-vip/made-to-order-sales-approval-2026-07-24.json`

## Completion condition

The rescue is complete when source and operations lanes are represented by reviewed
commits, validations pass, protected large assets remain unmodified, and `git status`
contains only explicitly documented local/media candidates.
