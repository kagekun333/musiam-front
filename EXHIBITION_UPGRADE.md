# Exhibition ページ大幅改善 - 実装サマリー

## 概要

/exhibition ページをギャラリー品質のUIに刷新し、作品追加を1コマンドで完了できるようにしました。

## 変更したファイル一覧

### 新規作成
- `content/exhibits/` - 作品データを管理するディレクトリ
- `content/exhibits/example.md` - サンプルMDファイル
- `content/exhibits/.gitkeep` - ディレクトリ説明
- `scripts/build-exhibits.ts` - MD→JSON変換ビルドスクリプト
- `scripts/add-exhibit.ts` - 対話式作品追加CLI
- `EXHIBITION_UPGRADE.md` - このファイル

### 更新
- `src/pages/exhibition.tsx` - UI刷新（検索、フィルタ強化、ギャラリーデザイン）
- `package.json` - スクリプト追加（`add:exhibit`, `build:exhibits`）
- `README.md` - 作品追加手順を記載

## 実装内容

### 1. UI刷新

#### 検索機能
- タイトル・タグでリアルタイム検索
- 🔍アイコン付き検索ボックス

#### フィルタ & ソート
- Type フィルタ（all/music/video/art/book/article）
- Tag フィルタ（動的にタグ一覧生成）
- ソート：Newest First / Oldest First / By Weight / Random

#### ギャラリーデザイン
- レスポンシブグリッド（minmax(280px, 1fr)）
- カードホバー演出（上に浮く + シャドウ）
- 画像ホバーでズーム効果
- 1:1 サムネイル（統一感）
- ボタン化されたリンク（Spotify緑、YouTube赤、Amazon橙など）
- タグ表示（最大3個）
- 検索結果件数表示

#### デザイン改善
- 余白：60px 上下、24px 左右
- タイポ：大きめヘッダー（48px）、letter-spacing調整
- カラー：#0a0a0a 背景、#222 ボーダー
- WOWセクション：大きなヒーロー画像/動画

### 2. 作品追加のしやすさ

#### 方法1: CLI（推奨）

```bash
pnpm run add:exhibit
```

対話的に入力：
1. Title
2. Type (music/video/art/book/article)
3. Cover URL/path
4. Tags（カンマ区切り）
5. Release date
6. Weight（優先度）
7. Links（Spotify, YouTube, Amazon, NFT）
8. Preview video URL
9. Mood tags

→ `content/exhibits/{slug}-{timestamp}.md` が自動生成される

#### 方法2: 手動でMDファイル作成

`content/exhibits/my-work.md`:

```markdown
---
title: "My Work"
type: "music"
cover: "/works/covers/my-work.jpg"
tags:
  - "ambient"
  - "electronic"
releasedAt: "2025-02-07"
weight: 100
links:
  listen: "https://open.spotify.com/..."
  watch: ""
  read: ""
  nft: ""
previewUrl: ""
moodTags:
  - "静けさ"
---

# My Work

Description here.
```

#### ビルド & デプロイ

```bash
# 1. MDファイルをJSONに変換
pnpm run build:exhibits

# 2. ローカルテスト
pnpm dev

# 3. コミット & デプロイ
git add .
git commit -m "Add new exhibition work"
git push
```

### 3. データ管理

#### ビルドフロー
1. `content/exhibits/*.md` → frontmatter解析
2. `public/works/works.json` 既存データと統合
3. IDが同じ場合は上書き（MDが優先）
4. releasedAt降順でソート
5. JSONファイル更新

#### データ形式

```typescript
type Work = {
  id: string;
  title: string;
  type: "music" | "video" | "art" | "book" | "article";
  cover: string;
  tags?: string[];
  links?: {
    listen?: string;
    watch?: string;
    read?: string;
    nft?: string;
  };
  releasedAt?: string; // YYYY-MM-DD
  weight?: number;
  previewUrl?: string;
  moodTags?: string[];
};
```

## 使い方（コピペ可能）

### 新しい作品を追加

```bash
cd /path/to/musiam-front

# CLIで追加
pnpm run add:exhibit

# ビルド
pnpm run build:exhibits

# 確認
pnpm dev
# → http://localhost:3000/exhibition を開く

# デプロイ
git add content/exhibits/ public/works/works.json
git commit -m "Add exhibition work: [作品名]"
git push
```

### 既存作品を更新

1. `content/exhibits/` 内の対応する `.md` ファイルを編集
2. `pnpm run build:exhibits` でJSON再生成
3. コミット & プッシュ

### 作品を削除

1. `content/exhibits/` 内の `.md` ファイルを削除
2. `public/works/works.json` から該当エントリを手動削除
3. コミット & プッシュ

## 注意事項

### pnpm運用
- CIで `pnpm` を使用している場合、以下をCIスクリプトに追加：

```yaml
# .github/workflows/build.yml（例）
- name: Build exhibits
  run: pnpm run build:exhibits
```

### 既存データの扱い
- 既存の `public/works/works.json` は保持されます
- `content/exhibits/*.md` のデータが優先されます
- IDが重複する場合、MDファイルが上書きします

### カバー画像
- 推奨サイズ：1200x1200px 以上
- 形式：jpg, png
- パス：`/works/covers/` または絶対URL

## トラブルシューティング

### スクリプトが動かない

```bash
# node_modulesを再インストール
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 権限エラーの場合
chmod +x scripts/*.ts
```

### ビルドエラー

```bash
# TypeScriptエラーを確認
pnpm typecheck

# フォーマット確認
pnpm lint
```

### UIが表示されない

1. ブラウザのキャッシュをクリア
2. `/works/works.json` が正しく生成されているか確認
3. コンソールエラーを確認

## 今後の拡張アイデア

- [ ] MDファイルからカバー画像も自動ダウンロード
- [ ] タグの自動補完
- [ ] プレビュー動画の自動生成
- [ ] 複数言語対応
- [ ] ページネーション or infinite scroll
- [ ] 詳細ページ（/exhibition/[id]）

## まとめ

✅ UI刷新：ギャラリー品質のデザイン、検索・フィルタ・ソート
✅ 追加簡易化：1コマンド or 1ファイルで作品追加
✅ pnpm運用：CI/CDに対応
✅ 既存データ保持：既存の works.json と共存

これで /exhibition ページが本格的なギャラリーになりました！
