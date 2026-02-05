#!/usr/bin/env python3
"""画像最適化スクリプト - WebP変換（PIL使用）"""

import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow not installed. Install with: pip install Pillow")
    sys.exit(1)

ROOT_DIR = Path(__file__).parent.parent
GATES_DIR = ROOT_DIR / "public" / "gates"
BRAND_DIR = ROOT_DIR / "public" / "brand"

def convert_to_webp(input_path, output_path, max_width, quality=85):
    """画像をWebPに変換"""
    with Image.open(input_path) as img:
        # RGBA → RGB変換（WebPは透過をサポートするが最適化のため）
        if img.mode == 'RGBA':
            # 白背景で合成
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

        # WebP保存
        img.save(output_path, 'WEBP', quality=quality, method=6)

        return output_path.stat().st_size

def format_size(size_bytes):
    """バイトサイズを読みやすい形式に変換"""
    if size_bytes < 1024:
        return f"{size_bytes}B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.0f}KB"
    else:
        return f"{size_bytes / 1024 / 1024:.2f}MB"

def main():
    print("=== 画像最適化開始 ===\n")

    before_sizes = {}
    after_sizes = {}

    # Gates画像変換
    gates_images = ['galaxy.jpg', 'gothic-door.jpg', 'torii.jpg']

    for filename in gates_images:
        input_path = GATES_DIR / filename
        if not input_path.exists():
            print(f"Warning: {filename} not found")
            continue

        before_sizes[filename] = input_path.stat().st_size
        basename = filename.replace('.jpg', '')

        print(f"変換中: {filename}")

        # 3サイズ生成
        sizes_config = [
            (1200, '', 85),
            (800, '-800', 85),
            (500, '-500', 85)
        ]

        for max_width, suffix, quality in sizes_config:
            output_path = GATES_DIR / f"{basename}{suffix}.webp"
            size = convert_to_webp(input_path, output_path, max_width, quality)
            after_sizes[output_path.name] = size
            print(f"  ✓ {basename}{suffix}.webp ({format_size(size)})")

    # abi-seal.png変換
    abi_input = BRAND_DIR / "abi-seal.png"
    if abi_input.exists():
        before_sizes['abi-seal.png'] = abi_input.stat().st_size

        print(f"\n変換中: abi-seal.png")
        abi_output = BRAND_DIR / "abi-seal.webp"

        # PNG透過を保持する版
        with Image.open(abi_input) as img:
            if img.width > 512:
                ratio = 512 / img.width
                new_height = int(img.height * ratio)
                img = img.resize((512, new_height), Image.Resampling.LANCZOS)
            img.save(abi_output, 'WEBP', quality=90, method=6)

        abi_size = abi_output.stat().st_size
        after_sizes['abi-seal.webp'] = abi_size
        print(f"  ✓ abi-seal.webp ({format_size(abi_size)})")

    # サマリー
    print("\n=== 変換完了 ===")
    print("\nBefore:")
    total_before = sum(before_sizes.values())
    for filename, size in before_sizes.items():
        print(f"  {filename}: {format_size(size)}")
    print(f"  合計: {format_size(total_before)}")

    print("\nAfter (WebP):")
    total_after = sum(after_sizes.values())
    print(f"  生成ファイル数: {len(after_sizes)}個")
    print(f"  合計: {format_size(total_after)}")

    reduction = ((total_before - total_after) / total_before) * 100
    print(f"  削減率: {reduction:.1f}%")

    print("\n✓ 元のJPG/PNGファイルは保持されています")
    print("✓ 次のステップ: src/app/page.tsxで.webpファイルを参照するよう更新")

if __name__ == "__main__":
    main()
