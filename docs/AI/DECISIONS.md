# 伯爵MUSIAM — Decision Log

最終監査: 2026-09-20。各項目の状態は根拠の強さであり、本番有効性の保証ではない。

## 一次カタログを保持し、SSD補完をsidecarに分離する

**根拠**: `public/works/works.json` は手調整済みの主データであり、`mergeWorksCatalog()` は主データのID・リンク・coverを優先する。プロジェクト指示も全文置換ではなくID保持mergeを要求する。

**なぜ重要か**: SSD再読込や補完が、販売リンク・ムード・既存IDを壊すことを防ぐ。

**状態**: 確認済み

## タイトル一致を同一作品の根拠にしない

**根拠**: `src/lib/mergeWorksCatalog.ts` はtitle/ISRCだけの重複統合を拒み、完全なrelease UUIDだけで旧exportの重複を統合する。

**なぜ重要か**: 異なるリリースを誤って統合し、紹介・販売・証拠の対応を壊さないため。

**状態**: 確認済み

## LLM provider呼出しをrouterへ集約する

**根拠**: `src/lib/llm-router.ts` が用途別provider chain、timeout、失敗表現を保持し、プロジェクト指示も直接fetchを禁じる。

**なぜ重要か**: コスト、fallback、失敗時のUI振る舞いを各featureで分岐させない。

**状態**: 確認済み

## Chatの旧routeは互換性のため残す

**根拠**: `chat-reco.ts` は既存契約として保護され、`chat-reco-v2.ts` と `chat-experience-v3.ts` が並存する。旧routeを残した経緯・移行完了基準は今回未調査。

**なぜ重要か**: UIまたは外部参照の契約を破壊せず、canary/rollbackできる。

**状態**: 確認済み（保持理由の詳細は要確認）

## Metal Printは「相談・承認・決済・受注生産」を分離する

**根拠**: checkoutは資格済み相談、複数の明示同意、承認済みofferを要求する。Redis予約、Stripe署名Webhook、vendor queueが別途ある。

**なぜ重要か**: 在庫二重予約、未承認offer、同意のない購入、未確認決済からの発注を防ぐ。

**状態**: 確認済み

## 発送先は支払者情報で補完しない

**根拠**: `METAL_PRINT_SHIPPING_POLICY` はCheckoutでshipping address/phoneを収集し、orderごとの再見積もりを要求する。既存運用メモも明示配送先のみを許す。

**なぜ重要か**: giftを含む誤配送と、地域別原価の誤認を防ぐ。

**状態**: 確認済み

## offer承認は二系統を単一resolverに通す

**根拠**: `src/lib/metal-print-offers.server.ts` はper-edition registryとcatalog-scope approvalを明示的に解決し、承認文書のscopeから許可集合を導出する。

**なぜ重要か**: Edition IDの文字列規則だけを販売承認の根拠にしない。

**状態**: 確認済み

## デジタル販売は配布物・Stripe設定・明示releaseを別gateにする

**根拠**: `digitalReleaseReady()` はrelease approval、Stripe、Redisを要求し、release一覧の `approvedAt` は未設定である。

**なぜ重要か**: 商品ファイル・Payment Link・UIが存在するだけで販売や納品を開始しない。

**状態**: 確認済み

## 運用台帳のHOLDはコード実装で解除しない

**根拠**: `assurance-audit-current.json` は物理proof、実測economics、pipeline、production E2E等をrequired gateにしている。

**なぜ重要か**: local validator、候補素材、シミュレーションを実需・実売・履行の証拠に昇格させない。

**状態**: 確認済み

## Vercel buildの成功だけではlint成功にならない

**根拠**: `next.config.js` に `eslint.ignoreDuringBuilds: true` がある。

**なぜ重要か**: CI/buildの緑を静的品質の証明と誤解しないため。

**状態**: 確認済み

## 大規模な既存dirty treeを統合・整理しない

**根拠**: 2026-09-20のGit確認で、追跡済み102ファイルの変更と多数の未追跡のsource、ops記録、素材、docsが同居している。`git diff --stat` は15,505追加／11,822削除を示すが、本文の意図・所有者・検証状態はこの監査では確認していない。

**なぜ重要か**: 無関係な作業をstage、reset、format、削除、または一括commitして、販売・運用・素材の履歴を失うことを防ぐ。以後の変更は対象パスを限定し、書込み直前にも状態を再確認する。

**状態**: 確認済み
