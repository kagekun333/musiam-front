# Global Metal Print POD — Vendor Scorecard

更新日: 2026-07-18
状態: `PUBLIC_EVIDENCE / QUOTES_AND_PROOFS_PENDING`

## 評価軸

| 軸 | Weight | 必須条件 |
|---|---:|---|
| 世界配送・現地生産 | 25 | 日本・北米・EUを含む |
| 1点POD・MOQなし | 15 | 在庫不要 |
| API・自動発注 | 15 | order、quote、status、tracking |
| メタル品質・サイズ | 20 | 商品方式、ICC、取付、proof |
| White label | 10 | 顧客へ直接配送 |
| 総原価 | 10 | 商品、送料、税、破損再製造 |
| 実績・サポート | 5 | SLA、窓口、障害対応 |

価格・proof回答前の点数は暫定であり、契約判断には使わない。

## 暫定比較

| Vendor | Global | 1 unit | API | Metal | White label | Cost | Support | 暫定総合 | 判定 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Gelato | 25 | 15 | 15 | 14 | 8 | 5 | 5 | 87 | `GLOBAL_CANDIDATE_1` |
| Prodigi | 18 | 15 | 15 | 18 | 10 | 6 | 5 | 87 | `AUTOMATION_CANDIDATE_1` |
| Pictorem | 12 | 15 | 0* | 20 | 10 | 5 | 4 | 66* | `API_CONTRADICTION / HOLD` |
| Metal Print Japan | 4 | 15 | 0 | 19 | 2 | 8 | 4 | 52 | `JAPAN_PROOF_CANDIDATE` |
| GW Prints | 18 | 15 | 12 | 14 | 10 | 2 | 1 | 72 | `DUE_DILIGENCE_REQUIRED` |

## 公式情報から確認済み

### Gelato

- Aluminum Di-bond、30超のformat。
- 200超の国・地域、32か国生産、約90%を現地生産と説明。
- MOQなし、1点POD、API対応。
- 価格、正方形SKU、日本向け実製造地、white-label詳細、ICC、同一品質は回答待ち。

### Prodigi

- API、manual order、主要EC連携、MOQなし、white-label。
- Platform全体は世界配送とglobal networkに対応。
- ChromaLuxe aluminiumはUS製造・公式商品ページ上US配送。DibondはUK/US/EU系統。
- 世界で同一Metal SKUを販売できるか、Japan landed costは回答待ち。

### Pictorem

- ChromaLuxe、brushed、smooth white metal、8×8〜大型custom size。
- MOQなし、white-label。公式connectページはREST API対応を掲示。
- 2026-07-18の公式問い合わせ窓口は「公開REST APIなし」と回答し、公開ページと矛盾。書面で解消するまでAPI点は0、automation候補はHOLD。
- 北米生産。日本・EUへの送料、関税、SLA、破損率は回答待ち。

### Metal Print Japan

- ChromaLuxe、1枚注文、国内3〜10営業日、公開価格が明確。
- 10×10インチ11,000円、8×8インチ7,700円。
- API、世界white-label配送、自動発注は公開情報上未確認。

## 現時点の推奨構成

単一vendorを無理に世界へ使うより、AI routerで地域とEdition tierを分ける方がコスパと品質を両立しやすい。

1. `GLOBAL_STANDARD`: Gelato Aluminum Dibond — 世界現地生産候補
2. `COLLECTOR_US`: Prodigi ChromaLuxe — US premium候補
3. `COLLECTOR_JP`: Metal Print Japan ChromaLuxe — 日本proof・国内納品候補
4. `LARGE_CUSTOM`: Pictorem — 大型・特殊metal候補

ただしブランド上「同一Edition」は素材・色・厚み・取付・サイズが一致しない限り地域別vendorへ分割しない。仕様が変わる場合は別SKU・別Edition IDとする。

## Partnership decision

正式提携先は、回答とproofを次の式で再採点して決める。

`value score = quality proof 35 + landed cost 25 + global SLA 15 + API 15 + damage/reprint 5 + white label 5`

最低条件:

- 1点発注可能
- APIまたは自動注文
- 顧客直送・white-label
- 日本、北米、EUをカバー
- SKU別のlanded cost取得可能
- 破損再製造条件
- test/sandboxまたは発注前quote

## Sources

- https://www.gelato.com/products/aluminum-prints
- https://dashboard.gelato.com/docs/
- https://www.prodigi.com/print-api/
- https://www.prodigi.com/products/wall-art/metal-prints/aluminium-prints/
- https://www.pictorem.com/connect.html
- https://www.metal-print.jp/products/
- https://www.metal-print.jp/faq/
- https://gwprints.com/
