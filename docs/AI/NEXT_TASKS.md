# 伯爵MUSIAM — Next Tasks

最終監査: 2026-09-20。これは実行候補の短いbacklogであり、外部送信、支払い、公開、vendor発注、承認記録の変更はHuman Gateを要する。

## [P0] 大規模working treeをState Lockし、作業単位を確定する

**目的・理由：** 追跡済み102ファイル（15,505追加／11,822削除）と多数の未追跡成果物が混在し、現在のブランチは `codex/fix/stripe-metal-print-webhook-20260914` である。内容を読まずに次の実装を始めると、既存作業を上書き・混入させる危険がある。

**対象範囲：** `git status --short` に現れる各トップレベル領域、特に `src/`、`scripts/`、`public/works/`、`ops/`、`docs/`。今回の `docs/AI/` は明確に別作業として扱う。

**やること：** 所有者または直前の作業単位ごとに変更を分類し、保護対象、今回変更してよい対象、未解決の差分を短いState Lockへ記録する。必要なら既存作業の担当者が対象単位で検証する。

**やらないこと：** `git reset`、一括format、無差別stage/commit、既存の未追跡成果物の削除、巨大diffの無目的な読解。

**完了条件：** 次の変更対象が既存dirtyと区別され、対象外のpathを触れない状態になる。差分の正しさは個別taskの検証で扱う。

**推奨モデル：** Terra

**推奨Reasoning：** medium

## [P1] 現在ブランチのMetal Print webhook修正を安全に検証する

**目的・理由：** 現在ブランチは `codex/fix/stripe-metal-print-webhook-20260914` で、決済状態遷移は金銭・在庫に直結する。静的監査では未commit差分、テスト、production反映を確認できていない。

**対象範囲：** `src/app/api/metal-print/webhook/route.ts`、`src/lib/metal-print-redis.server.ts`、関連validator、Vercelの対象deployment。

**やること：** State Lockとしてgit状態と対象diffを確認し、署名不正・非対象event・paid・expired・refundのローカル/fixture検証を実行する。必要なら最小の回帰テストを追加する。外部Stripe/Vercelへの実行・デプロイは明示承認後に一度だけcanaryする。

**やらないこと：** offer価格、承認台帳、実Stripeの注文・返金、Redis実データの改変。

**完了条件：** 対象diffが説明可能、静的検証と関連テストがPASS、未実施のprovider canaryは明記される。production確認は別Human Gateとして記録する。

**推奨モデル：** Astra

**推奨Reasoning：** high

## [P1] デジタル商品の販売開始可否を決め、未承認ならfail-closedを維持する

**目的・理由：** デジタル販売経路は実装済みだが、releaseの `approvedAt` とsandbox verificationは未設定で、運用台帳も直接販売承認0を示す。

**対象範囲：** `src/lib/digital-products.ts`、`src/lib/digital-delivery-releases.server.ts`、`src/lib/digital-order.server.ts`、`src/app/api/shop/*`、該当商品ファイル・terms・Stripe sandbox evidence。

**やること：** 商品ごとに配布物hash、利用条件、Stripe product/price、sandbox checkout・download、返金、receiptを照合し、オーナーに承認対象を提示する。承認を受けた商品だけに最小のrelease記録を追加する。

**やらないこと：** 本番価格変更、本番Checkout開始、外部告知、承認の推測。

**完了条件：** 各商品が `approved` / `HOLD` と根拠付きで判定され、HOLD商品はcheckout不可のまま。販売開始は明示Human Gate後にのみ検証される。

**推奨モデル：** Astra

**推奨Reasoning：** high

## [P1] Metal Printの実証gateを進める

**目的・理由：** assuranceはHOLDで、実績売上、physical proof、qualified pipeline、production E2Eが不足している。コード拡張では解除できない。

**対象範囲：** `ops/metal-print-vip/assurance-audit-current.json`、proof/vendor/economics ledger、相談・funnel集計、`src/app/api/metal-print/*`。

**やること：** 現在の証拠を再読して最初に満たす1 gate（通常はHuman-approved physical proofまたは実在相談）を特定し、必要な人間承認・provider操作・記録様式を準備する。実施後に既存auditを再実行する。

**やらないこと：** 数値目標の緩和、候補原価/テスト結果を実測値として記録、無断のvendor発注・決済・公開。

**完了条件：** 1 gateが一次証拠で更新される、または外部入力待ちをHOLDとして明確化。HOLD解除は全required gateの再監査でのみ判断する。

**推奨モデル：** Astra

**推奨Reasoning：** high

## [P2] SSD未mount状態のカタログ補完を再確認する

**目的・理由：** 継続運用台帳はSSDを `NOT_MOUNTED` と記録しており、cacheは現在の媒体バイトの証明ではない。

**対象範囲：** `scripts/gen-works-ssd.mjs`、`public/works/works-ssd.json`、mount済みの `/Volumes/PortableSSD/...`、catalog validator。

**やること：** SSDをzero-copyでmountできる状態を人間が確認後、生成スクリプトと限定validatorを実行し、ID保持差分をレビューする。

**やらないこと：** SSD素材のリポジトリへのcopy、`works.json`の置換、未mount cacheを現在値として扱うこと。

**完了条件：** mount・入力・生成時刻・対象件数が記録され、主マスタが不変であることを確認する。

**推奨モデル：** Terra

**推奨Reasoning：** medium

## [P2] カタログの公開推薦ready状態を小さく拡張する

**目的・理由：** 連続運用台帳では公開canonical 434件のうち、metadata-only / unknownが残り、次gateは少数作品のclaim-limited eligibility確認になっている。

**対象範囲：** `public/works/catalog-readiness.json`、`public/works/content-evidence.json`、`ops/catalog-intelligence/`、対象作品の一次素材。

**やること：** 1〜3作品を選び、一次素材または公開editorial根拠を収集・検証して、推薦可能な主張を最小限で更新する。

**やらないこと：** AI推測をcontent evidence化、全カタログの一括書換え、未確認作品の公開推薦。

**完了条件：** 各更新がasset/公開根拠・review日時・限定された主張を持ち、catalog validatorがPASSする。

**推奨モデル：** Terra

**推奨Reasoning：** medium

## [P3] このAI引き継ぎ資料を変更時にだけ差分更新する

**目的・理由：** docsは再探索コストを下げるための索引であり、運用台帳の複製ではない。

**対象範囲：** `docs/AI/*.md`。

**やること：** architecture boundary、承認状態、route、重大な実証gateが変わった時だけ、確認済み/推測/不明を保ったまま短く更新する。

**やらないこと：** セッションログの転載、秘密値の記録、実施していない本番結果の追記。

**完了条件：** 変更に対応する根拠pathがあり、古い主張が残っていない。

**推奨モデル：** Luna

**推奨Reasoning：** low
