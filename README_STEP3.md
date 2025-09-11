
# Step 3: 週次ダイジェスト（GitHub Actions）

このワークフローは、毎週月曜の朝（Berlin 09:00 夏 / 08:00 冬 相当）に、直近7日間のコミットを集計して Issue を自動作成します。
手動でも `Actions > weekly-digest > Run workflow` で実行できます。

## インストール
1) このフォルダをリポジトリ直下に上書きコピー（`.github/workflows/weekly-digest.yml` 追加）
2) コミット＆プッシュ

```bash
git add .github/workflows/weekly-digest.yml
git commit -m "ci: add weekly digest workflow"
git push
```

## 何が起きる？
- `git log --since='7 days ago'` の一覧を `digest.md` に出力
- `peter-evans/create-issue-from-file@v5` で Issue を自動作成（ラベル: `report`）
- 次週のためのチェックボックス雛形を自動で付与

## 時刻について
- GitHub Actions の `cron` は UTC で動きます。
- デフォルト設定 `0 7 * * 1` は、Berlinの **夏時間=09:00**, **冬時間=08:00** に相当します。
- 必要であれば `cron` の時刻をお好みで変更してください。

## （任意）要約をGPTに通したい場合
- まずはこの素の版で運用を安定させてください。
- 後で OpenAI の要約を入れる場合は、環境変数 `OPENAI_API_KEY` をリポジトリ Secrets に追加し、
  その後に要約ステップを1つ足します（必要になったらサンプルを渡します）。
