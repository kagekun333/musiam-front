# Japan Live Unit Economics — 2026-07-21

状態: `JP_PLATFORM_QUOTE_CAPTURED / CAC_AND_ADDRESS_TAX_MEASUREMENT_PENDING`

## Signature Square at JPY 330,000

| Item | JPY | Evidence treatment |
|---|---:|---|
| Selling price, tax included | 330,000 | public offer policy |
| WhiteWall 60 × 60cm ChromaLuxe | 26,400 | live configurator/cart |
| Standard Japan shipping | 5,100 | live cart |
| Packaging and wall rail | 0 additional | cart states art-secure packaging and rail included |
| Customs/duty reserve | 0 | shipping UI states duties and handling included; reconfirm at address checkout |
| Output consumption-tax reserve | 30,000 | conservative gross reserve before input-credit treatment |
| Stripe fee | 11,880 | 3.6% of JPY 330,000 |
| Replacement reserve | 1,575 | provisional 5% of product plus shipping; replace with measured rate |
| FX reserve | 0 | JPY-denominated cart; verify settlement statement |
| Known/reserved variable cost before CAC | 74,955 | sum above |
| Contribution before CAC | 255,045 | 77.29% |

## CAC decision line

60% contribution marginを維持できるCAC上限は暫定 `JPY 57,045`。

`330,000 × 40% − 31,500 − 30,000 − 11,880 − 1,575 = 57,045`

- Measured CACがJPY 57,045以下なら、上記保守条件では60% marginを維持できる。
- Organic inboundでも制作・配信・運用工数をゼロと仮定せず、成熟したpaid customerが発生してから実測する。
- 住所checkoutで追加税・送料が出た場合、その全額だけCAC上限を引き下げる。
- このJP計算はUS/EU coverageを証明しないため、`economics-evidence-ledger.json`のapproved scenarioにはまだ登録しない。

## Decision

JPY 330,000に対する製造原価は十分低く、日本向け価格の主要リスクは製造費ではなく、実CAC、physical proof品質、成約率である。値下げよりも、60cm角の現物価値とChat成約率の検証を優先する。
