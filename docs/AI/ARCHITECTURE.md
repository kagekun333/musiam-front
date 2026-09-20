# 伯爵MUSIAM — Architecture Map

最終監査: 2026-09-20。静的コードからの地図であり、資格情報・provider接続・本番DB/Redisの状態は検証していない。

## 技術スタック

**確認済み事実**: Next.js 15.5 / React 19 / TypeScript。App Router を主に使い、既存Chat・おみくじAPIは Pages Router API も使う。依存は Stripe、`@upstash/redis`、PostHog、web-push、Zod、Sharp等（`package.json`）。Vercel cronは毎日 `/api/cron/metal-print-ops` を呼ぶ（`vercel.json`）。

## 重要ディレクトリ

|領域|主な場所|役割|
|---|---|---|
|画面・App API|`src/app/`|公開ページ、server route、Metal Print / shop / funnel API|
|旧API・Chat|`src/pages/api/`, `src/pages/chat.tsx`|Chat v1/v2/v3、履歴、health、omikuji|
|共有UI|`src/components/`|Nav、home、作品、CTA、相談、oracle等|
|ドメインロジック|`src/lib/`|カタログ、LLM、Stripe、Redis、注文、販売・計測ポリシー|
|コンテンツ|`public/works/`, `content/`, `public/images/`, `public/audio/`|作品マスタ、sidecar、展示/素材|
|運用証拠|`ops/`|販売判断、承認、公開、計測、Human Gateの台帳|
|自動化・検証|`scripts/`|カタログ、画像、販売、公開、evidenceのbuild/validator|

## 全体フロー

1. 画面/APIは `loadMergedWorksServer()` / client loaderから作品を取得する。
2. loader は `works.json` を核に、imports、SSD、continuous、drone、content evidence、readinessを合成する。
3. Chat は Pages Router API と `llm-router` を経由する。providerの順序は目的別で、設定なし/失敗をフォールバックする。
4. 計測イベントは目的別routeとRedis集計へ渡され、Metal Print cronがfunnel・相談・売上・proof・vendor queueを集計する。
5. Commerceはデジタル商品とMetal Printで別経路。両方ともStripeを使うが、前提条件と状態ストアは異なる。

## 主要ドメインとデータフロー

### 作品・音楽・コンテンツ

`public/works/works.json` は手調整済みの一次マスタで、`works-ssd.json` は補完sidecar。`mergeWorksCatalog()` は一次マスタのID、リンク、coverを優先し、titleやISRCだけでは重複統合しない。これは誤同一視を避ける境界である。

**変更注意**: `public/works/works.json` の全文置換は禁止。IDを維持したpartial mergeのみ。`public/works/works-ssd.json` は `scripts/gen-works-ssd.mjs` の生成対象で、PortableSSDをリポジトリへコピーしない。

### Chat・AI

`src/pages/chat.tsx` が主なUI、`chat-experience-v3.ts` と `chat-reco-v2.ts` が主要サーバー経路。`src/lib/llm-router.ts` だけがprovider呼出しを担う。LLM providerに直接fetchを追加しない。カタログはVercel functionへtraceされるよう `next.config.js` に明示されている。

### Metal Print commerce

相談 → 資格/同意 → 承認済みoffer → Redis予約 → Stripe Checkout → 署名Webhook → paid queue → 人間によるvendor発注/fulfillmentという流れ。関連コード:

- offer承認: `src/lib/metal-print-offers.server.ts`
- Redis状態遷移: `src/lib/metal-print-redis.server.ts`
- Stripe: `src/lib/metal-print-stripe.server.ts`
- checkout: `src/app/api/metal-print/checkout/route.ts`
- webhook: `src/app/api/metal-print/webhook/route.ts`
- cron集計: `src/app/api/cron/metal-print-ops/route.ts`

Checkoutは相談の資格、dossier、purchase intent、proof disclosure、受注生産termsを要求する。配送先は `METAL_PRINT_VERIFIED_SHIPPING_COUNTRIES` に制限するが、vendorの実際の価格・制作可否は注文ごとに確認する契約（`src/lib/metal-print-shipping-policy.ts`）。WebhookはStripe署名、金額、offer承認snapshotを検証する。

### デジタル商品

商品定義は `src/lib/digital-products.ts`、配布releaseは `src/lib/digital-delivery-releases.server.ts`。`/api/shop/checkout` は同一origin・rate limit・Stripe価格整合・Redis orderを通し、`/api/shop/download` はorder owner nonceで短命の配布URLを返す。release approval/verificationは別gateであり、現在は承認を前提にしない。

### Evidence / HAKUSYAKU CABINET / 運用

リポジトリ中で確認できる実体は `ops/ai-execution-os/`、`ops/metal-print-vip/`、`ops/audience-engine/`、`ops/catalog-intelligence/`、`ops/market-learning/`、`ops/musiam-funnel/`。これらはコードから自動的に真実化されない、証拠・承認・運用の記録である。`HAKUSYAKU CABINET` と `Evidence Factory` という名称の実行システムは、この限定監査では確認できなかったため**要確認**。

## External services / environment

コードで参照される主な設定は `STRIPE_*`、`UPSTASH_REDIS_*`/`KV_REST_*`、`METAL_PRINT_*`、`CRON_SECRET`、`RESEND_API_KEY`、`NEXT_PUBLIC_SITE_URL`、LLM provider keys、PostHog、VAPID。`.env.example` は一部のキーだけを列挙するため完全な設定台帳ではない。値を文書化・出力しない。

## Deployment / testing

Vercelが想定runtime。`next.config.js` はcatalog JSON tracing、画像remote pattern、`/exhibition`→`/works` redirectを定義し、build時のESLintを無視する。基本検証は `npm run typecheck`, `npm run lint`, `npm run build`。Metal PrintやChatの専用validatorは `package.json` を参照し、外部providerや支払いを伴うものはHuman Gate後に限定実行する。

## 危険領域

- `src/pages/api/chat-reco.ts`: 既存契約。置換せずv2/v3を並行追加する。
- `src/app/chat/chat.tsx`, `src/app/exhibition/exhibition.tsx`, `src/app/globals.css`: 大きい/共有surface。段階的変更に限定。
- `public/works/works.json`: 一次マスタ。全文置換不可。
- `src/lib/metal-print-redis.server.ts`, `src/app/api/metal-print/*`, `src/lib/digital-order.server.ts`: 金銭、在庫、PII、provider状態。Astraレビューと実環境の明示承認が必要。
- `ops/*approval*`, `ops/*evidence*`, `ops/ai-execution-os/human-gates/`: 事実・承認記録。生成物やローカルPASSを根拠に改変・昇格しない。
