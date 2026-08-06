# POD Fulfillment Decision — 2026-07-21

## Decision

伯爵MUSIAMのメタルプリントは、印刷会社との個別契約締結を販売開始条件にしない。顧客の注文と入金後、POD事業者へ1点発注し、顧客住所へホワイトラベル直送する。

## Routing

1. Primary: Prodigi
   - 無料登録、MOQなし、手動発注とPrint APIの両方を利用可能。
   - Sandboxで無課金テストが可能。
   - Quote APIで発注せずにSKU・配送先別の製造費と送料を取得可能。
   - DibondとChromaLuxeを扱い、白ラベルで顧客直送可能。
2. Regional backup: Gelato
   - 無料利用、MOQなし、API対応、32か国の生産網。
   - アルミニウムDibondを30超のサイズで提供。
3. US backup: Printful
   - MOQなし、白ラベル、自動連携は優秀。
   - ただし現行のメタルプリント配送は米国限定なので世界向け主力にはしない。

## Order policy

- 顧客のStripe支払いが`paid`になった後だけPOD注文を作る。
- 初期運用は自動送信せず、Prodigiのpause windowまたはmanual releaseを使う。
- 住所、画像、SKU、金額を検査後にreleaseする。
- 安定後にAPI自動発注へ移行する。
- 仕入原価・送料・税・配送予定日は注文前Quote APIの結果を正とする。
- POD利用規約への同意は必要だが、個別の提携契約書や営業担当の返信は不要。

## Remaining evidence gates

- ProdigiアカウントとSandbox API key。
- 同一仕様についてJP・US・EUのQuote API結果。
- GelatoまたはPrintfulの同等サイズによる比較価格。
- 1点の有料校正とHuman ACCEPT。
- POD注文callbackを受けるfulfillment ledger。

ここで求める「2社比較」は契約獲得ではなく、発注時に選択を誤らないためのライブ原価比較である。
