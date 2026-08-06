# Explicit Qualification Form — Production Evidence

日時: 2026-07-23 JST
判定: `PROVEN_LIVE / ZERO_QUALIFIED_YET`

## 解消した欠陥

旧フォームは予算未定・探索中・情報収集中が初期選択され、顧客が項目を読まずに送ると高意向でもnurtureへ誤分類され得た。

## 現行契約

- Email、設置空間、一点の予算、迎えたい時期、購入の決定者、連絡同意を必須化。
- 4つのselectは空のdisabled placeholderから開始。
- 全項目の明示回答と同意が揃うまで送信ボタンを無効化。
- qualified条件自体は33万円以上、90日以内、本人決裁、設置空間ありを維持。
- PIIをanalyticsへ送らず、サーバー側のdurable consultation recordだけで判定。

## Evidence

- production: `dpl_GoBh3AteYQNVoe8mEtTvF3YBYCVF`、`READY`、独自ドメインalias済み。
- 公開Chat: HTML 3,915 bytes、8 script bundles、合計519,037 bytesを確認。
- 公開bundleに4件の「選択してください」、設置空間、予算、時期、決定者、Checkout Gate、Stripe正式Offer文言を確認。
- typecheck、consultation、attribution、production adapter: PASS。
- local/Vercel build: PASS、1041 pages。
- 実相談・個人情報・決済は送信していない。

これはqualified evidenceの入力品質を証明するが、需要やqualified件数を証明しない。現在は0/100。
