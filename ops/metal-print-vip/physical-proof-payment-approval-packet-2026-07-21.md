# Physical Proof Payment Approval Packet — 2026-07-21

## Approval requested only after source preflight passes

- Work: `Deus sive Natura`
- Product: WhiteWall ChromaLuxe HD Metal Print
- Size: 600 × 600mm
- Finish: glossy white-base
- Mount: aluminium rails included
- Quantity: 1
- Historical cart evidence: JPY 31,500 before unresolved address-level tax; live recheck on 2026-07-23 showed 0 visible items and requires a fresh quote
- Hard payment ceiling: JPY 40,000 landed
- Purpose: production-equivalent physical proof, not inventory and not resale
- Current state: the exact `Deus sive Natura` TIFF remains locally verified; WhiteWall is unauthenticated and the cart must be rebuilt after login from `proof-order-packet.json`
- Evidence: `whitewall-proof-cart-evidence-2026-07-21.md`

## Why full size

10インチ校正では色味を確認できても、33万円商品の壁面存在感、60cm角の解像感、反り、レール、梱包、配送損傷、collector valueを判定できない。初回から販売予定寸法と同じ60cm角を1点だけ注文する。

## Automatic sequence after SSD mount

1. `npm run preflight:metal-print-proof`
2. `Deus sive Natura` sourceの寸法、RGB、alpha、bytes、SHA-256を保存
3. 原画を変更せず入稿candidateを作成し、Web previewとの取り違えをhashで防止
4. WhiteWall configuratorへcandidateをupload
5. 1:1 crop、SuperResolution、色補正previewを確認
6. 60cm角、glossy、rail、数量1、最終金額を注文票へ固定
7. 決済直前で停止し、金額と構成だけを館主へ提示

## Human actions

1. PortableSSDをMacへ接続する。
2. 決済直前に、JPY 40,000以内の一回限りのproof支払いを承認する。
3. 到着後、写真を撮り8項目を各10点で採点する。

住所、カード情報、パスワード、秘密値は証拠ファイルへ記録しない。
