# 伯爵MUSIAM — Project State

最終監査: 2026-09-20（静的リポジトリ監査）。ここでいう「確認済み」は、指定パスのコードまたは台帳から確認した事実であり、本番の現在稼働・売上・人間評価を意味しない。

## プロジェクト概要

**確認済み事実**: 伯爵MUSIAMは、音楽・書籍・作品展示・占い・伯爵Chat・デジタル商品・受注生産のMetal Printを扱う Next.js サイトである。作品の中心マスタは `public/works/works.json`、SSD由来の補完は `public/works/works-ssd.json` である。`ops/` は販売・公開・証拠・運用の台帳を置く。

**根拠のある推測**: 収益化の実装面はMetal Printとデジタル商品を優先して整備されている。

## 現在の稼働状態

### 完成・実装済み

- App Router と Pages Router API が共存する Next.js 15 アプリ。代表的な公開面は `/`, `/works`, `/shop`, `/chat`, `/oracle`, `/vip-metal-print`。ルート一覧は `src/app/` と `src/pages/api/`。
- 作品カタログは `loadMergedWorksServer()` が一次マスタ、import、SSD、継続リリース、drone データを合成する（`src/lib/loadMergedWorksServer.ts`）。同名では同一視せず、ID または完全な release UUID に限定してマージする（`src/lib/mergeWorksCatalog.ts`）。
- Chat のLLM呼出しは `src/lib/llm-router.ts` に集約され、OpenRouter / Anthropic / Groq / LM Studio を用途別にフォールバックする。失敗時は `{ ok: false }` を返す設計。
- Metal Print は相談資格・承認済みoffer・在庫予約・Stripe Checkout・署名Webhook・Redisの状態遷移を実装している。主要入口は `src/app/api/metal-print/checkout/route.ts` と `webhook/route.ts`。
- デジタル商品のCheckout、購入状態、ダウンロードURL取得は `src/app/api/shop/*` と `src/lib/digital-order.server.ts` にある。Stripe/Redis/配布承認の全条件が満たされない場合は販売を拒否する。

### 作業中・HOLD

- `ops/metal-print-vip/assurance-audit-current.json` は `decision: "HOLD"`。実績のある unit economics、100 qualified prospects、¥33M pipeline、50 dossier、25 purchase intent、物理proof、production sales E2E が未充足である。
- デジタル配布リリースは全商品の `approvedAt: null`、sandbox検証も `null`（`src/lib/digital-delivery-releases.server.ts`）。Checkout実装の存在は販売開始の証明ではない。
- 継続運用台帳では SSD は `NOT_MOUNTED`、human review は `PENDING`、直接販売承認済み商品は `0`（`ops/continuous-operation/state.json`）。

### 既知の問題・リスク

- **P1 / 収益・運用**: 既存台帳の実測収益は `BLOCKED`、Stripe実収益は0（`ops/revenue-first/revenue-status-2026-09-06.json`）。この記録は2026-09-06時点であり、現在のStripe管理画面を再確認するまで更新済みとは扱わない。
- **P1 / 実装の確認不足**: 現在のブランチ名は `codex/fix/stripe-metal-print-webhook-20260914`。直近コミットはMetal Print拡張、funnel集計、外部リンク検証に関するものだが、この監査ではテスト・ビルド・デプロイは実行していない。
- **P0 / 大規模dirty tree**: Git確認時点で追跡済み変更は102ファイル、`15,505 insertions / 11,822 deletions`。加えて、`docs/`、`ops/`、`scripts/`、`src/`、`public/works/`、`outputs/` 等に多数の未追跡ファイル/ディレクトリがある。変更本文は意図的に未読のため、各変更の所有者・目的・正しさは**不明**。今回作成した `docs/AI/` も未追跡群の一部である。
- **設計上の注意**: `next.config.js` はビルド時 ESLint を無視するため、`npm run lint` は別途実行しなければならない。

## 最近作業された領域

**確認済み事実**: 直近5コミットは `117379b fix: block YouTube posts until external links are verified`、`22e515b ops: register We Are the Earth Threads publication`、`bd31ee0 ops: register Mama Afrika Threads publication`、`aa9c540 fix: aggregate music-to-metal funnel events`、`472b004 feat: sell all music jackets as metal prints`。未commit変更の本文は未確認。

## 主要な外部依存

- Stripe: digital checkout と Metal Print checkout/webhook。
- Upstash Redis: order、相談、在庫予約、funnel等の永続状態。
- LLM providers: OpenRouter、Anthropic、Groq、LM Studio（有効化状況は環境変数依存）。
- Resend、PostHog、Web Push、Vercel Cron。Cloudflare R2、Spotify等もコード/スクリプトから参照されるが、実接続状況は不明。

## Git / working tree

- branch: `codex/fix/stripe-metal-print-webhook-20260914`（`.git/HEAD`より確認）
- working tree: dirty。追跡済み102ファイルが変更、未追跡成果物も多数。`git diff --stat` は上記の15,505追加／11,822削除を示す（untrackedはこの統計に含まれない）。
- commit history: 上記の直近5件を `git log -5 --oneline` で確認。
