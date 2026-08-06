# Inbound Attribution Release — 2026-07-21

Status: `LIVE / COLLECTION_READY`

## Released path

`/vip-metal-print` → space-specific Edition page → `/chat?intent=metal-print` → consented consultation → durable Redis record → anonymous campaign pipeline summary.

## Space segments

- home: Deus sive Natura
- office: 33 IGNITION
- hotel: A Town Called Almost Home
- wellness: BALIAN

Each entry carries `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `space`. The Edition CTA preserves those values into Chat. Chat includes the bounded values in analytics and the consultation API. The durable pipeline snapshot exposes only campaign counts, never email or individual records.

## Production evidence

- Deployment: `dpl_6nQ4CA9V8Pz3KfjbPbdZPvi9f4AU`
- Generic-entry recovery deployment: `dpl_CzFCQKiwup2CqmNXbSpQiBDhBZJL`
- Alias: `https://www.hakusyaku.xyz`
- State: `READY`
- `/vip-metal-print`: live HTML contains all four `space_selector` links.
- Edition URL with attribution: HTTP 200.
- Chat URL with attribution: HTTP 200.
- Production Chat API returned `persona=duke`, `productId=vip-metal-print`, and a VIP CTA for the generic metal-print starter without calling an LLM (`provider=none`).
- Production browser E2E confirmed generic entry → starter → Duke divider → four-Edition selector → Deus sive Natura → consultation form.
- After selection the live URL retained `utm_source`, `utm_medium`, `utm_campaign`, `work`, and `space=home`.

## Validation

- `npm run typecheck`: PASS
- `npm run validate:metal-print-consultation`: PASS
- `npm run validate:metal-print-attribution`: PASS
- `npm run validate:chat-sales`: PASS
- `npm run build`: PASS, 1040 static pages generated

## Truth boundary

This release enables qualified-pipeline acquisition and channel measurement. It does not prove demand, CAC, conversion, or revenue. Current durable qualified count remains 0; the conservative strong target remains 100 qualified consultations for 10 sales until measured conversion supports a different lower bound.
