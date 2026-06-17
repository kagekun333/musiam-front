#!/usr/bin/env python3
# 伯爵MUSIAM ジャケットアート集 — 高解像度カバーから画集PDFを生成
import os, json, glob, tempfile, sys
from PIL import Image, ImageDraw, ImageFont
import img2pdf

OUT = "/sessions/eloquent-lucid-lovelace/mnt/outputs"
MAN = json.load(open(os.path.join(OUT, "art_manifest.json"), encoding="utf-8"))
MAN = sorted(MAN, key=lambda x: x["title"].lower())

BG = (7, 14, 24)          # 宇宙の紺
GOLD = (212, 175, 55)
CREAM = (245, 232, 200)
MUTED = (150, 150, 160)
FB = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"
FR = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc"

PAGE_W, PAGE_H = 1500, 1900   # 縦長ページ
COVER = 1180                  # カバー表示サイズ
tmpdir = os.path.join(OUT, "_artpages")   # 永続化（再開可能）
os.makedirs(tmpdir, exist_ok=True)
pages = []

def font(path, size):
    return ImageFont.truetype(path, size)

def center_text(draw, cx, y, text, fnt, fill, max_w):
    # 長いタイトルは縮める
    s = size_text(draw, text, fnt)
    f = fnt
    while s[0] > max_w and f.size > 18:
        f = ImageFont.truetype(f.path, f.size - 2)
        s = size_text(draw, text, f)
    draw.text((cx - s[0] / 2, y), text, font=f, fill=fill)
    return s[1]

def size_text(draw, text, fnt):
    b = draw.textbbox((0, 0), text, font=fnt)
    return (b[2] - b[0], b[3] - b[1])

# ---- 表紙 ----
cover_pg = Image.new("RGB", (PAGE_W, PAGE_H), BG)
d = ImageDraw.Draw(cover_pg)
# ほのかな放射グラデ風の点描は省略、シンプルで上質に
center_text(d, PAGE_W//2, 640, "伯爵 MUSIAM", font(FB, 110), CREAM, PAGE_W-160)
center_text(d, PAGE_W//2, 800, "ジャケットアート集", font(FB, 84), GOLD, PAGE_W-160)
center_text(d, PAGE_W//2, 980, "ABI伯爵", font(FR, 52), CREAM, PAGE_W-160)
center_text(d, PAGE_W//2, 1060, f"{len(MAN)} のジャケットアート", font(FR, 40), MUTED, PAGE_W-160)
cp = os.path.join(tmpdir, "page_000.jpg")
if not os.path.exists(cp):
    cover_pg.save(cp, "JPEG", quality=90)
pages.append(cp)

# ---- 各作品 1ページ（既存はスキップ＝再開可能） ----
for i, item in enumerate(MAN, 1):
    pp = os.path.join(tmpdir, f"page_{i:03d}.jpg")
    if os.path.exists(pp):
        pages.append(pp)
        continue
    page = Image.new("RGB", (PAGE_W, PAGE_H), BG)
    try:
        im = Image.open(item["cover"]).convert("RGB")
    except Exception as e:
        print("SKIP", item["title"], e, flush=True)
        continue
    im.thumbnail((COVER, COVER), Image.LANCZOS)
    x = (PAGE_W - im.width) // 2
    y = 170
    # 影
    shadow = Image.new("RGB", (im.width+24, im.height+24), (0,0,0))
    page.paste(shadow, (x-12, y-6))
    page.paste(im, (x, y))
    d = ImageDraw.Draw(page)
    cap_y = y + im.height + 70
    center_text(d, PAGE_W//2, cap_y, item["title"], font(FB, 56), CREAM, PAGE_W-200)
    center_text(d, PAGE_W//2, PAGE_H-90, f"{i:03d} / {len(MAN)}   伯爵MUSIAM", font(FR, 30), MUTED, PAGE_W-200)
    pp = os.path.join(tmpdir, f"page_{i:03d}.jpg")
    page.save(pp, "JPEG", quality=88)
    pages.append(pp)
    if i % 30 == 0:
        print(f"...{i}/{len(MAN)} pages", flush=True)

out_pdf = os.path.join(OUT, "伯爵MUSIAM_ジャケットアート集.pdf")
with open(out_pdf, "wb") as f:
    f.write(img2pdf.convert(pages))
sz = os.path.getsize(out_pdf) / 1024 / 1024
print(f"DONE pdf pages={len(pages)} size={sz:.1f}MB -> {out_pdf}", flush=True)
