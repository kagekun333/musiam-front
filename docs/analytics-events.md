# PostHog 計測イベント設計 (2026-06)

サイト全体の計測イベント一覧と、PostHogダッシュボードの組み方。
売上に直結する数字だけを見る。虚栄の指標(PV総数など)は追わない。

## イベント一覧

| イベント | 発火場所 | 意味 |
|---|---|---|
| `$pageview` | 全ページ(App/Pages両Router) | 流入の母数 |
| `contact_cta_click` | /business・/atelier (props.location) | **法人リード** — 最重要 |
| `chat_biz_lead_click` | チャットの法人バナー | チャット経由の法人リード |
| `shop_buy_click` | /shop 購入ボタン (props.productId) | 直販の購入意思 |
| `donation_click` | 作品ページの寄進ボタン | 投げ銭意思 |
| `work_link_click` | /works 外部リンク (props.label) | 配信/購入への送客 |
| `exhibit_detail_click` | 展示→作品ページ | 内部回遊 |
| `chat_work_detail_click` | チャット→作品ページ | 内部回遊 |
| `oracle_share_x` | 占い結果のXシェア | バイラル発生数 |
| `chat_gift_click` | チャットの作品リンク | チャットの送客力 |
| `exhibit_link_click` | 展示の外部リンク | 展示の送客力 |
| `gate_click` | 旧gates(レガシー) | — |

## ダッシュボード構成(PostHogで作る4枚)

1. **売上ファネル**: `$pageview` → `work_link_click` or `shop_buy_click` → (Stripe側で成約確認)
2. **法人ファネル**: `$pageview`(/business) → `contact_cta_click` — 週次で件数を見る
3. **集客装置の効率**: `oracle_share_x` 数と、シェアURL経由の流入(`utm`なしでもreferrer=t.co)
4. **回遊**: `exhibit_detail_click` + `chat_work_detail_click` + works滞在

## 見るべきKPI(週次)

- 法人リード数 (`contact_cta_click` + `chat_biz_lead_click`) — 目標: 週3件
- 直販クリック (`shop_buy_click`) — Stripe Link設定後に有効化
- Xシェア数 (`oracle_share_x`) — バイラル係数の種
- /works への内部流入比率 — SEO育成の進捗
