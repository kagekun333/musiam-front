# ABI伯爵 Launch Wave 01 — 公開承認パケット

Status: `APPROVED / DAY_03_PUBLISHED_10_OF_22 / ABI-LW01-04_TIKTOK_CONTENT_REVIEW_PENDING`

Machine state: `10 PUBLISHED / 12 APPROVED_WAITING_SCHEDULE / 0 MEDIA_REVIEW_PENDING / 0 HUMAN_APPROVAL_REQUIRED`（うちTikTok 1件はplatform `CONTENT_REVIEW_PENDING`）

承認受領: 2026-07-25
Day 1公開確認: 2026-07-25 23:43 JST
Day 2公開確認: 2026-07-26 07:31 JST
Day 3公開確認: 2026-07-31 19:32 JST（Instagram / YouTubeは公開確認、TikTokはURL生成・AIラベル確認済み、platform審査中）

## 承認対象

- Campaign: `abi_hakusyaku_launch_wave_01`
- 期間: 承認後7日間
- 投稿: 9本
- Native placement: 22件
- Instagram: 9件
- Threads: 5件
- TikTok: 4件
- YouTube Shorts: 4件
- X: 対象外（凍結解除待ち）
- 広告費: 0円
- DM営業: 実施しない
- 直接販売投稿: 0件
- 主導線: プロフィールと投稿から伯爵Chat

コピー、素材、alt text、UTMの正本は
`ops/audience-engine/abi-hakusyaku-launch-wave-01-native.json`とする。

## 7日間の公開順

| Day | 投稿 | 主題 | 配信先 |
|---|---|---|---|
| 1 | ABI-LW01-01 | ABI伯爵 開館宣言 | Instagram / Threads |
| 1 | ABI-LW01-02 | 音から像へ・33 IGNITION | Instagram / TikTok / YouTube |
| 2 | ABI-LW01-03 | 伯爵の一問 | Instagram / Threads |
| 3 | ABI-LW01-04 | Almost Home・帰属感 | Instagram / TikTok / YouTube |
| 4 | ABI-LW01-05 | BALIAN・静けさの芯 | Instagram / Threads |
| 4 | ABI-LW01-06 | Deus sive Natura・哲学 | Instagram / TikTok / YouTube |
| 5 | ABI-LW01-07 | 人生の再始動 | Instagram / Threads |
| 6 | ABI-LW01-08 | AIと人間の選択工程 | Instagram / TikTok / YouTube |
| 7 | ABI-LW01-09 | 伯爵Chatへの招待 | Instagram / Threads |

公開時刻は初期仮説として、日本時間 `12:15` または `20:30` を使用する。同日に2投稿する日は12:15と20:30へ分ける。最初の72時間データ取得後、媒体別の時刻を実測値で変更する。

## 一括承認用トークン

以下22行すべてをそのまま返信した場合、このWaveの22 placementだけを公開承認したものとして扱う。

```text
APPROVE_EXTERNAL_POST:ABI-LW01-01:instagram
APPROVE_EXTERNAL_POST:ABI-LW01-01:threads
APPROVE_EXTERNAL_POST:ABI-LW01-02:instagram
APPROVE_EXTERNAL_POST:ABI-LW01-02:tiktok
APPROVE_EXTERNAL_POST:ABI-LW01-02:youtube
APPROVE_EXTERNAL_POST:ABI-LW01-03:instagram
APPROVE_EXTERNAL_POST:ABI-LW01-03:threads
APPROVE_EXTERNAL_POST:ABI-LW01-04:instagram
APPROVE_EXTERNAL_POST:ABI-LW01-04:tiktok
APPROVE_EXTERNAL_POST:ABI-LW01-04:youtube
APPROVE_EXTERNAL_POST:ABI-LW01-05:instagram
APPROVE_EXTERNAL_POST:ABI-LW01-05:threads
APPROVE_EXTERNAL_POST:ABI-LW01-06:instagram
APPROVE_EXTERNAL_POST:ABI-LW01-06:tiktok
APPROVE_EXTERNAL_POST:ABI-LW01-06:youtube
APPROVE_EXTERNAL_POST:ABI-LW01-07:instagram
APPROVE_EXTERNAL_POST:ABI-LW01-07:threads
APPROVE_EXTERNAL_POST:ABI-LW01-08:instagram
APPROVE_EXTERNAL_POST:ABI-LW01-08:tiktok
APPROVE_EXTERNAL_POST:ABI-LW01-08:youtube
APPROVE_EXTERNAL_POST:ABI-LW01-09:instagram
APPROVE_EXTERNAL_POST:ABI-LW01-09:threads
```

## 承認に含まれない操作

- 有料広告の出稿
- 不特定多数へのDM送信
- フォロー／いいねの自動連打
- 製造会社への有料発注
- Stripeの返金・本番設定変更
- 本人確認、二段階認証、規約同意
- Xへの投稿
- このManifestに存在しない投稿

## 公開後の自動処理

1. placementごとの公開URLと時刻をledgerへ記録する。
2. 24時間後と72時間後にAudience KPIを記録する。
3. 伯爵Chat session、first message、consultationをUTM別に確認する。
4. 保存・共有・Chat到達の上位投稿をGrowth Wave 02へ展開する。
5. 再生数やvalidator PASSを売上として数えない。売上は非返金Stripe決済だけで更新する。

未公開12 placementは、承認済みだが公開日を待つ`APPROVED_WAITING_SCHEDULE`として台帳管理する。承認トークンを再要求しない。各Wave Dayの期限を迎えたplacementだけ公開対象にし、未来日の投稿をまとめて早出ししない。

## 停止条件

- プラットフォームが本人確認またはCAPTCHAを要求した場合
- 公開前画面で想定外の課金、権利警告、規約同意が表示された場合
- 使用素材、表示文、リンクがManifestと一致しない場合
- アカウント制限または投稿拒否が発生した場合
