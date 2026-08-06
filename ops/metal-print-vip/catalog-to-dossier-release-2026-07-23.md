# Catalog to Dossier — Production Release Evidence

日時: 2026-07-23 JST
判定: `PROVEN_LIVE / PIPELINE_MISSING`

## 実装

- 対象4作品の `/works/[id]` にだけCollector Previewを表示。
- 単一CTAで対応する `/metal-print/[slug]` へ送客。
- `utm_source=work_page`、`utm_medium=owned`、`utm_campaign=catalog_to_metal`、作品slug、空間segmentを保持。
- proof前は購入義務なし・正式Offer前であることを明記。

## Production

- deployment: `dpl_nfgzyk2NKgHqaFiFMfm4KkgTAEaC`
- alias: `https://www.hakusyaku.xyz`
- state: `READY`

## 公開検証

| 作品 | HTTP | CTA | campaign | space |
|---|---:|---|---|---|
| 33 IGNITION | 200 | PASS | `catalog_to_metal` | `office` |
| A Town Called Almost Home | 200 | PASS | `catalog_to_metal` | `hotel` |
| BALIAN | 200 | PASS | `catalog_to_metal` | `wellness` |
| Deus sive Natura | 200 | PASS | `catalog_to_metal` | `home` |

## Validation

- `npm run typecheck`: PASS
- `npm run validate:metal-print-inbound`: PASS
- `npm run validate:metal-print-funnel-contract`: PASS
- `npm run build`: PASS、1041 static pages generated
- Vercel production build: PASS、1041 static pages generated

## Claim boundary

これは自社保有トラフィックから相談入口までの稼働証拠であり、需要・qualified pipeline・成約・非返金売上の証拠ではない。現在のqualifiedは0/100、非返金売上は0円のためGoal判定はHOLDを維持する。
