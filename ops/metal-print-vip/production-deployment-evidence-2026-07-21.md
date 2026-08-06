# Metal Print Production Deployment Evidence — 2026-07-21

## Deployment

- Vercel deployment: `dpl_2zF7HWSKWdDr3NwWpBJbSRZm7jkL`
- Target: `production`
- Ready state: `READY`
- Production aliases: `hakusyaku.xyz`, `www.hakusyaku.xyz`
- Build: Next.js 15.5.12, 1040 generated routes/pages, including the three metal-print API routes.

## Encrypted configuration evidence

Vercel reported the following names as encrypted for Production and Preview. Values are intentionally not recorded.

- `STRIPE_SECRET_KEY`
- `STRIPE_METAL_PRINT_WEBHOOK_SECRET`
- `METAL_PRINT_IDENTITY_SECRET`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `NEXT_PUBLIC_SITE_URL`

Stripe destination `musiam-metal-print-sales` is active at `https://hakusyaku.xyz/api/metal-print/webhook` for:

- `checkout.session.completed`
- `checkout.session.expired`
- `charge.refunded`

## Live verification

- `/vip-metal-print`: HTTP 200
- `/metal-print/33-ignition-office-art`: HTTP 200
- unsigned `/api/metal-print/webhook`: HTTP 400 `signature_missing` (expected rejection)
- invalid `/api/metal-print/consultation`: HTTP 400 `invalid_identity` (expected rejection)
- Vercel runtime errors for metal-print API routes after deployment: none

## Claim boundary

This proves production deployment, route reachability, encrypted-variable presence and rejection controls. It does not prove a paid Checkout Session, signed Stripe delivery, durable paid inventory transition, refund lifecycle, vendor fulfillment, physical proof quality or non-refunded revenue. Offers remain unapproved and live-sales readiness remains `false`.

## Recovery deployment — 2026-07-21 evening

- Previous production runtime logs exposed `ENOENT /var/task/public/works/works.json`, causing HTTP 500 on the home, showcase and realm pages.
- Root cause: runtime `fs` loaders required the public catalog inside Vercel server-function traces; CDN availability alone did not place it under `/var/task/public`.
- Added a narrow `outputFileTracingIncludes` rule for `./public/works/*.json` across server routes.
- Local production build passed and `.nft.json` traces for home, showcase, Chat, metal-print routes and APIs contain `public/works/works.json`.
- Recovery production deployment: `dpl_HD8GBM69YzbFbGsq7sZnuWfZEthX`, state `READY`, alias `www.hakusyaku.xyz`.

Live HTTP verification after aliasing:

- `/`: 200
- `/showcase`: 200
- `/realm/skyfield`: 200
- `/vip-metal-print`: 200, includes `600 × 600MM`, `60cm角`, and `¥330,000`
- `/metal-print/33-ignition-office-art`: 200, includes `¥330,000`
- `/works/works.json`: 200
- unsigned `/api/metal-print/webhook`: 400 `signature_missing`
- Vercel error log query after verification: no new errors
