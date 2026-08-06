# Placement Attribution Evidence — 2026-07-23

Status: `PROVEN_LIVE / PRODUCTION TRAFFIC PENDING`

本番 `dpl_EdQ1QpcR27yhH5o9oPYra2iNzkvq` に、個人情報を含まない配置別集計を反映した。

- Funnel: `campaign + source + content` ごとに7イベントの匿名ユニークセッションをRedis sorted setで集計。
- Pipeline: 同じ配置単位でqualified / nurture / pipeline valueを集計。
- Locale: `metal_print_inbound` はja、`metal_print_inbound_en` はen。検証prefixでも毎回campaignから再計算する。
- Privacy: email、IP、相談本文、個別相談レコードは集計snapshotへ出力しない。
- Scale: 集計時に全イベントmemberを読み出さず、配置registryと`ZCOUNT`だけを使用する。

## Live verification

2026-07-23T14:44:29Z、検証専用namespaceで次を確認した。

- campaign: `verification_metal_print_inbound_en`
- locale: `en`
- source: `instagram`
- content: `IGNITION-EN-01`
- `metal_dossier_view`: 1

同時刻のproduction namespaceは全イベント0、配置0。検証データは実顧客指標に混入していない。英語EditionページはHTTP 200。

## Claim boundary

計測基盤の本番稼働証拠であり、需要・成約・売上の証拠ではない。外部公開後の実測CACとqualified pipelineが入るまで保証判定はHOLDを維持する。
