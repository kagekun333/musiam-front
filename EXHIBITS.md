# Exhibition: 作品追加ガイド

## 作品追加手順

### 1. CLIで追加（推奨）

```bash
pnpm run add:exhibit
```

対話形式でタイトル / タイプ / カバー画像 / リリース日 / タグ / リンク等を入力。
`content/exhibits/<slug>.md` が生成されます。

### 2. JSONをビルド

```bash
pnpm run build:exhibits
```

`content/exhibits/*.md` を読み取り、`public/works/works.json` に統合します。
ビルド完了時にバリデーションサマリ（件数一致 / リンク欠損 / 日付パース）がログに出力されます。

### 3. プレビュー

```bash
pnpm dev
# ブラウザで http://localhost:3000/exhibition を開く
```

### 4. コミット＆デプロイ

```bash
git add .
git commit -m "chore: add exhibit <title>"
git push
```

---

## 手動で追加する場合

`content/exhibits/<slug>.md` を直接作成します。

### Frontmatter スキーマ

```yaml
---
# === 必須 ===
title: "作品タイトル"
type: "music"           # music | book | video | art | article | nft | other
cover: "/works/covers/image.jpg"   # public/配下のパス or URL
releasedAt: "2025-01-15"           # YYYY-MM-DD

# === 任意 ===
tags:
  - "spotify"
  - "single"
  - "gospel"
description: "短い説明文"
aspect: "1:1"           # 1:1 | 2:3 | 3:4 | 4:3 | 16:9 | auto
                        # book → 2:3推奨、music → 1:1推奨
links:
  listen: "https://open.spotify.com/album/xxx"
  watch: "https://youtube.com/watch?v=xxx"
  read: "https://www.amazon.co.jp/dp/xxx"
  nft: "https://opensea.io/xxx"
href: "https://example.com"        # フォールバックURL
priority: 0             # 高いほど上に表示
---
```

### アスペクト比ルール

| type    | デフォルト | 補足                        |
|---------|----------|---------------------------|
| book    | 2:3      | **1:1にしない**（縦長優先）     |
| music   | 1:1      | アルバムジャケットは正方形が基本    |
| video   | 16:9     |                           |
| art     | 4:3      |                           |
| article | 16:9     |                           |

`aspect` フィールド or タグ (`aspect:2:3`, `square`, `portrait`, `landscape`) で上書き可能。

---

## スクリプト一覧

| コマンド                    | 説明                              |
|---------------------------|-----------------------------------|
| `pnpm run add:exhibit`    | 対話式CLIで作品追加                   |
| `pnpm run build:exhibits` | MD → JSON ビルド + バリデーション      |
| `pnpm dev`                | ローカル開発サーバ起動                 |
| `pnpm run typecheck`      | TypeScript型チェック                |
| `pnpm run build`          | プロダクションビルド                   |
