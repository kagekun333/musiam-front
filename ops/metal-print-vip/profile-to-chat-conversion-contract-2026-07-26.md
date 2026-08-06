# Profile-to-Chat conversion contract — 2026-07-26

## Decision

ABI伯爵のSNSプロフィールは、メタルプリントだけを宣伝する入口にはしない。音楽・本・映像・思想で獲得した人を一般の伯爵Chatへ送り、会話で `vip-metal-print` 適合が検出された時点から販売ファネルへ移す。

## Verified gap

プロフィールURLは媒体別UTM付きの一般 `/chat` であり、これはフォロワー獲得戦略と一致する。一方、従来はURLに `intent=metal-print` がない訪問者について、会話が `vip-metal-print` を処方しても `metal_chat_start`、`metal_salon_open`、`metal_first_message` が記録されなかった。

## Implemented contract

- 直接の `/chat?intent=metal-print` は従来どおり入口と初回発言を記録する。
- 一般 `/chat` は、回答が `productId=vip-metal-print` を返した瞬間に一度だけメタルファネルへ昇格する。
- 昇格時に入口・Salon open・初回発言を同一匿名セッションへ遡及記録する。
- URLへ `intent=metal-print` を追加し、以後のUI、作品選択、相談フォームをメタル相談状態へ統一する。
- 媒体別 `utm_source`、`utm_medium`、`utm_campaign`、`utm_content` は維持する。

## Claim boundary

これは計測・転換契約の実装証拠であり、実訪問、実相談、購入意向、売上の証拠ではない。実績値は本番ファネルの非verificationセッションだけで判定する。
