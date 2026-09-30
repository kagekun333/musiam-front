# MUSIAM FULL HANDOFF — 2026-09-30

**Status:** CURRENT AUTHORITY HANDOFF
**Project:** 伯爵MUSIAM / Count Chat / MUSIAM Autonomous Cultural Commerce
**Purpose:** 次のChatGPTページ・Work・Codex・各Agentが、ここまでの流れを取りこぼさず即座に再開するための詳細引き継ぎ書。
**Supersedes for current state:** `MUSIAM_FULL_HANDOFF_2026-09-29.md` 等の旧handoff。旧文書は歴史資料として残す。
**Strategy authority:** `docs/AI/MUSIAM_MASTER_STRATEGY_LOCK_2026-09-30.md`
**Control Plane runbook:** `docs/AI/MUSIAM_CONTROL_PLANE_RUNBOOK.md`

---

# 0. この引き継ぎ書の使い方

次ページは、最初にこの文書を前提として扱う。

やってはいけないこと：

- Recoveryを最初からやり直す
- DistroKid browser extensionを主線へ戻す
- static 514件だけを現行Catalogだと思う
- `/works` が420件の旧画面だと誤認する
- German/Okinawa等を個別ifで追加する
- title一致だけで作品identityをmergeする
- AIが過去に書いた解説を伯爵本人の制作意図へ昇格する
- raw working treeをProductionへdeployする
- Human-owned dirtyを勝手にstage/revertする
- protected rootsを探索する
- 「計画の計画」を繰り返し、実装可能なのに止まる

次ページの最初の行動：

1. `cd /Users/kagekun/Desktop/musiam-front-clean`
2. `git rev-parse HEAD`
3. `git status --porcelain=v1 --untracked-files=no`
4. `node scripts/control-plane/source-parity.mjs`
5. `node scripts/control-plane/drift-check.mjs`
6. `node scripts/control-plane/parallel-lanes.mjs status`
7. active lease / merge queue / lane collisionを確認
8. その時点の最大ボトルネックを選び、次のGateへ進む

---

# 1. 伯爵の最終目標 / North Star

MUSIAMは単なる音楽Catalogや作品展示サイトではない。

正式な方向性：

> **音楽・アート・思想・メディア・Drone・SHAMAN・Metal Print・Fashion・Coffee・France/Europe rare goods・Select Shop・Concierge・B2Bを束ね、AIが集客→案内→理解→推薦→販売→再訪→分析→改善まで自律運営する文化商業圏。**

長期事業目標：

> **月商 ¥100,000,000**

これは売上予測ではなく、逆算して作る事業North Star。

重要な設計思想：

- 音楽だけで月商1億を狙わない
- 音楽は世界観と集客の核
- 高単価：Collector Art / Drone / SHAMAN / Metal / B2B / Interior / Hotel
- 中単価：Fashion / Select / Europe rare goods / Concierge
- 継続接点：Letters / Intelligence Underground / Newsletter / SNS
- AIがroutine human opsを極小化する
- 原則在庫ゼロ / capital-light first
- Visitor first / no hard sell / distress中に売らない
- ただし営業力は人間上位営業を実測で超えることを目標にする

---

# 2. 伯爵Chatの人格 LOCK

Count ChatはFAQ botではない。

目標：

> **知的で、少し変で、洒落ていて、たまに笑えて、作品を本当に知っている館主。**

伯爵が明確に嫌っているもの：

- 「制作時の具体的な記録は残っていません。ただ〜」の定型連発
- 「確認できません」の定型連発
- 毎回同じ免責文
- 毎回同じ「僕の読みでは」
- 毎回「たぶん」
- 内部ラベル FACT / UNKNOWN 等を客前で読む
- 3択を毎回出す
- 質問攻め
- ユーザー発言の復唱
- 硬い敬語の説明書
- 正しいが面白くない回答

歓迎される方向：

- 「これは○○ですね。たぶん。」
- 「いや、これはかなり自信あります」
- 軽いツッコミ
- 作品に応じた意外な比喩
- 一緒に探す感覚
- 2〜4文程度の自然会話
- 相手のノリに応じて長短を変える
- 不確実性を退屈な免責文にしない

ただしユーモアは義務ではない。

支払い・苦情・健康・安全・法務・深刻な悩みでは遊びを優先しない。

---

# 3. Truth / Knowledge の憲法

内部では必ず区別する。

- `FACT` — 公開情報・台帳・実行結果
- `OWNER_MESSAGE` — 伯爵本人の直接発言
- `OWNER_PUBLISHED_MEDIA` — 伯爵署名のLetter等
- `OFFICIAL_RELEASE_DATA` — DistroKid / Apple / lyrics / identifier
- `APPROVED_ARTIFACT` — 実際に作成・承認された作品解説や商品
- `AI_DERIVED_FROM_OFFICIAL_SOURCE` — official sourceをAI分析したもの
- `AI_DRAFT` — 過去AI提案。未承認ならowner intentではない
- `CURATORIAL_INTERPRETATION` — Countの館主的な読み
- `UNKNOWN / KNOWLEDGE_GAP`
- `PROHIBITED_INVENTION` — 架空の価格・在庫・出来事・人物関係・制作エピソード等

重要：

> **AIが昔自分で書いた美文を、後のAIが「伯爵本人の制作背景」として再引用する循環を禁止。**

Owner intentを作者本人に帰属してよいのは、review済み source が `EXPLICIT` の時だけ。

`NOT_EXPLICIT` の作品は内容を語ってよいが、

> 「伯爵は○○の理由で作った」

とは言わない。

Knowledge Gapでも会話は止めない。

Countの解釈として遊べるが、伝記・史実・歌詞・楽器を捏造しない。

---

# 4. Canonical Repo / Git / Production safety

Canonical local repo：

`/Users/kagekun/Desktop/musiam-front-clean`

Canonical branch：

`recovery/musiam-clean-20260920`

Remote：

`origin = https://github.com/kagekun333/musiam-front.git`

現在Local branchはremote同名branchと同期する運用へ移行済み。

旧repo：

`/Users/kagekun/Desktop/musiam-front`

はdecommissioned。再作成・主線復帰禁止。

## Human-owned tracked dirty

常時触らない：

- `ops/continuous-operation/experiments.json`
- `ops/continuous-operation/state.json`

最新fresh snapshot時もこの2件のみtracked dirty。

## Protected roots

- `ops/market-learning/daily-20260925/`
- `ops/market-learning/daily-20260926/`
- `ops/market-learning/daily-20260927/`

Gateのzero-touch policyでは：

- NO_READ
- NO_STAT
- NO_LIST
- NO_HASH
- NO_TRAVERSE
- NO_STAGE
- NO_CHANGE
- NO_DEPLOY

過去にnon-mutating traversalの履歴はある。再調査しない。

---

# 5. 最新fresh state — 2026-09-30 21:30 Europe/Paris

このhandoff作成直前のfresh確認。

Canonical HEAD before handoff-doc commit：

`f6006fb3604ed61fbff277b89ebea38a0f150aee`

Branch：

`recovery/musiam-clean-20260920`

Tracked dirty：

- `ops/continuous-operation/experiments.json`
- `ops/continuous-operation/state.json`

Canonical active lease：

none

Current Production：

`dpl_4LNUvTF58ofVXp8MaPXnRJZvYNp8`

Production URL：

`musiam-front-1rb73dzrv-hakusyakus-projects.vercel.app`

Aliases：

- `www.hakusyaku.xyz`
- `hakusyaku.xyz`
- `musiam-front.vercel.app`

State：

`READY`

Production runtime source commit：

`0357ee0dee84446eb00b6663024139c1df40d855`

Commit message：

`fix: align analytics sink return type`

Recorded Preview：

`dpl_2XQV4NDE2xbb2xmmzCjgHx9jzY8m`

Recorded deploy manifest SHA-256：

`7ba2c43a889338b76ac182e6dd387e1d902c9101011110ed29ef16e3d2d373ba`

Previous Production / rollback candidate：

`dpl_GBVtBTqpxjgr1DFCFYk2U631Eiga`

最新receipt：

`ops/control-plane/latest-production-receipt.json`

---

# 6. Catalog architecture — 現在の正しい理解

Static Base Catalog：

**514 raw records**

- music 380
- books 134

Apple automatic overlayにより、Production runtime raw：

**582 records**

= static 514 + Apple overlay 68

表向き `/works` はprovider duplicateをdedupeするため：

**488 unique works**

- music 354
- books 134

つまり以下を混同しない：

- 514 = static base raw
- 582 = live runtime raw
- 488 = `/works` display unique

旧 `/works` 420件状態は修正済み。

420はstatic catalog 514を旧dedupeした表示だった。

現在 `/works` は：

`loadLiveMergedWorksServer()`
→ Apple overlay込み
→ `dedupeWorks()`
→ 488 unique

へ一本化済み。

`/works/[id]` もDynamic Live Catalog化済み。

新作が一覧に出てもdetail 404になる旧問題は解消。

---

# 7. Apple automatic release overlay

DistroKid browser extension / Native Messagingは：

`DORMANT_NONPRIMARY`

主線はApple public catalog。

Apple artist ID：

`1811526635`

Apple endpoint：

`https://itunes.apple.com/lookup?id=1811526635&entity=album&limit=200&country=US&sort=recent`

`sort=recent` は必須。

Bootstrap floor：

`2026-08-14`

Production overlay key：

`musiam:release-overlay:v1`

Preview：

`musiam:release-overlay:preview:v1`

Development：

`musiam:release-overlay:development:v1`

Local：

`musiam:release-overlay:local:v1`

Failure policy：

- Apple failureでlast-good overlayを消さない
- omissionでdeleteしない
- Redis unavailable → static base fail-open
- invented works禁止
- titleでidentity mergeしない
- post-floorだけ安全にauto-admit
- historical unmatchedはUNRESOLVED

Production first sync result：

- EXISTING 70
- NEW 68
- CHANGED 0
- historical UNRESOLVED 62

Full historical completenessはまだNOT_PROVEN。

最新作として本番で確認済み：

`Sun Without a Map`
- Apple collection ID based workId
- 2026-09-29
- Apple Music public link
- Apple artwork URL / mzstatic

ジャケットは新作についてApple公開画像URLを使う。

---

# 8. Apple release automation / Cron

Production cron：

`/api/cron/apple-release-sync`

Schedule：

`30 0 * * *` UTC

既存：

`/api/cron/metal-print-ops`
`0 0 * * *` UTC

初回authorized Production Apple syncは200で完了。

次の運用上の監査として、

`APPLE_RELEASE_OVERLAY_AUTONOMOUS_OPERATION_AUDIT`

を自然cron後に実行する価値がある。

ただしProduct developmentの最大ボトルネックは現在そこではない。

---

# 9. /works と Exhibition

`/works`：

- Live Runtime Catalog
- display dedupe
- 488 unique
- Apple new works visible
- Apple artwork works
- dynamic

`/works/[id]`：

- Live Runtime Catalog
- dynamic
- Apple-only new release IDsを開ける
- external cover URL用public cover helperあり

`/api/exhibition`：

- live raw 582
- Editorial Knowledge description projection対応
- Apple overlay込み

重要な過去バグ：

APIは582なのに、ユーザーが実際に見る `/works` は420だった。

原因：

UIとAPIが別loaderだった。

この経験から、今後は：

> **API PASSだけで完成扱いせず、実ユーザー画面を必ずsmokeする。**

---

# 10. Count Chat — Natural Title / Recall

旧問題：

`Sun Without a Map`
→ exactなら認識

しかし：

`Sun Without a Mapってどんな曲？`
→ 認識しなかった。

修正済み。

現在：

- exact title
- quoted title
- natural prose title
- title + 「について」
- listen/open phrasing

をrecognize。

短いtitle例：

`ME`

はordinary prose内で誤爆しない。

明示引用・work-title contextでは認識可能。

## Fuzzy Recall

例：

`伯爵の瀬底島の曲なんだっけ？`

現在：

> `Sesoko Island`ですね。聴きますか？

まで本番PASS。

Recall architecture：

1. exact identity
2. explicit alias
3. local fuzzy
4. semantic recall
5. LLM chooses only among real catalog IDs
6. returned workIdがCatalogに無ければ棄却
7. confidence不足ならclarification

generic：

`島の曲なんだっけ？`

では勝手にSesokoへ断定しない。

---

# 11. Catalog Intelligence Graph V1

ドイツ語だけ、沖縄だけをif文で直す方式は禁止した。

General facets：

- language
- country
- region
- place
- culture
- theme
- visual
- time
- search_alias

Intelligence sidecar：

`public/works/work-intelligence.json`

Identity merge keyではない。

search aliasとcatalog identity aliasを分離。

例：

`瀬底島`

は検索別名として使えるが、stable merge keyではない。

## language scope

- primary
- mixed
- included
- instrumental

例：

- Görli Garden → German primary
- Fuego en la Noche → Spanish + English mixed
- WORLD STRIKE → French等 included
- BRANDENBURGER TOR → instrumental, Germany/Berlin geography

これにより：

`ドイツ語の曲`

と

`ドイツの曲`

を別処理できる。

## validated language coverage

少なくとも16言語ラベルの横断fixtureを実装。

例：

- German
- French
- Chinese
- Korean
- Spanish
- Portuguese
- Italian
- Latin
- Ancient Greek
- Arabic
- Hindi
- Russian
- Indonesian
- Swahili
- Bengali
- English / Japanese 等

重要：

`日本語で答えて`

を

「日本語の曲を探している」

と誤認する旧バグも修正済み。

---

# 12. Work Medium classifier

旧regex問題：

`夜に静かに聴けるものを一個だけ、日本語で`

の「日本語」の中の `本` をbookとして誤認し、本を推薦していた。

これを局所regex修正で終わらせず：

`src/lib/chat-request-medium.ts`

へ独立classifierを作った。

対応：

- `日本語` ≠ book
- `本日` ≠ book
- `聴けるもの` → music
- `おすすめの本` → book
- `本じゃなくて曲` → music
- `曲じゃなくて本` → book

API内のmedium regex二重管理を廃止。

---

# 13. Owner Source Corpus — 全体思想

伯爵作品はWeb上の情報が少ない。

従って、

> 「有名曲のようにWeb検索すれば理解できる」

という前提を捨てた。

最重要sourceは伯爵自身の制作記録。

Source候補：

- ChatGPT過去会話
- Codex整理済みarchive
- Suno prompts
- lyrics
- visual/cover prompts
- revision history
- Letters
- IU
- blog
- SNS
- official release exports
- approved artifacts

Knowledge gap時の理想：

```
workId
→ Owner Source Index
→ reviewed packet first
→ local archive
→ Library
→ official release data
→ owner media
→ source classification
→ Evidence Packet
→ contradiction check
→ Knowledge Envelope
→ runtime candidate
```

---

# 14. Owner Source Corpus Probe

Representative works：

- Fuego en la Noche
- Görli Garden
- Sesoko Island
- Sun Without a Map
- 星海の眠り

Probe結論：

- archive miningは実用可能
- source qualityは uneven
- Fuegoは強いOwner Published Media + official lyrics
- Görliはofficial lyrics強い / owner motiveは別問題
- Sesoko / Sun / 星海は制作意図sourceが薄い
- GapをGapのまま保てる構造が必要

重要：

generic cover briefはsong meaningではない。

image searchはowner intentではない。

operational logはcreative meaningではない。

---

# 15. Owner Source Corpus Index V1

Local archive：

`/Users/kagekun/Desktop/MUSIAM_CODEX_EXPORT`

- 343 markdown sessions
- 10,400 parsed USER/ASSISTANT sections

Index output：

`ops/product/owner-source-corpus-index-v1.json`

初期：

- works indexed 421
- reviewed packets 5
- works with candidates 272
- title mentions 2,207
- OWNER_MESSAGE_CANDIDATE 41
- AI_MESSAGE_CANDIDATE 234
- wrapper/approval candidates 924

重要：

Codex exportの `USER` は必ずしも伯爵本人の一次発言ではない。

approval wrapperにagent historyが埋め込まれているため、wrapperを大量に別分類している。

Indexは本文を大量コピーしない。

保存：

- relative source path
- role
- line range
- signal
- score
- section SHA-256
- binding status

raw conversation text / lyrics全文をindexへ複製しない。

Indexはlocatorでありoracleではない。

---

# 16. Knowledge Envelope V1

Runtime editorial sidecar：

`public/works/editorial-knowledge.json`

Knowledge Envelopeへ追加：

- summaryJa
- ownerIntentSummaryJa
- facets
- sourceClass
- ownerIntentStatus
- sourceHref

`ownerIntentStatus`：

- EXPLICIT
- NOT_EXPLICIT
- UNKNOWN

本人の制作意図として言ってよい条件：

`EXPLICIT + ownerIntentSummaryJa`

それ以外は：

`ownerProductionIntent` = unknown

## Work Story vs Sonic

Work Story：

- どんな曲？
- テーマは？
- 何を描いてる？
- なぜ作った？
- 何を込めた？
- 何を伝えたかった？

Technical Sonic：

- 楽器
- BPM
- lyrics
- vocal
- mix
- sound texture

Editorial proseでtechnical audio factを埋めない。

---

# 17. Owner Source Knowledge Coverage V1

V1で追加：

**24 music works**

12 owner-signed Letters。

Editorial rows：

14 → 38

新規：

- EXPLICIT 21
- NOT_EXPLICIT 3

代表：

- ENA
- Mama Afrika
- FORCED UPDATE!
- 強制アップデート
- ABZU
- EARTH OS
- DEMIURGOS
- HD 10700
- HIBIYA BRASS WALK
- 親愛なる日本の皆様
- Spirit River Rising
- WORLD STRIKE Thirteen Tongues
- 神奈備
- IMAGINE NO BUTTON
- サウナトランス ととのい
- ピース・イズ・エンジニアード
- 速度が形を消すとき
- 量子恋愛アルゴリズム
- Truth Unbound
- 心上人
- OMNI
- Infinite Graves
- Back Me
- House in the World

12 Letterすべてsource hash検証済み。

V1時点static music coverage：

26 / 286 = **9.09%**

provider duplicateのEditorial leakageも修正。

---

# 18. Owner Source Knowledge Coverage V2

V2はParallel Execution Layerの `knowledge-v2` laneで実施し、Canonicalへ統合済み。

関連commit：

- `546af82` feat: expand owner source knowledge coverage v2
- `e59c673` fix: harden owner source knowledge coverage v2
- `358a75e` fix: guard incomplete work story responses
- `cd2b1dc` fix: allow post-merge lane resync
- `c4daf9d` chore: record coverage v2 production receipt

V2追加：

**14 works**

- 13 music
- 1 book

V2 intent：

- EXPLICIT 8
- NOT_EXPLICIT 6

Editorial total：

**52 rows**

Static music coverage：

**39 / 286 = 13.64%**

V1時点：

26 / 286 = 9.09%

Remaining uncovered works：

368

Letter candidates：

198

## V2 reviewed works

- ABI9PRO
- Pan
- Holy God
- Main Character Energy
- 流れ往くままに！
- BALIAN
- Drey Fugen: Harmonia Mundi
- Coffee Love
- ENGINE
- アマテラスOG短編集
- 사인 주세요
- カーボンネガティブプロジェクト
- Eagle Eye
- ME

## Important V2 safeguards

### Short reviewed title guard

`Pan` / `ME` のような短いASCII titleは通常substring検索だと危険。

現在は：

- quoted title
- query先頭 + Japanese title particle
- explicit title context

等のみreviewed title resolution。

`pandaみたいな曲ある？`

で `Pan` を拾わない。

`recommend me something`

で `ME` を拾わない。

### Provider duplicate V2

8 worksで同じSpotify stable URLを持つ別Catalog IDをexplicit reviewしてEditorial binding。

title-only bindingではない。

### Incomplete Work Story guard

Preview/Production smokeで、

`Holy God`

のLuna responseが途中で：

> 館の世界を一望させ

で切れるケースを発見。

Generic completion guardを追加。

- clearly complete → 通常返答
- clearly truncated → reject
- evidence-grounded deterministic fallbackへ
- user text/story contentをwarning logへコピーしない

特定Holy Godだけのhackではない。

---

# 19. Production receipt latest business state

Fresh receipt作成時のProduction business invariants：

- `ownerSourceKnowledgeCoverageV2 = PASS_PRODUCTION`
- Editorial Knowledge rows = **52**
- static unique music = 286
- static music with Editorial = **39**
- static music Editorial coverage = **13.64%**
- short reviewed title guard = PASS
- provider duplicate bindings V2 = PASS
- work story completion guard = PASS
- latest work visible = `Sun Without a Map`
- live Exhibition raw items = **582**

---

# 20. Count Chat 実際の会話品質

すでにProductionで実会話smokeした代表例。

## Back Me

質問：

`Back Meはなんで作ったの？`

Owner Letter sourceから：

- 「隣に立って、行っておいで、と言う音」
- 背中を叩くのでなく、そっと押す

という制作意図を自然に話せる。

## Fuego en la Noche

Owner Letterから：

- quiet/mythic workとのcontrast
- 情熱
- 夜の眠り / 燃える側面
- 館の振れ幅

までowner intentとして話せる。

Technical question：

`どんな楽器？`

はEditorialで埋めずUnknownを維持。

## Görli Garden

作品文脈：

- Berlin park
- freedom
- community
- multicultural coexistence

を話せる。

しかし、

`なぜ作ったの？`

について本人direct motiveが無ければ断言しない。

## Sesoko Island

Owner motiveはGap。

ただし会話は止めず、Countの読みとして遊べる。

## Sun Without a Map

Apple-only最新作。

Previewではoverlay分離のためStory lookupが弱いことがあるが、ProductionではApple overlayがあるためStory route確認済み。

Title / Dance / public factとCuratorial readingを区別。

## OMNI

`何を込めた曲？`

がStory intentとして動くよう一般化済み。

本人のLetterから、

- 「すべて」
- 音楽、書籍、ニュース、独白等を吸収する館の雑食性
- その自負

を話せる。

---

# 21. Work Story intent

現在Story intentとして扱う例：

- どんな曲？
- どういう作品？
- テーマは？
- 何を描いてる？
- 何を表現してる？
- なぜ作った？
- 制作背景は？
- 何を込めた？
- どんな思いを込めた？
- 何を伝えたい？
- what is this song about?
- story behind
- why was this made?
- what was this meant to convey?

OMNI固有branchではない。

---

# 22. Parallel Execution Layer

目的：

> **Chat / Codex / Work / field agentsを並列で動かしながらCanonical repoを壊さない。**

Canonical repoは不変：

`/Users/kagekun/Desktop/musiam-front-clean`

Canonical branch：

`recovery/musiam-clean-20260920`

Parallel worktree root：

`/Users/kagekun/Desktop/MUSIAM_WORKTREES/`

5 lanes：

## knowledge-v2

Tool：

**Codex**

Mission：

- Owner Source Coverage
- Catalog Intelligence
- Count Chat knowledge
- work understanding

Worktree：

`/Users/kagekun/Desktop/MUSIAM_WORKTREES/knowledge-v2`

Branch：

`lane/knowledge-v2`

Fresh lane state：

- head `cd2b1dc978734f06db7b42889740719c36b494ca`
- ahead commits 0
- changed paths []
- tracked dirty []
- lease null
- V2 already integrated into Canonical

## analytics-spine

Tool：

**Codex**

Mission：

- measurement
- funnel
- revenue evidence
- analytics
- conversion instrumentation

Worktree：

`/Users/kagekun/Desktop/MUSIAM_WORKTREES/analytics-spine`

Branch：

`lane/analytics-spine`

Fresh lane state：

- head `0357ee0dee84446eb00b6663024139c1df40d855`
- ahead commits 0
- changed paths []
- clean
- already integrated

## media-os

Preferred：

**ChatGPT Work**

Worktree：

`/Users/kagekun/Desktop/MUSIAM_WORKTREES/media-os`

Branch：

`lane/media-os`

Fresh status at handoff snapshot：

- head `5fbd185a8701b71ce176061cdece747390177427`
- base `6b69804cd988661133158169c1457cede4c3813a`
- ahead commits 1
- scope violations []
- tracked dirty []
- queue not yet entered
- active lane lease existed at snapshot:
  - task `MUSIAM_MEDIA_OS_MVP`
  - owner `codex`
- no remoteHead

Changed paths include：

- `docs/AI/MEDIA_CHANNEL_RESEARCH_2026-09-30.md`
- `docs/AI/MEDIA_OS_MVP.md`
- `docs/AI/MEDIA_VALIDATION_2026-09-30.md`
- `ops/media/...`
- `scripts/media/...`

Do not assume lease is still valid on a later page. Re-run lane status.

## europe-opportunity

Preferred：

**ChatGPT Work**

Worktree：

`/Users/kagekun/Desktop/MUSIAM_WORKTREES/europe-opportunity`

Branch：

`lane/europe-opportunity`

Fresh snapshot：

- head `4f1c3e060d16634b0db62f0bcd7a0fe065794e43`
- base `6b69804...`
- ahead commits 1
- scope violations []
- tracked dirty []
- active lane lease existed:
  - task `MUSIAM_EUROPE_OPPORTUNITY_DESK_V1`
  - owner `codex`
- no remoteHead

Changed paths：

- `docs/AI/EUROPE_EDITORIAL_CANDIDATES_V1.md`
- `docs/AI/EUROPE_OPPORTUNITY_DESK_V1.md`
- `docs/AI/EUROPE_OPPORTUNITY_HANDOFF_V1.md`
- `docs/AI/EUROPE_OPPORTUNITY_RESEARCH_2026-09-30.md`
- `ops/commerce/...`
- `scripts/commerce/...`

## sales-arena

Preferred：

**Codex**

Worktree：

`/Users/kagekun/Desktop/MUSIAM_WORKTREES/sales-arena`

Branch：

`lane/sales-arena`

Fresh snapshot：

- head `342ac98efcf5203680d09efa21d1d348c67ddd26`
- base `6b69804...`
- ahead commits 1
- scope violations []
- tracked dirty []
- active lane lease existed:
  - task `COUNT_CHAT_SALES_ARENA_V1`
  - owner `codex`
- no remoteHead

Changed paths：

- `docs/AI/COUNT_CHAT_SALES_ARENA_V1.md`
- `scripts/sales/arena-v1.mjs`
- Sales Arena scenario/judge fixtures
- validator

---

# 23. Parallel Control Plane rules

Commands：

`node scripts/control-plane/parallel-lanes.mjs status`

`bootstrap`
`acquire`
`test`
`queue`
`merge-next`
`sync`
`publish`

Laneは自分のworktreeを持つ。

Canonicalのみがmerged authority。

**Laneから直接Production deploy禁止。**

Queue条件：

- clean worktree
- committed changes
- valid lane scope
- validation receipt current
- base == canonical HEAD
- no queued path conflict

Merge：

FF-only。

shared path例：

`src/pages/api/chat-experience-v3.ts`

はcollision visibilityを持つ。

Current fresh status：

- queue entries []
- collisions []
- knowledge integrated
- analytics integrated
- media/europe/salesが各1commit ahead

したがって次ページは、

> media/europe/salesを闇雲に再実装せず、既存laneの成果を評価 → sync/test → queue/merge

から考える。

---

# 24. Growth Analytics Spine V1

関連commit：

- `5f2eb05` feat: add privacy bounded growth analytics spine
- `0357ee0` fix: align analytics sink return type
- `f6006fb` chore: record analytics spine production receipt

目的：

Count Chatを壊さず、Server-side funnel measurementの基礎を作る。

現在イベント：

- chat_start
- chat_first_request
- recommendation_presented
- work_links_presented
- action_link_presented
- product_interest_bridge
- product_cta_presented

重要：

これらは**presentation event**。

まだ：

- click
- listen actually happened
- checkout
- paid
- repeat

をclaimしない。

それらは別authorityが必要。

## Privacy boundary

Analytics eventに入れない：

- user text
- assistant text
- names
- email
- address
- IP
- session/conversation ID
- work ID
- work title
- product ID
- URL
- health/personal content

Propertiesは小さいenum/countのみ。

Server generated：

- eventId UUID
- requestId UUID

visitor identityとして使わない。

## Persistence

Upstash/KV reuse。

しかし：

`MUSIAM_ANALYTICS_SPINE_ENABLED=1`

の時だけ保存。

**最新Productionではこのflagは未設定。**

したがって：

> **Analytics Spine V1 code = Production deployed**
> **Analytics persistence = DISABLED**

最新receipt：

`growthAnalyticsSpineV1 = CODE_DEPLOYED_STORAGE_DISABLED`

Storage flag present：

false

Redis namespace when enabled：

`growth:v1:{environment}:count-chat:YYYY-MM-DD`

- env isolated
- bounded rows/day
- ~30 day expiry
- 200ms timeout
- Count response failure-isolated

重要：

次ページで「Analyticsはもう計測中」と誤認しない。

**コードはある。保存はOFF。**

Storage enablementは別Human/operational Gateとして扱う。

---

# 25. MUSIAM Master Strategy LOCK

正本：

`docs/AI/MUSIAM_MASTER_STRATEGY_LOCK_2026-09-30.md`

大規模なLOCK文書。

重要LOCK：

- 月商1億North Star
- autonomous operations
- multi-audience
- multi-commerce
- no-inventory default
- Control Plane first
- Local/Remote/Production parity
- Owner Source Corpus
- generalize, no example-only patches
- Count Chat must be interesting
- humor is variable capability
- Sales strong but not deceptive
- Media + Commerce flywheel
- Europe opportunity can be content
- Human Gate only when truly needed
- 「次」execution protocol
- repairability / rollback / incident learning

TUNABLE：

- exact model
- provider
- tool
- social network
- cadence
- price
- fee
- ad budget
- copy
- exact humor
- exact technical implementation

---

# 26. Commerce strategy LOCK

MUSIAM commerce lanes：

## Art

- Drone
- SHAMAN
- Metal Print
- Visual Art
- collector editions
- B2B interior
- hotel / office / hospitality

## Fashion

- original
- NFC/music-linked
- France/Europe select
- accessories
- collaboration

## Coffee / Lifestyle

- beans
- tools
- cups
- design objects
- local items

## France / Europe rare goods

既存のAI Europe watcherをMUSIAMへ接続。

候補：

- French limited goods
- outlet
- liquidation
- flea-market finds
- Japan unavailable
- vintage
- local craft
- fashion
- price arbitrage
- collector items

しかし：

**安いから仕入れない。**

Deal evaluation：

- acquisition
- sell price
- fees
- shipping
- tax/customs
- returns
- authenticity
- liquidity
- time-to-sell
- legal/platform risk

Default：

**No Inventory**

優先：

1. Concierge / sourcing fee
2. Customer-paid buy-on-demand
3. Preorder
4. supplier reservation
5. consignment
6. dropship if safe
7. affiliate
8. marketplace brokerage
9. proven-demand limited stock

Europe watchで販売できなくても：

> **情報コンテンツとして価値がある。**

Europe FindsとしてMedia化して集客へ使う。

---

# 27. Media strategy LOCK

Media pillars：

## Letters

raw signal。

- travel
- emotion
- creation
- daily observation
- Europe discoveries
- culture

## Intelligence Underground

refined/deep：

- AI
- science
- philosophy
- future
- technology
- culture
- society

## Europe Finds

Commerce discovery media。

- cheap/underpriced
- rare
- strange
- beautiful
- new brands
- antiques
- design
- coffee
- fashion

One source idea：

```
Letter
→ IU seed
→ website
→ X / Threads
→ Instagram
→ carousel
→ short video script
→ TikTok/Reels/Shorts
→ Newsletter
→ related work/product CTA
```

同じ文章の全SNSコピペは禁止。

MUSIAM人格は一つ。媒体文法を変える。

MediaがCommerceを恥じない。
CommerceがMediaを殺さない。

---

# 28. Audience / Growth North Star

現在プロダクト内部はかなり改善した。

次の巨大ボトルネック：

> **圧倒的集客**

Audience対象：

- music listeners
- art collectors
- interior buyers
- hotels
- restaurants
- wellness
- fashion
- coffee
- France lovers
- Europe travelers
- rare goods hunters
- AI/science
- philosophy
- creators
- design

Growth channels：

- SEO
- Social
- YouTube
- Shorts
- Newsletter
- Partnerships
- PR
- referral
- paid after conversion proof

広告は：

Organic反応
→ conversion path
→ unit economics
→ small test
→ scale

の順。

---

# 29. Sales Superhuman Program

目標：

> **人間の優秀な営業マンを実測で超える。**

自己申告禁止。

Sales Arenaで比較。

評価：

- factual accuracy
- understanding
- recommendation
- value articulation
- objection handling
- close
- follow-up
- charm
- humor/naturalness
- stop condition
- tool correctness
- hallucination
- conversion
- AOV
- repeat
- satisfaction
- complaints/refunds

短期CVRだけを最大化しない。

信頼を壊す押し売りは失敗。

Sales Bible / Sales Agent instructionsは教材。

**台詞集をruntimeで暗唱させない。**

Current sales-arena laneには：

- `COUNT_CHAT_SALES_ARENA_V1.md`
- arena runner
- scenario fixture
- judge fixture
- validator

が1commit aheadで存在。

次ページはここをゼロから作らず、既存laneを評価する。

---

# 30. Tool assignment — 正式方針

## このChat

**MUSIAM Orchestrator / CEO Room**

担当：

- 全体priority
- lane選択
- Gate
- merge判断
- quality judgement
- Preview/Production
- receipt
- cross-lane integration

## Codex

repo/data/evaluation heavy：

- Knowledge coverage
- Catalog Intelligence
- Sales Arena
- Analytics
- test harness
- data mining
- APIs
- automation

## ChatGPT Work

web/research heavy：

- Media research
- SEO
- social strategy
- trend
- Europe products
- competitor research
- partnerships
- PR
- sourcing research

## OpenClaw

使える環境なら：

**Field Observer / external state witness**

- price changes
- page changes
- stock
- social
- search results
- browser UI checks

しかしOpenClaw出力をTruthそのものにしない。

EvidenceとしてControl Planeへ返す。

## Skills

未完成workflowを早くSkill化しない。

2〜3回成功したもの：

- Owner Source Enrichment
- Europe Deal Evaluator
- Letter → SNS Atomizer
- Release Audit
- Sales Critic

等をSkill化候補にする。

---

# 31. Control Plane — 現在の運用

Control Plane scripts：

- `scripts/control-plane/source-parity.mjs`
- `scripts/control-plane/drift-check.mjs`
- `scripts/control-plane/lease.mjs`
- `scripts/control-plane/parallel-lanes.mjs`
- `scripts/control-plane/validate-control-plane.mjs`

Config：

`ops/control-plane/config.json`

Latest Production receipt：

`ops/control-plane/latest-production-receipt.json`

## Three-way truth

必ず分ける：

1. Local
2. Remote Git
3. Production

`local commit == remote == Production`

を推測しない。

## Safe deploy

raw dirty working tree deploy禁止。

```
committed authority
→ synthetic source
→ protected/human/env/private exclusion
→ manifest + SHA
→ Preview
→ smoke
→ Production
→ receipt
```

## Release receiptに最低必要

- runtime source commit
- manifest SHA
- Preview deployment
- Production deployment
- previous Production
- critical route smoke
- error/fatal
- 5xx
- rollback availability

## Drift

最新fresh receipt上：

Production runtime source：

`0357ee0dee84446eb00b6663024139c1df40d855`

Canonical HEAD：

`f6006fb3604ed61fbff277b89ebea38a0f150aee`

この差は：

- Coverage V2 receipt
- Analytics receipt
- non-runtime/control-plane

を含む。

`drift-check` で分類する。

---

# 32. 主要commit timeline

重要commitを履歴順に把握する。

## Apple / Live Catalog / Recall

- `94aa6e2` Apple automatic release overlay
- `247267e` .vercelignore safety
- `4bfe2b0` runtime data scope / Preview isolation
- `eaf32db` Production readiness
- `c928927` Apple Production enablement receipt
- `4e05173` natural title reference
- `809e7e4` live works + recall search
- `48c7781` recall response budget

## Master strategy / Control Plane

- `1e8431a` Master Strategy LOCK
- `c4d4624` Control Plane
- `cbb3957` source parity baseline

## Catalog Intelligence

- `5073945` catalog intelligence facets
- `f255d68` conversational facet recommendations
- `cb65768` language intelligence expansion
- `22e86a0` multilingual refinement
- `9ddcbb3` medium intent / voice
- `495ded9` centralized work medium classifier
- `a4b3369` Catalog Intelligence Production receipt

## Owner Source

- `ed3e5c6` Owner Source Corpus Probe
- `f402d98` Owner Source Corpus Index
- `d45fda5` owner source tooling classified non-runtime
- `b61ba8a` knowledge envelopes
- `412d34b` reviewed editorial duplicate resolution
- `d45870c` evidence-grounded work story polish
- `6378ec2` owner knowledge Production receipt
- `54c33ab` Coverage V1
- `44fc165` Work Story intent expansion
- `04ef149` provider duplicate bindings
- `359bc73` Coverage V1 Production receipt

## Parallel layer / V2 / Analytics

- `f35bb1c` parallel execution layer
- `6b69804` parallel baseline
- `546af82` Coverage V2
- `e59c673` Coverage V2 hardening
- `358a75e` incomplete story guard
- `cd2b1dc` post-merge lane resync
- `c4daf9d` Coverage V2 Production receipt
- `5f2eb05` privacy-bounded analytics spine
- `0357ee0` analytics sink return type
- `f6006fb` analytics Production receipt

---

# 33. 最新Productionで未完了の重要事項

## Analytics storage OFF

Code deployed。

しかし：

`MUSIAM_ANALYTICS_SPINE_ENABLED`

未設定。

したがってPersistence disabled。

次に有効化する場合は：

- Production env
- storage namespace
- privacy
- bounded retention
- failure isolation
- no PII
- authoritative action semantics

を再確認してHuman/operational Gateとしてenable。

勝手にONにしない。

## Real downstream funnel未接続

現在Count serverが知るのはpresented events。

まだ真の：

- click
- actual listen
- checkout
- paid
- repeat

は未接続。

月商1億へ進む上で重要。

## Apple autonomous natural cron audit

Initial/manual Production syncは確認済み。

自然cron後の：

- execution 200
- overlay persistence
- duplicateなし
- latest correct
- customer side effectsなし

は定期監査価値あり。

## historical unresolved 62

急ぎではない。

stable identity cleanup。

最新自動追随は正常なので、Product価値優先度は低い。

## Latest Apple-only work knowledge

Recent作品はgeneric cover brief / operational logしか無いことが多い。

最新だからといって制作意図を捏造しない。

Owner/Suno/Chat original sourceが見つかったものから昇格。

---

# 34. Media / Europe / Sales lane — 次ページで最優先確認

Fresh snapshotでは3 laneが1commit ahead。

## media-os

まず読む：

- `docs/AI/MEDIA_CHANNEL_RESEARCH_2026-09-30.md`
- `docs/AI/MEDIA_OS_MVP.md`
- `docs/AI/MEDIA_VALIDATION_2026-09-30.md`

実装：

- source schema
- drafts
- pipeline
- tests
- validation

次ページでは：

1. lane leaseがactiveかexpiredか確認
2. current Canonicalとの差分をsync可能か確認
3. lane validation実行
4. content qualityを人間目線で確認
5. queue
6. merge

Workに同じMedia OSを最初から再作成させない。

## europe-opportunity

読む：

- `EUROPE_OPPORTUNITY_DESK_V1.md`
- `EUROPE_OPPORTUNITY_HANDOFF_V1.md`
- `EUROPE_OPPORTUNITY_RESEARCH_2026-09-30.md`
- `EUROPE_EDITORIAL_CANDIDATES_V1.md`

すでに：

- candidate schema
- candidate records
- desk config
- validation
- script/test

がある。

目的：

Europe watcherを：

- content
- concierge
- zero-inventory commerce
- opportunity score

へ接続。

次ページでは既存laneをreview → validate → merge。

## sales-arena

読む：

`docs/AI/COUNT_CHAT_SALES_ARENA_V1.md`

既に：

- arena-v1 runner
- scenarios
- judge fixture
- validator

がある。

次ページでは、

- current Count Chat baseline
- charm
- accuracy
- objection handling
- stop conditions
- sales progression

を評価。

単に「人間を超えた」と宣言しない。

---

# 35. 推奨する次の実行順

次ページでの最適な順番。

## STEP 1 — 3 lane成果を回収

`parallel-lanes status`

をfresh実行。

media / europe / salesの：

- lease
- changed paths
- base
- canonical conflict
- validation

を確認。

既存commitを読む。

ゼロから再実装しない。

## STEP 2 — Analytics enablement判断

Analytics codeは本番済みだがstorage OFF。

先に3 lane mergeを進めてもよい。

ただしGrowth戦略を本格化する前には：

`MUSIAM_ANALYTICS_SPINE_ENABLED=1`

をenableするか判断。

enableするならPreview/Productionで：

- event count
- Redis namespace
- PII zero
- response unchanged
- failure isolation

を確認。

## STEP 3 — media-os merge

内容qualityが良ければ最初にmerge候補。

理由：

圧倒的集客が今後の巨大ボトルネック。

## STEP 4 — europe-opportunity merge

Europe Finds / zero inventory / concierge。

集客とCommerceを同時に増やす。

## STEP 5 — sales-arena merge

Count Chat Salesの評価基盤。

売上を増やす前に：

- charm
- correctness
- stop
- CTA
- close

を測る。

## STEP 6 — Growth Measurementを実actionまで拡張

presentationではなく：

- click
- listen/open
- checkout
- settled paid
- repeat

へ。

ただしauthorityあるsystemだけから取る。

## STEP 7 — Knowledge Coverage V3はバックグラウンドlaneへ

Knowledgeは重要だが、全354曲理解まで他Laneを止めない。

優先：

- high traffic
- high ask frequency
- commercially important
- iconic
- new + strong owner source

---

# 36. 「次」protocol

伯爵が：

`次`

と送った場合：

計画だけ返して止まらない。

原則：

```
state check
→ choose bottleneck
→ inspect existing lane
→ implement/validate
→ critic
→ fix
→ Preview
→ smoke
→ merge/promote if safe
→ receipt
→ next safe Gate
```

本当に止まるのは：

- significant spend
- contract
- irreversible deletion
- mass outbound
- major ad spend
- legal decision
- major Production architecture
- owner-only creative decision
- system-required explicit approval

routine workは先へ進む。

---

# 37. 重要な「再発防止」一覧

この会話で実際に起きた失敗と、現在のguard。

## UI/API parity gap

API 582だが `/works` 420。

Guard：

実画面smoke。

## natural title miss

`Sun Without a Mapってどんな曲？` 未認識。

Guard：

natural title fixture。

## fuzzy recall gap

`瀬底島の曲なんだっけ？`

Guard：

Recall layer + Catalog ID revalidation。

## German-only patch risk

Guard：

Catalog Intelligence general facets。

## geography vs language confusion

BRANDENBURGER TORをGerman-language扱いしない。

Guard：

language / country / region / place分離。

## response-language vs work-language

`日本語で答えて`

Guard：

language intent context。

## 日本語の「本」誤爆

Guard：

centralized medium classifier。

## Korean title stripped

LLM sanitizerがHangulを削除。

Guard：

deterministic catalog copyはLLM sanitizerを通さない。

## Work Story vs sonic

`どんな曲？` が楽器Unknown branchへ。

Guard：

Work Story intent分離。

## AI draft → owner intent risk

Guard：

Owner Source classes / Index / reviewed packet。

## duplicate provider ID

Chatはknowledgeあり、Exhibition別IDでdescription空。

Guard：

stable provider URL/release dateによるexplicit binding。

## short title false match

ME / Pan。

Guard：

explicit-title context only。

## incomplete LLM response

Holy God truncated。

Guard：

generic Work Story completion validator + fallback。

## parallel writer collision

Guard：

worktrees / lane lease / scope guard / merge queue。

## local/remote/prod drift

Guard：

source-parity / drift-check / release receipt。

---

# 38. Current files that are strategic authorities

必ず優先して読む。

1. `docs/AI/MUSIAM_MASTER_STRATEGY_LOCK_2026-09-30.md`
2. `docs/AI/MUSIAM_FULL_HANDOFF_2026-09-30.md`
3. `docs/AI/MUSIAM_CONTROL_PLANE_RUNBOOK.md`
4. `docs/AI/MUSIAM_PARALLEL_EXECUTION_LAYER.md`
5. `ops/control-plane/latest-production-receipt.json`
6. `docs/AI/CATALOG_INTELLIGENCE_GRAPH_V1.md`
7. `docs/AI/OWNER_SOURCE_CORPUS_PROBE.md`
8. `docs/AI/OWNER_SOURCE_CORPUS_INDEX_V1.md`
9. `docs/AI/OWNER_SOURCE_KNOWLEDGE_ENVELOPE_V1.md`
10. `docs/AI/OWNER_SOURCE_KNOWLEDGE_COVERAGE_V1.md`
11. `docs/AI/OWNER_SOURCE_KNOWLEDGE_COVERAGE_V2.md`
12. `docs/AI/ANALYTICS_SPINE_V1.md`

過去handoffは歴史資料。

Current stateはこのhandoff + latest receipt優先。

---

# 39. 次ページへ渡す最短要約

次ページで長文を全部読み直す時間が無い場合でも、最低これだけは保持。

- MUSIAMは月商1億を目指すAI自律文化商業圏
- このChat = Orchestrator / CEO room
- Codex = engineering/data/evaluation
- Work = research/media/market
- OpenClaw = field observer
- Canonical repo = `/Users/kagekun/Desktop/musiam-front-clean`
- branch = `recovery/musiam-clean-20260920`
- fresh pre-handoff-doc HEAD = `f6006fb...`
- Production = `dpl_4LNUvTF...` READY
- Production runtime = `0357ee0...`
- Apple live catalog = 582 raw / 488 unique display
- latest = Sun Without a Map
- Count Chat natural title / recall / multilingual discovery / Work Story稼働
- Editorial Knowledge = 52 rows
- static music coverage = 39/286 = 13.64%
- Knowledge Coverage V2 = PASS_PRODUCTION
- Parallel Layer = active
- Knowledge lane integrated
- Analytics lane integrated
- Media / Europe / Sales each 1 commit ahead
- Analytics code in Production, storage OFF
- Human-owned dirty 2 files = do not touch
- protected daily roots = do not inspect
- next priority = existing 3 lane outcomesをreview/validate/merge、Growth measurementを実actionへ、Audience強化

---

# 40. NEXT PAGE START PROMPT

次ページ冒頭で以下の意図として扱う：

> MUSIAMの前ページ作業を継続する。最初から再設計しない。
> `MUSIAM_FULL_HANDOFF_2026-09-30.md` と `MUSIAM_MASTER_STRATEGY_LOCK_2026-09-30.md`、latest Production receiptをauthorityとして、まずControl Plane / parallel lane statusをfresh確認する。
> Knowledge V2とAnalytics Spine V1はCanonicalへ統合済み。Media OS / Europe Opportunity / Sales Arenaは既存lane成果をゼロから再作成せず、現在のcommit・lease・scope・validationを確認して回収する。
> Local / GitHub / Production parityを守り、Human-owned dirtyとprotected rootsへ触れない。
> 伯爵Chatは硬いFAQ botへ戻さず、Truth + Playを維持する。
> 作品sourceが薄い時も会話は止めないが、架空のowner biography/lyrics/instrumentsを作らない。
> 目標は圧倒的集客・強い営業・多層Commerce・Media・Analytics・AI自律運営を並列化し、月商1億の制約を順番に潰すこと。
> ユーザーが「次」と言ったら、計画だけで止まらず、実装・検証・Preview・safe merge/promoteまで進め、Human Gateだけ返す。

---

# 41. 最終引き継ぎ判定

このページでMUSIAMは、

```
STATIC CATALOG REPAIR
→ APPLE LIVE CATALOG
→ LIVE /works
→ TITLE / RECALL
→ GENERAL CATALOG INTELLIGENCE
→ OWNER SOURCE CORPUS
→ KNOWLEDGE ENVELOPE
→ COVERAGE V1
→ PARALLEL EXECUTION
→ COVERAGE V2
→ GROWTH ANALYTICS SPINE V1
→ MEDIA / EUROPE / SALES LANES STARTED
```

まで進んだ。

次ページの仕事は、

> **「作品理解の基礎を作り直す」ことではなく、既にできた基盤を使ってAudience / Commerce / Sales / Analyticsを並列で伸ばすこと。**

これが最重要。

**END OF HANDOFF — 2026-09-30**
