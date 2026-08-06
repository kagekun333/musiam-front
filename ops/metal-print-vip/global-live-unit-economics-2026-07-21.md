# Global Live Unit Economics — 2026-07-21

状態: `JP_US_EU_LIVE_PLATFORM_QUOTES_CAPTURED / FINAL_APPROVAL_PENDING_MEASURED_CAC`

## Same-product quote evidence

| Region | Configuration | Native quote | JPY evidence input | Tax display | Delivery |
|---|---|---:|---:|---|---|
| JP | 60 × 60cm ChromaLuxe, glossy, rails | JPY 26,400 + 5,100 shipping | JPY 31,500 | VAT not included | approx. 12 working days |
| US | 25 × 25in ChromaLuxe, glossy, rails | USD 291.95 + 24.95 shipping | JPY 51,461 | sales tax not included | approx. 9 working days |
| EU/DE | 60 × 60cm ChromaLuxe, glossy, rails | EUR 187.95 + 9.95 shipping | JPY 36,720 | German VAT included | approx. 7 working days |

US uses the nearest standard square larger than 60cm: 25in = 63.5cm. This is a conservative production-cost comparison, not a smaller substitute.

## FX evidence and reserves

ECB reference rates for 2026-07-20: EUR/JPY `185.54`, EUR/USD `1.1426`, therefore USD/JPY `162.3840`. US and EU calculations additionally reserve 5% of landed vendor cost for FX movement. ECB rates are reference evidence, not guaranteed settlement rates.

## Pre-CAC economics at JPY 330,000

| Region | Landed vendor cost | Indirect-tax reserve | Stripe | Replacement | FX | Contribution before CAC | Maximum CAC at 60% margin |
|---|---:|---:|---:|---:|---:|---:|---:|
| JP | 31,500 | 30,000 | 11,880 | 1,575 | 0 | 255,045 / 77.29% | 57,045 |
| US | 51,461 | 30,000 | 11,880 | 2,574 | 2,573 | 231,512 / 70.16% | 33,512 |
| EU/DE | 36,720 | 55,000 | 11,880 | 1,836 | 1,836 | 222,728 / 67.49% | 24,728 |

Indirect-tax figures are conservative planning reserves, not tax advice or a jurisdictional conclusion. Actual destination tax and settlement statements replace them after paid orders.

## Decision boundary

All three required regions now have current self-service platform quotes. The scenario remains candidate-only because attributed CAC, actual Stripe/FX settlement, address-specific US sales tax, the JP final invoice, and measured replacement rate do not yet exist. `customerAcquisitionCostYen: 0` in the candidate ledger is solely the algebraic pre-CAC baseline and is explicitly marked `UNMEASURED_PLACEHOLDER`; it is not an organic-zero assumption and cannot approve the economics gate.

At the current reserves, worldwide sales can retain 60% contribution margin only if matured CAC remains below the region-specific ceiling. The EU lane is the controlling constraint at approximately JPY 24,700 CAC per paid buyer.
