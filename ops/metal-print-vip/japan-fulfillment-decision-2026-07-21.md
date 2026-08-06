# Japan Fulfillment Decision — 2026-07-21

## Selected route

Japanese customer orders use a two-route policy. Large square editions use a custom-format ChromaLuxe supplier after a live quotation confirms delivery and landed cost. `metal-print.jp` operated by PIOTEC remains the domestic rectangular fallback and proof supplier. Orders are placed one at a time; no special wholesale contract is required for launch.

## Cost baselines, tax included

| Offer candidate | Panel | Mount | Standard domestic shipping | Landed baseline |
|---|---:|---:|---:|---:|
| 8x10 inch | JPY 7,700 | hanger JPY 440 | JPY 1,100 | JPY 9,240 |
| 10x10 inch square | JPY 11,000 | hanger JPY 440 | JPY 1,100 | JPY 12,540 |
| 16x20 inch | JPY 28,050 | pedestal JPY 2,915 | JPY 1,980 | JPY 32,945 |
| 16x24 inch | JPY 37,400 | pedestal JPY 2,915 | JPY 1,980 | JPY 42,295 |
| 24x36 inch | JPY 77,550 | two pedestals JPY 5,830 | JPY 4,400 | JPY 87,780 |

北海道、沖縄、離島は別送料。通常の国内配送では輸入関税と為替準備金はゼロ。

## Commercial size policy

- `10x10`以下は色、階調、表面、梱包を確認するproof専用。JPY 330,000の商品として販売しない。
- Primary Signature Square: `600 x 600mm`、JPY 330,000、各作品3部限定。
- Grand Square: `800 x 800mm`、JPY 550,000、各作品2部限定。
- One-of-One Monument: `1000 x 1000mm`、JPY 880,000以上、各作品1部限定。梱包、重量、壁面施工を個別確認する。
- 正方形ジャケットは正方形のままフルブリードを第一仕様とする。トリミング、縦横比変更、生成AIによる絵柄の継ぎ足しはしない。
- 大判正方形の納期または費用が条件を満たさない場合のみ、国内`16x24 inch`または`24x36 inch`を「Archive Monolith」仕様で使う。正方形原画の上下に設計余白を置き、原画自体は変更しない。
- 入稿解像度の基準は原寸200ppi以上、目標300ppi。600mm角は4724px以上（目標7087px）、800mm角は6299px以上（目標9449px）、1000mm角は7874px以上（目標11811px）。

詳細な意匠、価格階層、売上構成は `square-edition-architecture-2026-07-21.md` を正とする。

## Operating model

1. Stripeの`paid`を確認。
2. 顧客住所を検証。
3. 対応する正方形master、またはArchive Monolith presetを選ぶ。
4. 注文フォームへ商品、注文者、顧客届け先を自動入力。
5. 館主が支払いを承認。
6. 注文番号と発送追跡をfulfillment ledgerへ記録。
7. 顧客へ納期と製造パートナー表記を通知。

APIがないため完全無人発注にはしない。月商目標に必要な約10件/月では、誤発注を防げる支払前Human Gateを残しても運用負荷は小さい。海外注文はProdigi/Gelatoへルーティングする。

## Owner-only actions

- 初回有料校正の支払い承認。
- 届いた校正の現物品質 ACCEPT / REVISE。
- 実注文ごとの印刷会社への支払い承認。将来、専用決済手段と上限額を設定した場合のみ自動化対象に変更できる。

上記以外の画像仕様作成、注文内容生成、住所検査、フォーム入力、台帳記録、発送監視、顧客通知は自動化対象とする。
