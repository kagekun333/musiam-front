# Step 1 キット（musiam-front）

このZIPを展開して、プロジェクト直下に上書き/追加してください。
追加後、以下のコマンドでコミット規約（commitlint + husky）をセットアップします。

## 使い方（最短）
```bash
# 1) 依存パッケージの導入（Node が必要）
npm install --save-dev @commitlint/cli @commitlint/config-conventional husky

# 2) husky 初期化 & commit-msg フック設定
npx husky install
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'

# 3) 設定ファイルとテンプレートをコミット
git add .github commitlint.config.cjs
git commit -m "chore: add issue/pr templates and commitlint (Step1 kit)"
git push
```

## コミットメッセージ例（Conventional Commits）
- `feat: 展示ゲートのカードを追加`
- `fix: 画像パスの誤りを修正`
- `docs: READMEを更新`
- `chore: lint設定を調整`

## 付属スクリプト（任意）
- `scripts/setup-step1.sh` : 上記のセットアップを一括実行（macOS/Linux）
- `scripts/setup-step1.ps1`: Windows PowerShell 版

実行前に、必要に応じて `npm` / `git` コマンドが使える環境であることを確認してください。
