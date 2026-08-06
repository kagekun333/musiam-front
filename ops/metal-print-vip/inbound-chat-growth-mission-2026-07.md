# Inbound Chat Growth Mission — Metal Print

更新日: 2026-07-19
状態: `LOCAL_FUNNEL_READY / TRAFFIC_AND_PROOF_GATES_PENDING`

## Strategy pivot

主戦略を大量の個別メール送信から、世界の来館者を伯爵チャットへ集め、公爵が空間・感情・作品を一対一で結び、限定EditionのDossierへ案内するインバウンド型へ変更する。

外向き営業は、ホテル・ギャラリー等の大型案件に限定した補助チャネルとする。

## Conversion path

`search / short video / social post / referral`
→ `/vip-metal-print`
→ `伯爵に選んでもらう`
→ `/chat?intent=metal-print`
→ metal-print専用starter
→ 公爵による一問診断
→ Edition Dossier
→ 受注生産条件確認後の相談・checkout

## Revenue model

基準価格33万円、月10件、売上330万円。

初期計画値:

| Gate | Rate hypothesis | Required monthly volume |
|---|---:|---:|
| VIP / Edition sessions | — | 70,000 |
| VIP page → chat open | 12% | 8,400 |
| Chat open → first message | 45% | 3,780 |
| First message → Duke / Edition selection | 18% | 680 |
| Edition selection → qualified consultation | 15% | 102 |
| Qualified consultation → paid | 10% conservative fallback | 10 |

上記は100 qualified / ¥33,000,000 pipelineへ逆算した目標設計値であり実績ではない。各Gateを計測し、最も弱い一箇所だけを週次改善する。Organicだけで70,000 sessionを得られるとは仮定しない。

## Traffic engine

### Organic assets

- 4 Editionそれぞれに、作品世界・飾る空間・制作背景・音楽試聴を結ぶ検索ページを作る。
- 15〜30秒の縦動画を作品ごとに複数作り、壁面mockupからチャットへ送る。
- 伯爵の診断結果を共有できる短文・画像カードにし、会話から新規流入を生む。
- 日本語、英語、フランス語、ドイツ語を優先し、同じEditionでも検索意図別に入口を分ける。

### Paid acquisition Gate

- 販売対象は現行WhiteWallカート仕様と本番Stripe E2Eを確認したEditionに限定する。
- 小額テストは作品×地域×訴求を一変数で行う。
- CAC上限は全地域共通で20,000円。trailing attributed CACが超えたら新規配信を停止する。
- 広告費の実支出と外部アカウント操作は別Human Gate。

## Chat closing doctrine

- 最初から33万円を押しつけず、空間の用途と残したい感情を一問だけ聞く。
- 一度に一作品だけ提示する。
- Edition 3点、素材、受注生産条件、納期は確認済み情報だけを話す。
- 購入準備前はDossierまたは連絡許可へ着地する。
- care意図には販売しない。
- 会話本文をanalyticsへ送らない。

## Instrumentation

- `salon_open.sourceIntent = metal-print`
- `salon_starter_click.sourceIntent = metal-print`
- `salon_duke.productId = vip-metal-print`
- `salon_cta_show / click.productId = vip-metal-print`
- 次Gateで追加: `metal_dossier_view`, `metal_consult_start`, `metal_checkout_start`, `metal_paid`

## Stop conditions

- 現行vendor仕様未確認、原価未確定、margin 60%未満ではcheckoutを開かない。
- 500 qualified visitors到達前に価格や作品の勝敗を断定しない。
- 2,000 qualified visitorsでchat activation 25%未満なら流入を増やす前に入口を修正する。
- dossier 100件で相談転換5%未満ならDossierと公爵の質問を修正する。
