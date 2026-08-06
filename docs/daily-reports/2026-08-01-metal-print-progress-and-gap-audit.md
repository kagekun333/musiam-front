# 伯爵MUSIAM メタルプリント進捗・自動運転監査

監査時刻: 2026-08-01 00:36 JST

## 結論

Goal controller は `KEEP_EXECUTING`、売上保証監査は `HOLD`。販売可能Offer容量と営業Chatは稼働可能だが、実測pipelineと実売上がまだ存在しない。

## 現在の実測値

- Human承認済みOffer: 4作品、12点、最大売上3,960,000円
- Launch Wave: 10/22 placement公開、12件予約待ち
- First-party funnel: Home 12、Dossier 4、Chat start 3、First message 2、Edition selected 0、Consultation 0
- Qualified: 0/100
- Dossier accepted: 0/50
- Purchase intent: 0/25
- 非返金売上: 0/3,000,000円
- Human承認済みphysical proof: 0/1
- 実注文bundle / proof接続bundle: 0/0

## 自動運転

### 1. musiam-300

- 状態: ACTIVE
- 実行: 毎日12:15 JST
- 役割: 9 lane監査、期限到来済み承認投稿、Redis funnel/pipeline/revenue更新、Offer容量、proof、採算、売上の再判定
- 次回予定: 2026-08-01 12:15 JST
- 次の公開対象: ABI-LW01-05 Instagram / Threads

### 2. abi-launch-wave-24h-72h-kpi

- 状態: ACTIVE
- 実行: 毎日07:50 / 15:50 / 23:50 JST
- 役割: `duePlacementIds`だけ24h/72h KPI回収。読めない値は空欄を維持し、0を推測しない
- 現在: due24h=0、due72h=0、resolved24h=7、resolved72h=7
- 次の成熟: 2026-08-01 19:32:14 JST。その後の19:50回で対象化

### 3. abi-launch-wave

- 状態: ACTIVE
- 実行: 毎日20:30 JST
- 役割: 夜枠の承認済みABI-LW01-06だけ公開
- 次回対象: 2026-08-01 20:30 JST、Instagram / TikTok / YouTube
- Media preflight: 3件ともvideo+audio PASS

### 4. Vercel Cron

- 状態: production設定あり
- 実行: 毎日00:00 UTC = 09:00 JST
- Route: `/api/cron/metal-print-ops`
- 認証: `CRON_SECRET` Bearer必須
- 役割: Redis実測を集計し、日次health保存と警告通知を行う。投稿自体は行わない

## 優先改善バックログ

### P0 — 今すぐ売上導線へ効く

1. Instagram / TikTokプロフィールから一般伯爵Chatへの直リンクを公開確認し、coverageを2/4から4/4へする。
2. ABI-LW01-05〜09をscheduleどおり公開し、22/22へ進める。前倒し・重複投稿は禁止。
3. Exact UTM attributionが0/10の原因を、プロフィールURL・投稿導線・Chat着地の順に特定する。未帰属を投稿へ推測配分しない。
4. Edition selectedが0、Consultationが0なので、Dossier→Chatの実訪問100件を獲得するまでLandingの大改修をせず、入口流量を増やす。
5. Assuranceの`provider_config`証拠を再取得し、Stripe本番モード・API endpoint・Upstash接続の7日以内証拠を更新する。秘密値は記録しない。

### P1 — 成約と33万円の信頼性

6. 最初の実顧客が選んだ1作品で、作品別Dossier承諾、購入意向、proof未承認の開示、受注生産取消条件の4同意を取得する。
7. 最初の顧客入金後にWhiteWallへ発注するか、オーナーが有料proofを別途承認し、実物写真・色・表面・傷・取付・梱包をHuman reviewする。
8. 署名、Edition番号、COA、一意証明番号、販売台帳を実物proofと同じ作品IDへ接続する。NFTは必須にしない。
9. 初回履行後、WhiteWall請求書、Stripe精算手数料、送料、再製作有無を登録し、見積採算から実測採算へ移行する。

### P2 — 月商300万円の再現性

10. 1 placementあたり100 Dossier / 3 qualifiedを満たした後だけ勝ち導線へ配分を寄せる。
11. 40〜100 qualified、50 Dossier accepted、25 purchase intentの順にpipelineを構築し、10件成約へ接続する。
12. 初回10件のCAC、成約率、キャンセル、交換率、地域別粗利を観測して、自動配分ルールを実績値へ更新する。

## Human Gate

- Instagram / TikTokプロフィール編集とログイン時の本人確認
- 新しい規約同意
- proofの有料発注
- vendor支払い
- 返金
- 広告課金
- Offer承認・変更

## 次回監査の合格条件

- 12:15投稿対象が公開済みまたは安全な理由付きHOLD
- 19:50に成熟した3 placementだけKPI更新
- 20:30対象がmedia preflight PASSのまま公開済みまたは安全な理由付きHOLD
- Profile Chat coverageが少なくとも現状より悪化していない
- Qualified / Dossier accepted / Purchase intent / Revenueを実測以外で増やしていない
