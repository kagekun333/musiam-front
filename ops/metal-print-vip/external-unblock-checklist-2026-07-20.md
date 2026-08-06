# Metal Print ¥3M — External Unblock Checklist

状態: `PROVIDER_CONNECTED / WHITEWALL_LOGIN_AND_REAL_SALES_EVIDENCE_PENDING`

## 1. Vercel authentication — COMPLETE

- Vercel ProductionへStripe、Webhook、Upstash、identity、site URLを暗号化設定済み。
- live Stripe API、enabled webhook endpoint、Upstash canary round tripを確認済み。

## 2. Stripe provider E2E — PARTIAL

- Live endpointは`checkout.session.completed`、`checkout.session.expired`、`charge.refunded`を購読済み。
- 次のagent action: proof ACCEPT後に1 OfferをHuman承認で解除し、実Checkout・署名event・Redis遷移を確認する。

## 3. Candidate master source — COMPLETE

- 4作品の寸法、色空間、alpha、SHA-256をzero-copy preflight済み。
- Deus sive NaturaのTIFF入稿masterを作成・hash固定済み。2026-07-23の実画面ではWhiteWall未ログイン・表示カート0点だったため、旧upload/motif/cartは履歴扱い。ログイン後に機械検証済み`proof-order-packet.json`から再uploadする。

## 4. Vendor evidence — COMPLETE FOR SELF-SERVICE LAUNCH

- 比較可能quote 2社とWhiteWallのJP/US/EU実カート価格を取得済み。
- 個別契約を販売開始条件とせず、受注後に一品発注するPOD方式を採用。

## 5. WhiteWall physical proof — CURRENT HUMAN GATE

- WhiteWallカート画面をhandoff済み。現在は未ログインで表示カート0点。オーナーがログインして「WhiteWallログインした」と返す。
- 次のagent action: verified TIFFを再uploadし、60cm角構成と住所反映後の最終総額を確認し、支払確定直前で停止する。

## 6. Human decisions that cannot be delegated

- 有料physical proofの発注確定。
- 到着proofのHuman scorecardとACCEPT/REVISE/REJECT。
- fulfillment ownerの氏名または運用主体の確定。
- production Offer lock解除とlive販売開始の最終承認。

## Automatic resume sequence

1. Upstash接続とsecret存在監査
2. Stripe sandbox E2E（予約、署名webhook、再送、期限切れ、部分/全額返金）
3. fresh pipeline/revenue snapshot
4. candidate master preflight
5. vendor quote比較と完全原価計算
6. physical proof Human Gate
7. assurance再監査

戦略、build、validator、ローカルadapterの完成を外部証拠の代用にしない。
