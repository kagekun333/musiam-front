# ABI伯爵 Daily Music Social Ops

Status: `READY_FOR_REVIEW`

開始基準日: 2026-07-31（Asia/Tokyo）

## 目的

ABI伯爵のSNSで、実際に使う音源・作品情報・投稿本文を毎日一致させ、公開後は「本日はこの音楽を紹介しました」と事実に基づいて案内できる状態を保つ。

## 毎日の確認順

1. schedule と ledger を読み、当日対象と公開済みURLを確認する。
2. native manifest の動画・画像・媒体別本文を確認する。
3. audio repair evidence または所有音源台帳で、実際に動画へ入っている曲名とトラック名を確認する。
4. `works-ssd.json` の summary / track notes で作品内容を確認する。
5. 曲名、内容、映像、本文が一致しない場合は公開を止め、candidate copy を Human Review に回す。
6. 公開後にのみ、公開URLと確認時刻を添えて「本日はこの音楽を紹介しました」と案内する。予約・URL生成・審査中は公開済みと表現しない。

## 紹介文の基本形

- 1行目: 本日紹介した曲名または作品名
- 2〜3行目: 曲の主題を、確認済みメタデータに基づいて短く説明
- 4行目: 聴き手が答えやすい問いを1つ
- 導線: 媒体ごとの正規UTMまたは公開済み投稿URL
- 禁止: 未確認の制作意図、再生数、反響、売上を推測しない

## 2026-07-31以降の確認済み履歴

| 日付 | 投稿/音楽 | 内容整合 | 公開状態 |
|---|---|---|---|
| 2026-07-31 | `A Town Called Almost Home` | 帰属感・「ほとんど我が家」。所有WAVと本文が一致 | Instagram / TikTok / YouTube をledger記録済み。媒体状態は各ledger注記を正とする |
| 2026-08-01 | `Deus sive Natura` | 神すなわち自然。所有WAVと哲学本文が一致 | Instagram / TikTok / YouTube を公開確認済み |
| 2026-08-02 | `BALIAN` と人生の再始動 | BALIANの静けさ/力強さを静止画で紹介。音源付き動画ではない | Instagram / Threads を公開確認済み |
| 2026-08-03予定 | `BALIAN / ATAPA` | 実音源はATAPAだが、現行承認本文はAI制作論で不一致 | `HUMAN_DECISION_REQUIRED`。candidate packを確認するまで公開しない |

## 継続Gate

- 現行 Launch Wave 01 は 2026-08-04 で終了する。
- 2026-08-05以降の毎日投稿には、曲目、素材、媒体別copy、alt、UTM、日時を持つ新しいcandidate waveが必要。
- candidateは、音源/内容一致の機械確認後に一括Human Approvalを受ける。承認前の外部投稿は行わない。
- Xは凍結解除まで対象外。DM、広告、新規規約同意、プロフィール変更は別Gate。

## Daily Release Intake

新しい音楽が `public/works/works.json` に正本登録されたら、作品IDと公開日だけで4媒体のcandidate packを生成する。

```bash
npm run build:daily-music-release-pack -- --work-id=<canonical-work-id> --date=YYYY-MM-DD
npm run validate:daily-music-release-pack -- --input=ops/audience-engine/daily-music-release-candidates/YYYY-MM-DD--<work-id>.json
```

TikTok / YouTube用の所有音源がある場合は、候補JSONを直接上書きせず、検証済み動画とmedia-ready候補を別出力する。

```bash
npm run build:daily-music-release-video -- --input=<candidate.json> --audio=<owned-audio> --output-pack=<media-ready-candidate.json>
npm run validate:daily-music-release-video -- --input=<media-ready-candidate.json>
```

動画はジャケットを1080×1920へ配置し、所有音源をAACで含む15秒H.264 MP4として生成する。音源・cover・動画のSHA-256を候補に固定し、TikTok / YouTubeを`READY`へ進めるが、外部公開状態は必ず`HUMAN_APPROVAL_REQUIRED`のまま維持する。Spotify等の配信ストリームから音源を抽出しない。

生成物にはInstagram、Threads、TikTok、YouTubeの作品別Chat URL、exact UTM、低圧copy、alt、listen URL、媒体別approval tokenを含める。TikTok / YouTubeは所有音源が与えられるまで`AUDIO_ASSET_REQUIRED`、全媒体は対応するapproval tokenが与えられるまで`HUMAN_APPROVAL_REQUIRED`とする。

これは投稿準備の自動化であり、公開、反響、需要、pipeline、売上の証拠ではない。
