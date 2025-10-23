# 伯爵MUSIAM｜P0実行フロー（確定版）

> 最低限の完成（Phase 0）を定義する司令書。  
> この内容は、Pull Requestレビュー・自動テスト・CI判定の基準（DoD）として扱う。

---

## 0) TL;DR

- **このページ＝司令室**：意思決定→差分設計→実装の順で進行。
- **今やることは4つ**：①SEO/OGP（4頁）②Oracle完成③NFT発行LP（MVP）④計測＆健全性＆最小自動化。
- **公開JSON不要／ENVはローカルのまま／SUNOは後回し。**

---

## 1) 実行フロー（順番）

### STEP 1｜SEO/OGP（まず4ページだけ）

- 対象：`/`, `/oracle/omikuji`, `/exhibition`, `/about`
- 施策：title/desc/OGP統一、JSON-LD、`sitemap.xml` / `robots.txt`
- **DoD**：Search Consoleで4URLが“登録済み”。

### STEP 2｜Oracle体験の完成

- 新規：`/oracle/[id]` 永続URL（共有ボタン・OGP）
- 制約：同日再抽選不可／Berlin 00:00でリセット
- **DoD**：直URLで表示OK・共有UI表示・日次制限動作・a11y簡易OK。

### STEP 3｜NFT発行LP（MVP）

- ルート：`/lp/star-pass-001`（ヒーロー→価値→FAQ→Mint）
- 決済：Wallet接続＝本番OK／クレカ＝staging疎通のみ
- 計測：`view` / `cta_click` / `mint_start` / `mint_success`
- **DoD**：Mint成功時Tx記録・失敗時ガイド・LCP<2.5s / CLS<0.05。

### STEP 4｜計測・健全性・最小自動化

- 可視化：Vercel Analytics
- 健全性：Rate Limit（高刺激 3/日）＋クールダウン表示
- 信頼性：最小E2E（おみくじ→結果URL→共有）、Lighthouse自動レポ
- **DoD**：PRで `lint / typecheck / build / E2E / Lighthouse` 全緑。

---

## 2) いま“やらない”こと

- 公開JSONの新設／データ移設（現行維持）
- i18n `/ja` `/en` ルーティング（Phase-2）
- GA4・SUNO常時配信ポータル・会員/Bundle（Phase-2以降）

---

## 3) 新規・編集ファイル一覧

**新規**
- `src/app/oracle/[id]/page.tsx`
- `src/app/lp/star-pass-001/page.tsx`
- `app/sitemap.ts`, `app/robots.ts`
- 最小E2Eテスト・CI設定・RateLimitミドルウェア

**編集**
- `src/app/layout.tsx`（metadata統一）
- `src/app/page.tsx`（1スクロール完結＋3CV）
- `src/app/oracle/omikuji/*`（a11y・日次制限）
- `public/works/works.json`（v1整形／壊さない）

---

## 4) ルール（固定）

- **司令室＝このページ**（意思決定と進行のみ）
- **自動化は提案モードから開始（自動コミット禁止）**
- **ENVはローカルのみ使用**
- **SUNOは後回し**

---

## 5) 最終DoDチェックリスト

| 項目 | 判定 |
|------|------|
| SEO/OGP | 4URL登録済み |
| Oracle | `/oracle/[id]`直叩きOK・共有UI・日次制限・a11y |
| NFT LP | Mint動線完了・LCP/CLS基準 |
| 信頼性 | `lint/type/build/E2E/Lighthouse` 全緑＋RateLimit 3/日 |

---

> **Phase 0 = “動いている” + “測れる”**
