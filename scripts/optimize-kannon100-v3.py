#!/usr/bin/env python3
"""観音百籤画像WebP変換スクリプト v3 - 目標達成版"""

import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow not installed")
    sys.exit(1)

ROOT_DIR = Path(__file__).parent.parent
KANNON_DIR = ROOT_DIR / "public" / "images" / "kannon100"

def convert_to_webp(input_path, output_path, max_width=500, quality=70):
    """画像をリサイズしてWebPに変換"""
    with Image.open(input_path) as img:
        if img.mode == 'RGBA':
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        # リサイズ
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

        img.save(output_path, 'WEBP', quality=quality, method=6)
        return output_path.stat().st_size

def format_size(size_bytes):
    if size_bytes < 1024:
        return f"{size_bytes}B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.0f}KB"
    else:
        return f"{size_bytes / 1024 / 1024:.2f}MB"

def main():
    print("=== 観音百籤画像WebP変換 v3（目標達成版）===\n")
    print("設定: 最大幅500px、品質70\n")

    before_total = 0
    after_total = 0
    converted_count = 0

    for i in range(1, 101):
        dir_name = f"{i:03d}"
        dir_path = KANNON_DIR / dir_name

        if not dir_path.exists():
            continue

        for filename in ['front.jpg', 'back.jpg']:
            input_path = dir_path / filename
            if not input_path.exists():
                continue

            before_size = input_path.stat().st_size
            before_total += before_size

            output_filename = filename.replace('.jpg', '.webp')
            output_path = dir_path / output_filename

            after_size = convert_to_webp(input_path, output_path, max_width=500, quality=70)
            after_total += after_size
            converted_count += 1

            if converted_count % 20 == 0:
                print(f"変換中... {converted_count}/200")

    print(f"\n✓ 変換完了: {converted_count}ファイル")

    print("\n=== 変換結果 ===")
    print(f"Before: {format_size(before_total)}")
    print(f"After:  {format_size(after_total)}")
    reduction = ((before_total - after_total) / before_total) * 100
    print(f"削減率: {reduction:.1f}%")

    target_mb = 15
    actual_mb = after_total / 1024 / 1024
    print(f"\n目標: <{target_mb}MB")
    print(f"実測: {actual_mb:.2f}MB")

    if actual_mb < target_mb:
        print("✅ 目標達成！")
        print(f"   余裕: {target_mb - actual_mb:.2f}MB")
    else:
        print(f"⚠️ 目標未達（{actual_mb - target_mb:.2f}MB超過）")

    print("\n✓ 元のJPGファイルは保持されています")

if __name__ == "__main__":
    main()
