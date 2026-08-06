# ABA伯爵 Instagram 0→1,000,000 Operating System

> SUPERSEDED: 名称は `ABI伯爵` に確定しました。現行運用は `../audience-engine/abi-hakusyaku-autonomous-growth-os.md` と `../audience-engine/abi-hakusyaku-profile-packet.json` を参照してください。このファイルは旧判断の履歴として保持します。

Status: `STRATEGY_READY / ACCOUNT_CREATION_HUMAN_GATE`

## Objective

専用Instagramをゼロから「ABA伯爵の世界観メディア」として育てる。フォロワー100万人は保証値ではなく長期North Starとし、短期の事業KPIはInstagramから伯爵Chatへ来た実訪問、相談、Dossier承諾、購入意向、非返金売上で判定する。

## Recommended account architecture

- Dedicated account: ABA伯爵の一次ブランド資産。候補handleは `@aba_hakusyaku`、`@hakusyaku_aba`、`@aba_count`。作成時に空きを確認する。
- Existing personal/current account: 初動ブリッジ。専用アカウント紹介投稿、共同投稿、Story共有だけに使い、主運用は専用側へ集約する。
- Website destination: `https://www.hakusyaku.xyz/chat?intent=metal-print`。Instagram内で押し売りせず、興味を示した人を一問診断へ送る。
- Account type: Instagram Professional / Creator または Business。公式Content Publishing APIを使える状態にする。

## Positioning

Category: `AI × 音楽 × 哲学 × 空間芸術`

Promise: `一曲の世界観を、人生と空間に残る象徴へ。`

Bio draft:

```text
ABA伯爵｜音楽・哲学・空間芸術
AIと人間の美意識で、世界観を作品にする。
350作品から、あなたの空間に残る一点を伯爵が選ぶ。
↓ 一問から、購入義務なし
```

## Content engine

売り込み中心にせず、共有したくなる世界観を先に作る。

1. `伯爵の一問` — 哲学的な一文＋映像。全投稿の35%。
2. `音が絵になる瞬間` — 楽曲ジャケット、音、空間mockup。25%。
3. `AI創作の舞台裏` — 制作工程、失敗、選択理由。20%。
4. `伯爵の館` — 作品アーカイブ、手紙、文化・旅・思想。15%。
5. `Collector Offer` — メタルプリント等の販売。5%。

初期90日:

- Reels: 1日2本、計180本
- Carousel: 週3本、計39本
- Stories: 毎日3–8枚
- Live/長尺対話: 週1回
- 日本語を主軸に、反応上位20%だけ英語版を展開
- NATURA販売投稿は全体の5%以下。プロフィール・固定投稿・Highlightで常時受注可能にする

## Growth Gates

### 0→1,000

- 30本単位でhookを比較
- 3秒視聴維持、完視聴率、保存率、共有率を主評価
- 上位20%の構成だけシリーズ化
- 既存アカウントから紹介投稿を1回、Story共有を3回

### 1,000→10,000

- 勝ちシリーズを3本に固定
- コメントから次回テーマを採用
- 同規模の音楽・AIアート・哲学系Creatorと共同投稿
- 月1回の参加企画「あなたの一問を伯爵が作品にする」

### 10,000→100,000

- 上位Reelsの英語・字幕・再編集版
- 共同投稿とゲスト対話を週1回
- メール/伯爵Chatへの所有Audience移行
- フォロワー数ではなく、月間qualified consultationを主要KPIへ移す

### 100,000→1,000,000

- 多言語シリーズと国際Creator共同制作
- 視聴者投稿を許諾付きで作品化するUGC loop
- 長尺作品、展示、音楽releaseと短尺配信を同期
- 単発viral依存を避け、3つ以上の独立シリーズで再現性を確認

## Sales model

`Content → Profile → 伯爵Chat → one-work diagnosis → Dossier → consultation → Stripe → WhiteWall`

- フォロワーへの無差別DM営業は禁止。
- ユーザーがコメント、DM、Story reply、Chat訪問など明示的な関心を示した後だけ対応する。
- 自動返信を使う場合も、公式APIで許可された範囲・短い一次案内・opt-out可能な設計にする。
- 売上判定はStripeの非返金決済だけ。フォロワー、再生、いいねを売上証拠にしない。

## Autonomous system

Codex/AIが担当可能:

- 週次コンテンツ企画と台本生成
- 画像・字幕・caption・alt textのcandidate制作
- 投稿ごとの固有UTM発行
- 公式APIによる承認済み投稿の予約公開
- Instagram Insightsとfirst-party funnelの集計
- 勝ちhookの判定と翌週配分変更
- 受信した質問への返信案作成
- 伯爵Chatへの誘導とpipeline監査

Human Gate:

- 新規Instagramアカウントの作成
- username、誕生日、本人確認、CAPTCHA、2FA
- Professional account化とMeta/Facebook Page連携
- Meta OAuthと権限承認
- 初回のブランドプロフィール承認
- 外部公開の最初のWave
- 個別DM送信、契約、課金、広告費、返金、WhiteWall発注

## Compliance boundary

- 非公式botでのaccount作成、ログイン、scrapingを行わない。
- 自動follow/unfollow、like、反復comment、フォロワー購入を行わない。
- 同意のない商用DMを繰り返さない。
- passwordをリポジトリへ保存しない。Meta tokenはserver-side environment variableだけで扱う。
- 公開APIで許可されるContent PublishingとInsightsを自動化の中心にする。

## Milestone scorecard

| Window | Audience signal | Business signal | Decision |
|---|---|---|---|
| Day 14 | 28 Reels published | 10 attributable site visits | hooksを残す/捨てる |
| Day 30 | 60 Reels, 3 repeatable formats | 3 qualified consultations | seriesを3本へ集中 |
| Day 60 | save/share率上位hookが再現 | 10 qualified consultations | English expansion |
| Day 90 | organic reachの週次成長 | 25 purchase intents or evidence-based revision | scale / reposition |

数字は最低保証ではない。実データが下回れば投稿量を水増しせず、hook・audience・offerを更新する。

## Exact unblock sequence

1. ユーザーがInstagramアプリまたは公式Webで専用アカウントを作る。
2. Creator/Businessへ変更し、2FAを有効化する。
3. handleとプロフィールURLをCodexへ渡す。
4. Codexがブランド設定、初期9投稿、90日calendar、計測、公式API接続を順に実装する。
5. 既存アカウントから専用アカウントへ一度だけ紹介導線を出す。

Account creation自体はInstagram規約上のHuman Gateであり、非公式自動作成は行わない。
