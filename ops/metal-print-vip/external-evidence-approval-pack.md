# External Evidence Sprint — Human Approval Pack

状態: `HUMAN_APPROVAL_REQUIRED / NOTHING_SENT`

## Approval A — vendorへの見積・proof相談

対象候補:

1. Metal Print Japan
2. Metalia

送る内容:

- 4作品 × 各3点のArtist Editionを検討中であること
- 原画は各3000 × 3000px
- 8 × 8 / 10 × 10インチの適合性
- proof費、12点費用、仕上げ、色管理、個別梱包、納期、破損再製造条件
- この段階では原画ファイルを添付しない

承認対象:

- 外部問い合わせ送信
- 返答内容のローカル台帳化

別承認が必要:

- 原画アップロード
- proof発注・支払

## Approval B — 需要インタビュー

対象:

- 既存の許諾済み接点から最初の20件
- 4segmentを均等に試すのではなく、既存関係と収蔵意図の強さを優先

送る内容:

- 販売案内ではなく15分程度の需要調査
- 30万円前後の想定価格を隠さない
- proof前であり購入受付ではないと明記
- インタビュー質問は`demand-interview-guide.md`を使用

承認対象:

- ユーザーが選定した許諾済み20件への個別連絡
- 返答の匿名化集計

禁止:

- 無断一斉送信
- スクレイピングした個人連絡先への営業
- 架空の残数、期限、購入者
- proof前の決済依頼

## 再判定

両トラックの回答後に以下を更新する。

- `assurance.json`
- `unit-economics.template.csv`から実数版
- `demand-pipeline.csv`
- `launch-readiness-YYYY-MM-DD.md`

その後、`npm run audit:metal-print-assurance`が`STRONG_GO`になるか監査する。
