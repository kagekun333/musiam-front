# Physical Proof Order Specification

状態: `SOURCE_CART_AND_DIGITAL_PREFLIGHT_VERIFIED / PAYMENT_FORBIDDEN_BY_OWNER / COMPLIMENTARY_PROOF_REQUEST_PENDING`

## Objective

4作品のうち1作品を、採用候補vendorの正方形metal printとして1点だけproof発注し、色、黒、階調、解像感、表面、取付、梱包、配送損傷をHuman Reviewする。

## First proof recommendation

`Deus sive Natura`

理由:

- 暗部と光部があり、metal printの黒・階調・反射を一枚で評価しやすい。
- luxury residence / wellnessの主力仮説に対応する。
- 3000×3000候補masterの記録がある。60cm角では127ppi相当のため、原画を保全したままWhiteWall SuperResolutionを使用し、previewと100%表示を確認する。
- 2026-07-24の画素監査では、WhiteWall公称300dpi出力まで線形2.362倍の補間が必要。輝度5以下の画素が12.3551%あり、暗部階調は最大の物理確認項目。

代替: `33 IGNITION`。彩度、エッジ、発光感の評価を優先する場合はこちらを使う。

## Requested physical specification

- Vendor: WhiteWall Japan self-service
- Quantity: 1
- Size: 60 × 60cm（販売予定商品と同寸法）
- Print process: ChromaLuxe HD Metal Print / thermal sublimation / 1mm aluminum
- Surface: glossy white-base standard
- Mounting: aluminium rails included
- Border/frame: borderなし、frameなし
- Image options: SuperResolution ON。自動optimizationとultraHDはpreview確認後に採否を固定
- Shipping destination: Japan
- File: mounted sourceから取得するcandidate master。Web previewは禁止
- Color: vendor指定ICCまたはsRGB。勝手にCMYK変換しない
- Crop: 1:1、重要要素を切らない、bleed要件をvendor書面で確認

## Captured platform quote

- Product: JPY 26,400
- Standard Japan shipping: JPY 5,100
- Cart total: JPY 31,500, VAT not included
- Approval ceiling: JPY 40,000 landed. Address-level checkoutがこの上限を超えた場合は支払わず再見積する。
- Lead time: approximately 12 working days
- Damage workflow: 配送損傷を撮影し、customer serviceへ提出。再製作または補償の審査対象。

## Confirm at checkout before payment

- 60 × 60cm、glossy、aluminium rails、frameなし、数量1
- crop previewが1:1で重要要素を切っていない
- 警告表示とSuperResolution結果
- 住所入力後の税・送料込み最終額がJPY 40,000以内
- 約12営業日の納期表示
- proofと販売注文に同じ商品configurationを再利用できること

## Human proof scorecard

各10点、合計80点。64点未満、または必須失敗1件でREVISE/REJECT。

1. Color fidelity
2. Deep-black detail
3. Highlight control
4. Edge sharpness
5. Surface consistency
6. Physical finish and mounting
7. Packaging and damage protection
8. Overall collector value at planned price

必須失敗:

- 明らかな色転び・banding・潰れ
- 反り、傷、剥離、角損傷
- Edition品質として説明できない取付・梱包
- proofと本番で工程が変わる

Human ACCEPTなしにphysical proof GateをPASS扱いしない。

現在、NATURAの正式Offerは「実物proof未承認」を購入前に明示する条件で開いている。これはproof PASSを意味しない。初回顧客注文またはvendor無償proofを受領したら、同じ仕様でHuman Reviewし、結果がREVISE/REJECTなら以後の新規販売と発注を停止する。

## Evidence recording

承認証拠の正本は `proof-evidence-ledger.json` とする。最低限、candidate masterのSHA-256、vendor/quote/order参照、proofと量産の同一工程確認、受領時写真3点以上、8軸採点、hard fail、Human reviewerとreview日時を残す。画像生成結果、画面preview、vendor mockup、AI self-reviewはphysical proofとして数えない。

デジタルpreflightの正本は `artwork-preflight-evidence.json`。これは入稿事故リスクの監査であり、`proofsApproved` を増やさない。

受領後は`proof-review-template.json`を複製して写真3点以上のpath・SHA-256・bytes、8軸score、hard fail、Human decisionを記録する。`ACCEPT`の場合のみ、オーナーが次のtokenを明示する。

```text
APPROVE_PHYSICAL_PROOF:<proof_id>:ACCEPT
```

その後に限り、以下で写真を再hashし、`proof-evidence-ledger.json`と`assurance.json`を同期更新する。

```bash
node --import tsx scripts/register-metal-print-proof.ts \
  --review /absolute/path/to/completed-proof-review.json \
  --human-approval-token APPROVE_PHYSICAL_PROOF:<proof_id>:ACCEPT
```

このtokenなしでは、点数が64点以上でもproof GateをPASSへ昇格しない。
