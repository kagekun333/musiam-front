# Omikuji Sync

rank_map.json（正） + core.json（四句・正） + ja/en.txt.bak（説明・カテゴリ） → 統一規格の ja.txt / en.txt を生成。

## 実行（PowerShell）
$BASE = "src/data"  # or /absolute/path
python scripts/omikuji/sync_omikuji.py `
  --core        "$BASE/omikuji/core.json" `
  --rankmap     "$BASE/rank_map.json" `
  --ja_bak      "$BASE/kannon100/ja.txt.bak" `
  --en_bak      "$BASE/kannon100/en.txt.bak" `
  --rank_en_map "scripts/omikuji/config/rank.ja2en.json" `
  --alias_ja    "scripts/omikuji/config/category_alias.ja.json" `
  --alias_en    "scripts/omikuji/config/category_alias.en.json" `
  --out_dir     "src/data/omikuji"

## 実行（bash）
BASE="src/data"
python3 scripts/omikuji/sync_omikuji.py \
  --core        "$BASE/omikuji/core.json" \
  --rankmap     "$BASE/rank_map.json" \
  --ja_bak      "$BASE/kannon100/ja.txt.bak" \
  --en_bak      "$BASE/kannon100/en.txt.bak" \
  --rank_en_map "scripts/omikuji/config/rank.ja2en.json" \
  --alias_ja    "scripts/omikuji/config/category_alias.ja.json" \
  --alias_en    "scripts/omikuji/config/category_alias.en.json" \
  --out_dir     "src/data/omikuji"

## 出力
- src/data/omikuji/ja.txt
- src/data/omikuji/en.txt
- src/data/omikuji/sync_report.json  # ランク上書き・.bak欠損の監査用
