# Trading Post Offer Unification — Production Evidence

日時: 2026-07-23 JST
判定: `PROVEN_LIVE / PIPELINE_MISSING`

## 解消した競合

- A3 `¥39,800`、A2 `¥69,800`、A1 `¥98,000`のStandard Offerを削除。
- 別建て法人メタル商品と旧「価格準備中」VIP商品を、一つのCollector Editionへ統合。
- 「入荷をお知らせ」のメール導線を廃止し、伯爵Chatへ直結。

## 現行Offer

- `¥330,000` 税込。
- 60 × 60cm ChromaLuxe候補。
- 各作品3点まで。
- 実物proof確認後にのみ正式Offer。
- `utm_source=shop`、`campaign=collector_treasure`。
- payment URLは設定せず、proof前決済を防止。

## Evidence

- production: `dpl_CVyqGus6hZd6EPwryiuxDYuRou2w`、`READY`、独自ドメインalias済み。
- 公開HTML: 38,083 bytes。33万円、60cm角、3点、proof first、Chat attributionを確認。
- 公開HTMLに旧3価格と入荷通知CTAがないことを確認。
- typecheck、inbound、attribution、sales-policy: PASS。
- local/Vercel build: PASS、1041 pages。

これはOffer一貫性と獲得経路稼働の証拠であり、需要・成約・売上の証拠ではない。
