# Home Owned-Acquisition Release — 2026-07-23

Status: `LIVE / REAL TRAFFIC PENDING`

Production deployment: `dpl_7KrfZvHDqs9ZCQtbTRa6JWD2tqK6` (`READY`)

既存ホームにあった2つのメタルプリント導線を、見た目とproof-first文言を変えずに配置別計測へ接続した。

- 入領ゲート: `source=home`, `medium=owned`, `campaign=metal_print_inbound`, `content=realm_gate`
- 下部近道: `source=home`, `medium=owned`, `campaign=metal_print_inbound`, `content=home_quicklink`
- Destination: `/chat?intent=metal-print`
- Conversion path: Chat start → Salon → first message → Duke diagnosis → Edition selection → consented consultation

## Validation

- `validate:metal-print-inbound`: PASS
- `validate:metal-print-first-party-funnel`: PASS
- typecheck: PASS
- production build: PASS, 1045 pages
- live homepage HTML: both distinct attributed URLs present
- live attributed Chat URL: HTTP 200

## Truth boundary

This enables measurement from existing owned traffic without external posting or ad spend. It does not prove reach, demand, qualified pipeline, CAC, or revenue; production Funnel and pipeline remain authoritative.

## 2026-07-24 measurement extension

Deployment `dpl_24fgkzVxL8xd1fs28c6bTQK3WTes` adds anonymous home-view and CTA-click denominators. The daily controller waits for 1,000 home sessions before diagnosing a sub-1% CTA rate, and passive home views cannot start the 30-day qualified-acquisition Sprint. Verification events were isolated from production.
