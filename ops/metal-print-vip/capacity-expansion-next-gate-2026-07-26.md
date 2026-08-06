# Capacity expansion next Gate — 2026-07-26

## Current verified state

- Approved sellable capacity: 3 units / JPY 990,000 maximum gross.
- Target minimum: 10 paid units / JPY 3,000,000.
- Planned capacity after three additional Editions: 12 units / JPY 3,960,000.
- IGNITION、HOME、BALIANの原本は2026-07-23に3000×3000、RGB、alphaなし、SHA-256固定まで確認済み。
- 現在はPortableSSDが未接続で、WhiteWall用TIFF候補だけが未生成。

## Only owner action currently required

`/Volumes/PortableSSD` としてPortableSSDをMacへ接続する。ファイル移動、コピー、WhiteWall注文、支払いは不要。

接続後は自動実行側が次を行う。

1. 3原本の現在hashを2026-07-23のlockと照合。
2. 全3原本が一致した場合だけ、3000×3000 RGB・alphaなし・LZW TIFF候補を一括生成。
3. 各TIFFのhash・寸法・色空間をmanifestへ固定。
4. Offer承認可能性を再監査し、作品別Human approval tokenを提示。

## Safety boundary

このGateでは外部注文、支払い、Stripe変更、Offer公開を行わない。hash不一致または原本欠落時は一切のTIFFを作らず停止する。
