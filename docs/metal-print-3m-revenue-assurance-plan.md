# 伯爵MUSIAM メタルプリント月商300万円 — Revenue Assurance Lane

更新日: 2026-07-18
状態: `CANDIDATE_EXECUTION_PLAN / EXTERNAL_ACTIONS_DISABLED`

## 1. 結論

月商300万円を「確実」と保証することはできない。代わりに、販売開始前から需要・採算・供給能力を同時に検証し、**実測前は月初の時点で目標売上の10倍以上のqualified pipelineを持ち、未達兆候が出た週に即座に打ち手を切り替える**ことで、未達確率を下げる。

EVIDENCE_SPRINT_01は「売れる商品か」を証明する。Revenue Assurance Laneは同時に「誰が、なぜ、いつ買うか」を証明する。proof完成後に初めて顧客探しを始める進め方は採らない。

## 2. 成功条件

### North Star

- 月次の全額決済・非返金売上: `>= ¥3,000,000`
- 基本モデル: `¥300,000 × 10件`
- Collector完売モデル: `¥300,000 × 12件 = ¥3,600,000`

### 先行指標

月初に必要なpipeline coverageを次で固定する。

| 段階 | 定義 | 月初必要数 | 金額換算 |
|---|---|---:|---:|
| Named | 実在し、接触理由を説明できる候補 | 120〜150 | — |
| Qualified | 空間・予算帯・時期・決裁条件のうち3項目以上が確認済み | 100 | ¥30,000,000 |
| Dossier accepted | 該当作品の仕様説明を受け取る意思がある | 50 | ¥15,000,000 |
| Purchase intent | 仕様・価格・納期を理解し、条件が整えば買う意思がある | 25 | ¥7,500,000 |
| Paid | 全額決済・非返金 | 10〜12 | ¥3,000,000〜¥3,600,000 |

実測前は`Qualified pipeline = 100件 / ¥30,000,000`を、月商目標に対する10倍coverageとする。qualified→paidが10%でも10件へ到達するための安全余白である。実売データが蓄積した後だけ、観測成約率の保守的な下限を使って必要数を再計算する。

## 3. EVIDENCE_SPRINT_01との同時進行

| Lane | Week 1 | Week 2 | Week 3 | Week 4 |
|---|---|---|---|---|
| Product evidence | 2社見積条件を固定 | proof仕様比較 | proofレビュー | offer lock判定 |
| Demand evidence | ICP候補150件を分類 | 承認後インタビュー開始 | 反応・障壁を集計 | ICP/offerを一本化 |
| Sales system | Dossier・質問票・CRM schema | 商談台本・反論FAQ | checkout E2E候補 | launch runbook |
| Revenue control | coverage台帳を初期化 | qualified率を測定 | purchase-intent不足を補正 | GO/HOLD/KILL判定 |

外部連絡前でも、候補の調査・分類、個別仮説、送信文案、質問票、Dossier対応表までは作成する。外部連絡、proof発注、広告、決済接続はHuman Approval後に行う。

## 4. 顧客ポートフォリオ

10件すべてを一般消費者の自然流入に依存させない。次の4群で分散する。

| Segment | 月次paid目安 | 主な購入理由 | 獲得方法 |
|---|---:|---|---|
| 既存ファン・支援者 | 3 | 楽曲との関係、作者支援、限定性 | owned audience、Chat、既存許諾接点 |
| 個人コレクター | 3 | 空間の焦点、収蔵性、物語 | 紹介、Collector Preview、個別Dossier |
| 店舗・ホテル・設計 | 2〜3 | 空間演出、来訪者体験、複数拠点 | 提案型営業、設計者・運営者紹介 |
| 贈答・法人 | 1〜2 | 就任、開業、周年、特別な贈り物 | 時期起点の個別提案 |

これは初期仮説であり、インタビュー後に成約率とリードタイムで配分を更新する。法人案件でEdition仕様が変わる場合は、既存3点限定とは別SKU・別Editionとして扱い、限定数を混同しない。

## 5. 売上を前倒しで確定する方式

### 原則

- proof前に全額決済を求めない。
- proof・仕様・返品条件が承認された後に、限定されたCollector Previewを開く。
- purchase intentを口約束で終わらせず、承認済み条件下では期限・返金条件を明示した予約または決済へ進める。
- 売上計上は全額決済・非返金のみ。予約やdepositはpipeline指標とする。

### 月次カプセルの開始条件

次の条件を満たすまで一般公開launchをしない。

1. 4 Editionのoffer lockが完了
2. 100 qualified、50 dossier accepted、25 purchase intentのうち少なくとも70%を確保
3. checkout、在庫、返金、破損対応のE2EテストがPASS
4. 12点を納期内に製造・検品・発送できるcapacityをvendorが確認
5. 目標粗利を満たし、再製造引当を含めても赤字にならない

満たさない場合はlaunch日を守るより、商品・ICP・価格を修正する。

## 6. 週次ノルマと自動的な救済判断

| 時点 | 累計paid目標 | 累計売上目標 | 未達時に最初に確認すること | 次の一手 |
|---|---:|---:|---|---|
| W1末 | 3 | ¥900,000 | qualified母数とDossier閲覧 | 上位ICPだけに集中、証拠不足を修正 |
| W2末 | 6 | ¥1,800,000 | purchase intent→checkout | 納期、設置、返金、価格説明を一変数テスト |
| W3末 | 9 | ¥2,700,000 | checkout→paid | 決済摩擦と個別不安を解消 |
| W4 | 10〜12 | ¥3,000,000以上 | 取消・返金・在庫同期 | paidだけを確定し翌月へ繰り越さない |

### Rescue Ladder

1. `Named不足`: 既存ファン以外の紹介・空間事業者候補を増やす。
2. `Qualified不足`: セグメントを狭め、置く空間と購入時期が明確な相手を優先する。
3. `Dossier不足`: CTAではなく実物証拠・設置イメージ・仕様の不足を直す。
4. `Purchase intent不足`: 作品選定、価格、納期、設置、破損不安を一項目ずつ検証する。
5. `Checkout不足`: 人間相談、請求・決済方法、納期確約範囲を明確化する。
6. `Paid不足`: 架空の希少性や無制限値引きは使わない。承認済み価格帯と半額枠内だけで判断する。

## 7. 価格による未達防止の限界

165,000円のDecisive Closeを最大4件使う既存設計では、12件完売時の最低売上は3,060,000円である。しかし、これは12件すべてが売れることを前提とするため、値引きを達成保証として扱わない。

価格は次の順で使う。

1. 330,000円で価値と通常価格を説明
2. 仕様・納期を理解したqualified buyerに300,000円を提示
3. 価格だけが明示的な最後の障壁で、枠が残る場合のみ165,000円

半額提示が2件を超えた時点で、値引きを続ける前にoffer/ICP/物証を再監査する。4件は上限であり目標ではない。

## 8. Pipeline台帳の必須項目

- `prospectId`（個人情報を分析イベントへ送らない内部ID）
- segment / source / owner
- interestedWork / desiredSpace
- budgetBand / purchaseTiming / decisionMaker
- stage / nextAction / nextActionAt
- dossierId / quotedPrice / priceAuthority
- lostReason / consentState
- paymentState / editionId / serialNumber

Chat本文やセンシティブ情報をPostHogへ送らない。外部CRMへ登録する場合は、利用目的と許諾状態を確認する。

## 9. GO / HOLD / KILL

### GO

- proof、粗利、供給、法務・表示、E2EがPASS
- qualified pipeline 100件相当
- purchase intent 25件相当、または同等売上の法人案件が確認できる

### HOLD

- proofまたは原価が未確定
- qualifiedが70件未満
- 300,000円の価格受容性が確認できない
- 決済・在庫・納品責任が未確定

### KILL / 再設計

- 20件の適格インタビュー後も強い購入意向が3件未満
- proofが品質基準を満たさず、改善見込みがない
- 300,000円成約時でも必要粗利を確保できない
- 誇張した限定性や過度な値引きなしでは成約仮説が成立しない

## 10. 直近の実行順

1. 150件候補を4segmentへ分類する台帳テンプレートを作る。
2. 15〜20件のインタビュー質問票と判定rubricを作る。
3. 4作品それぞれの「誰の、どの空間、どの転機に刺さるか」を一文で固定する。
4. vendor回答待ちと並行してDossierをproof差替え可能な構造にする。
5. Human Approval後、インタビューを開始し、週次で最初のボトルネックだけを改善する。

次Gateは `READY_FOR_APPROVAL_DEMAND_DISCOVERY`。ここでは候補台帳、質問票、連絡文案を完成させるが、まだ送信しない。
