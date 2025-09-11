# Step 4: release-please（タグ / GitHub Release / CHANGELOG 自動化）

## これでできること
- Conventional Commits を解析して、**CHANGELOG.md** / **リリースPR** / **タグ** / **GitHub Release** を自動生成します。
- `main` に push されるたびにリリースPRを最新化。マージすると正式リリース（タグ & Release 作成）。

## インストール
1) このフォルダをプロジェクト直下に上書きコピー（`.github/workflows/release-please.yml` 追加）
2) コミット＆プッシュ:
```bash
git add .github/workflows/release-please.yml
git commit -m "ci: add release-please workflow"
git push
```

## 使い方
- `main` に Conventional Commits（例: `feat:` / `fix:`）でコミット→push
- GitHub の **Pull requests** に `chore(main): release musiam-front <version>` という **リリースPR**が自動生成/更新されます
- 内容を確認して **Merge** すると、**タグ / GitHub Release / CHANGELOG.md** が自動で作成されます

## 権限
- `permissions: contents: write` と `pull-requests: write` は GITHUB_TOKEN 標準でOK（Secrets不要）

## 注意
- 初回はバージョン `0.1.0` などから開始されます（コミット履歴により変動）。
- セマンティックバージョン：`feat`=MINOR、`fix`=PATCH、`BREAKING CHANGE:`（コミット本文）=MAJOR として扱われます。
