# 伯爵と話す — 営業力強化戦略

更新日: 2026-07-26
状態: Candidate / ローカル実装中（本番未反映）

> 2026-07-26 追記: 法人オフィスアート導線を追加。`wantsOfficeArt`（法人文脈×アート、または経費・償却×アート）を business(BGM) 判定より先に評価し、公爵が `office-art` 商材で応対 → 税制メリットは「特例の対象になり得ます＋税理士確認」の一度だけ非断定で言及 → CTA `/office-art` へ誘導。intent は `business` として計測。golden set に2シナリオ追加。

## 目的

「伯爵と話す」を、売り込みをするChatではなく、来館者の言葉を理解し、最も合う作品または相談先を一つだけ差し出す接客導線にする。

一次成果は会話数ではない。会話から次の価値行動へ進む割合を改善する。

1. 無料作品の試聴・閲覧
2. 低単価商品の購入導線
3. オーダーメイド曲の相談
4. 法人・店舗案件の相談
5. 次回接点となるメール登録

## 営業原則

- 理解が先、提案は後。相手の言葉に根拠を置く。
- 一度に一つだけ提案する。商品一覧を会話本文に並べない。
- 「なぜあなたに合うか」を作品名より先に伝える。
- 作品名、価格、リンク、実績は実データのみを使う。
- 弱っている相手には販売・作品提示・CTAを出さない。
- 虚偽の限定、煽り、誇大表示、本人が言っていない感情の断定をしない。
- Candidate、approved、final、production のGateを混同しない。

## 接客ファネル

| 段階 | 来館者の状態 | 伯爵の仕事 | 主イベント |
|---|---|---|---|
| 到着 | 目的がまだ不明 | 話しやすい入口を出す | `salon_open`, `salon_starter_click` |
| 理解 | 気分・用途・相手が見える | 一度だけ言い換え、必要なら質問は一つ | `salon_send`, `salon_reply` |
| 処方 | 作品または商品が合う | 一つだけ、理由付きで差し出す | `salon_work_show`, `salon_cta_show` |
| 行動 | 興味が生まれた | 具体的で誤解のないCTAへ渡す | `salon_work_click`, `salon_cta_click` |
| 継続 | 今回は買わない | 次の便りの許可を取る | `salon_lead` |

## 月商100万円の売上モデル

これは売上を「クリック数」で誤認しないための暫定モデルである。価格は現行の公開設定を使用し、実売・返金・税を含む確定売上は決済側で確認する。

| 商品・案件 | 月間成約目標 | 単価 | 月間売上 |
|---|---:|---:|---:|
| 法人・店舗の楽曲/BGM制作 | 2件 | ¥300,000〜 | ¥600,000〜 |
| あなたのための一曲（オーダー） | 10件 | ¥19,800〜 | ¥198,000〜 |
| 商用利用OK BGMライセンス | 41件 | ¥4,980 | ¥204,180 |
| **合計** |  |  | **¥1,002,180〜** |

必要ファネルの初期仮説（実測値が取れたら置換する）:

| 導線 | 会話意図 | CTA click | 成約 | 置くべき確認値 |
|---|---:|---:|---:|---|
| 法人BGM | 100 | 40 | 2 | 問い合わせ完了率 50%、受注率 10% |
| オーダー曲 | 250 | 100 | 10 | 相談後成約率 10% |
| BGMライセンス | 500 | 100 | 41 | checkout完了率 41% |

この仮説には月5,000件程度の「1回以上発言した」Chatセッションを要する。現在値がこれを大きく下回る場合、Chat改善だけでは届かない。展示、手紙、検索、SNS、法人向け導線から意図の高い流入を増やすことを同時に進める。

## North Star とKPI

North Star: `Qualified Action Rate`
1回以上発言したセッションのうち、作品クリック・商品CTAクリック・メール登録のいずれかに進んだ割合。

補助KPI:

- Starter activation: `salon_starter_click / salon_open`
- Conversation activation: 1発言以上のセッション / `salon_open`
- Work offer rate: `salon_work_show / salon_reply`
- Work CTR: `salon_work_click / salon_work_show`
- Product CTA CTR: `salon_cta_click / salon_cta_show`
- VIP route rate: `intent in (business, order) / salon_reply`
- Lead rate: `salon_lead / 1発言以上のセッション`
- Safety violation rate: care意図での作品・CTA提示（目標 0）

金額売上は Stripe / 問い合わせ側のデータと別Gateで接続する。PostHogだけで購入完了と断定しない。

## 計測契約

営業イベントには、取得できる場合だけ以下を付ける。

- `lang`, `timeTone`
- `userTurn`
- `intent`: `care | business | order | product | work | conversation`
- `persona`: `count | duke`
- `workId`, `workType`, `linkKind`
- `productId`
- `hasWork`, `hasCta`

会話本文、メールアドレス、自由入力内容はイベントpropertyに送らない。

## Sprint ladder

### Sprint 1 — 計測可能な処方（今回）

- 日本語と英語の意図語を作品メタデータへ橋渡しする
- 同じ入力では同じ候補になる決定的な順位付けにする
- 作品カードと返答に「選んだ理由」を追加する
- 作品・商品・VIP導線を比較できるイベントpropertyを揃える
- 作品希望ケースでカード提示を必須にする回帰検証を追加する

Done when: lint / typecheck / build / chat validators が通る。

### Sprint 2 — 実験の母集団を作る

- 本番反映後、最低100件の `salon_open` または2週間の長い方まで観測
- 言語・時間帯・starter index別に離脱とクリックを確認
- 現在値を保存し、以後の変更に対するbaselineにする

週次で、法人は10件の意図・4件のCTA click・0〜1件の商談、オーダー曲は25件の意図・10件のCTA click・2〜3件の成約、BGMライセンスは50件の意図・10件のCTA click・10件の購入を目安にする。未達箇所だけを改善し、全導線を同時に変えない。

Stop condition: サンプルが少ない段階で勝敗を断定しない。

### Sprint 3 — 一変数テスト

優先順:

1. 作品理由の具体性（短い理由 vs. 情景を含む理由）
2. 作品カードCTA（サービス名 vs. 得られる体験）
3. 高単価導線（直接CTA vs. 一問だけ要件確認してからCTA）
4. メール提示タイミング（3メッセージ固定 vs. 作品クリック後）

一度に複数を変えず、主KPIと安全指標を事前に固定する。

### Sprint 4 — 成約接続

- Stripe購入完了または問い合わせ完了を、匿名の流入情報で接続
- 商品別の `CTA click -> completed` を確認
- 売上に寄与しないクリック最適化を止める

Human Approval required: 外部サービス設定、production環境変数、購入完了webhook、production deploy。

## 判断Gate

- ローカル検証PASS: `READY_FOR_REVIEW`
- 本番反映: Human Approval required
- 2週間または100 open後: baseline review
- A/B勝者の恒久採用: Human Decision required
