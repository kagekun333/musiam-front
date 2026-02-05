# Lighthouse計測ガイド - チケット#1完了確認

## 目的
画像最適化（31.77MB→877KB, 97.3%削減）の効果を実測値で確認

## 計測手順

### 1. デプロイ確認
```bash
# 変更をデプロイ
git push origin main

# Vercel自動デプロイ完了を待つ（約2-3分）
# https://hakusyaku.xyz/ で確認
```

### 2. Network確認（DevTools）
1. Chrome DevToolsを開く（F12）
2. Networkタブを選択
3. Disableキャッシュをチェック
4. ページをリロード
5. 以下を確認：

**期待値：**
- ✅ `galaxy.webp` (type: webp, size: ~187KB)
- ✅ `gothic-door.webp` (type: webp, size: ~164KB)
- ✅ `torii.webp` (type: webp, size: ~146KB)
- ✅ `abi-seal.webp` (type: webp, size: ~44KB)
- ❌ `*.png` または `*.jpg` のGates/abi-seal画像はゼロ

### 3. Lighthouse計測（Mobile）

#### Chrome DevToolsで計測
1. Chrome DevToolsを開く（F12）
2. Lighthouseタブを選択
3. 設定：
   - Mode: **Navigation (Default)**
   - Device: **Mobile**
   - Categories: Performance のみチェック
4. "Analyze page load" をクリック
5. 3回実行して記録

#### コマンドラインで計測（推奨）
```bash
# Lighthouse CLIインストール（初回のみ）
npm install -g lighthouse

# 計測実行（3回）
lighthouse https://hakusyaku.xyz/ \
  --only-categories=performance \
  --preset=mobile \
  --output=json \
  --output-path=./lighthouse-run1.json

lighthouse https://hakusyaku.xyz/ \
  --only-categories=performance \
  --preset=mobile \
  --output=json \
  --output-path=./lighthouse-run2.json

lighthouse https://hakusyaku.xyz/ \
  --only-categories=performance \
  --preset=mobile \
  --output=json \
  --output-path=./lighthouse-run3.json
```

### 4. 中央値の計算

記録すべき指標：
- **Performance Score** (0-100点)
- **LCP** (Largest Contentful Paint, 秒)
- **CLS** (Cumulative Layout Shift, 0-1)
- **TBT** (Total Blocking Time, ms)
- **SI** (Speed Index, 秒)

**中央値の求め方：**
1. 3回の測定値を小さい順に並べる
2. 真ん中の値が中央値

例：
- LCP: 2.1s, 2.3s, 2.5s → 中央値 = **2.3s**
- CLS: 0.02, 0.03, 0.05 → 中央値 = **0.03**

### 5. 結果の評価基準

#### Core Web Vitals（Google基準）
| 指標 | Good | Needs Improvement | Poor |
|------|------|-------------------|------|
| LCP | ≤2.5s | 2.5s-4.0s | >4.0s |
| CLS | ≤0.1 | 0.1-0.25 | >0.25 |
| INP | ≤200ms | 200ms-500ms | >500ms |

#### 期待される改善値

**Before（推定値）：**
- Performance: 60-70点
- LCP: 4.0s-5.0s（画像読み込み遅延）
- CLS: 0.05-0.15
- TBT: 300-500ms

**After（目標値）：**
- Performance: **85-95点**
- LCP: **<2.5s** ✅ Good
- CLS: **<0.1** ✅ Good
- TBT: **<200ms**

#### 削減率目標
- LCP: **50-70%改善**（4.5s → 2.0s程度）
- Performance Score: **+15-25点**
- Total Page Weight: **-30MB**（31.77MB → 1MB以下）

## レポート形式

### 計測結果テンプレート

```markdown
## Lighthouse計測結果（Mobile）

### 環境
- URL: https://hakusyaku.xyz/
- Date: 2026-02-XX
- Device: Mobile（Chrome DevTools）
- Network: Fast 4G throttling

### 3回計測の生データ

| Run | Performance | LCP | CLS | TBT | SI |
|-----|-------------|-----|-----|-----|----|
| 1   | 89点 | 2.1s | 0.02 | 180ms | 2.5s |
| 2   | 91点 | 2.3s | 0.03 | 150ms | 2.4s |
| 3   | 88点 | 2.5s | 0.05 | 200ms | 2.6s |

### 中央値（最終値）

| 指標 | 中央値 | 評価 |
|------|--------|------|
| Performance | **89点** | ✅ Excellent |
| LCP | **2.3s** | ✅ Good |
| CLS | **0.03** | ✅ Good |
| TBT | **180ms** | ✅ Good |
| SI | **2.5s** | ✅ Good |

### Before/After比較

| 指標 | Before | After | 改善率 |
|------|--------|-------|--------|
| LCP | 4.5s | 2.3s | **48.9%** |
| Performance | 65点 | 89点 | **+24点** |
| Page Weight | 31.77MB | 877KB | **97.3%** |
```

## トラブルシューティング

### 問題：PNGがまだ読み込まれている
- ブラウザキャッシュをクリア（Cmd+Shift+R / Ctrl+Shift+R）
- Vercelのキャッシュをパージ（Vercel Dashboard）
- CDNキャッシュの伝播待ち（最大5-10分）

### 問題：LCPが期待より遅い
- 他の要因（Starfield canvas、JS実行時間）をチェック
- Networkタブでウォーターフォールを確認
- 優先度の高い画像がブロックされていないか確認

### 問題：計測値のばらつきが大きい
- ネットワーク状態を確認（安定したWiFi推奨）
- バックグラウンドタブを全て閉じる
- CPUスロットリングをオフにして再計測

## 次のステップ

計測完了後：
1. 結果を `docs/ticket-1-image-optimization.md` に追記
2. スクリーンショットを保存
3. チケット#2（観音百籤画像WebP化）へ進む
