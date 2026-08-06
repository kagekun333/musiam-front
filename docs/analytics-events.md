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

### メタルプリント／オフィスアート導線 (2026-07〜)

| イベント | 発火場所 | 意味 |
|---|---|---|
| `shop_restock_notify` | /shop スタンダードライン枠 (props.to) | 価格未確定枠のリード獲得 |
| `shop_order_inquiry` | /shop 受注制作・VIP枠 (props.to) | 高単価の相談意思 |
| `salon_open` | /chat 起動時 | 導線の着地。UTM一式を props で保持 |
| `salon_starter_click` | /chat スターター (props.sourceIntent) | `metal-print` / `office-art` / `direct` を分離 |
| `office_art_cta_click` | /office-art のチャットCTA3種 (props.location = `hero` / `edition_story` / `footer`) | ハブのどの位置が相談に効くか |
| `office_art_dossier_click` | /office-art → Collector Dossier (props.slug) | 検討の深さ |
| `office_art_guide_click` | /office-art → SEO記事 (props.guide) | ハブから記事への回遊 |
| `office_art_cross_click` | /business → /office-art (props.location) | 音楽法人客へのクロスセル成立数 |

### 英語圏オフィスアート導線 (2026-08-06〜)

日本語クラスタと**同名イベントにしない**。国内は税制訴求（少額減価償却資産の特例）が効く前提の導線、
英語圏は税制に依存しない調達訴求の導線であり、CVRを混ぜて平均すると
「どちらの訴求が効いたか」が判定できなくなるため、`en_` 接頭辞で分離する。

| イベント | 発火場所 | 意味 |
|---|---|---|
| `en_office_art_cta_click` | /en/office-art のチャットCTA3種 (props.location = `hero` / `edition_story` / `footer`) | 英語ハブのどの位置が相談に効くか |
| `en_office_art_dossier_click` | /en/office-art → /en/metal-print/[slug] (props.slug) | 検討の深さ |
| `en_office_art_guide_click` | /en/office-art → ガイド (props.guide = `size_guide` / `ja_tax_guide`) | 英語読者が日本語税務記事まで踏むか（＝国内申告者の割合の代理指標） |

- 英語導線の `utm_source` は `en_office_art` / `en_size_guide`、`utm_campaign` は `founder_office_en` /
  `office_art_seo_en`。日本語側（`office_art` / `size_guide`）とは重ならないため、
  `salon_open` を `source` でブレイクダウンするだけで言語別に分離できる。
- チャット側の `intent` は日本語版と同じ `metal-print` を使う（スターター出し分けの仕様を変えないため）。
  言語は `?lang=en` で明示する。

## アトリビューション規約 (中継ページ問題)

オフィスアートのオーガニック導線は、**必ず中継ページを1〜2枚挟んでから**リード着地する。

```
SEO記事(/office-art/tax-guide)  ─┬─→ /shop      ─→ /chat
                                 └─→ /office-art ─→ /chat   ← ハブ経由
/business ─→ /office-art ─→ /chat                            ← 音楽法人客のクロスセル
```

中継ページのCTAは静的な固定URLなので、放置すると最後のホップで `utm_source` が
中継ページ名（`shop` / `office_art` / `business`）に潰れ、
「どの記事から来た法人リードか」が分離できない。`src/lib/utm.ts` の
`withInboundAttribution()` がこれを合成する。適用箇所:

- `/shop`: `src/app/shop/BuyButton.tsx`（`shop_restock_notify` / `shop_order_inquiry`）— 2026-08-02
- `/office-art` ハブ・`/business` クロスセル: `src/components/cta/AttributedCta.tsx` — 2026-08-03

| パラメータ | 意味 | 例 |
|---|---|---|
| `utm_source` / `medium` / `campaign` | **獲得元(first touch)** を優先。記事の値がそのまま残る | `tax_guide` |
| `utm_content` | **実際に押されたCTA**。中継ページ側の値を維持 | `primary_cta` |
| `inbound_content` | 流入元が持っていた `utm_content` を捨てずに退避 | `collector` |
| `via` | **直前の**経由地（中継ページが元々名乗っていた source） | `office_art` |
| `space` / `work` | 文脈。base に無い場合のみ引き継ぐ | `office` |

- 3枚以上経由した場合、`via` は**最後の中継ページのみ**を示す（経路全体は保持しない）。
  獲得元の判定は `utm_source`、直前の面の判定は `via` を見る。
- 流入元に `utm_source` が無い場合（＝オーガニック直着地）は合成せず、中継ページ既定の計測をそのまま使う。

`salon_open` は上記を `source` / `content` / `inboundContent` / `via` / `spaceSegment` として記録する。

- 値は `[\w.\-:/]` 以外を `_` に正規化し64文字で切る（URL汚染・注入防止）。
- 流入元に `utm_source` が無い場合は何もせず、/shop 既定の計測をそのまま使う。
- **記事別の効果を見るときは `salon_open` を `source` でブレイクダウンする**（`via=shop` が付いていれば交易所経由）。

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
