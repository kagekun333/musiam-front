#!/usr/bin/env python3
# 高解像度カバーから壁紙セット（スマホ/PC）を生成。再開可能（既存スキップ）。
import os, json, re
from PIL import Image, ImageFilter, ImageEnhance

OUT = "/sessions/eloquent-lucid-lovelace/mnt/outputs"
MAN = sorted(json.load(open(os.path.join(OUT, "art_manifest.json"), encoding="utf-8")),
             key=lambda x: x["title"].lower())
PHONE = (1080, 1920)
PC = (1920, 1080)
DPHONE = os.path.join(OUT, "_wallpapers", "phone-1080x1920")
DPC = os.path.join(OUT, "_wallpapers", "pc-1920x1080")
for d in (DPHONE, DPC):
    os.makedirs(d, exist_ok=True)

def safe(t):
    return re.sub(r"[^\w぀-ヿ一-鿿\- ]", "", t).strip()[:50] or "untitled"

def make_bg(cover, size):
    w, h = size
    # 小さくしてからblur→拡大（高速）
    small = cover.copy()
    small.thumbnail((480, 480), Image.LANCZOS)
    # fill (cover) クロップ
    sr = max(w / small.width, h / small.height)
    small = small.resize((int(small.width * sr) + 1, int(small.height * sr) + 1), Image.LANCZOS)
    left = (small.width - w) // 2
    top = (small.height - h) // 2
    bg = small.crop((left, top, left + w, top + h))
    bg = bg.filter(ImageFilter.GaussianBlur(28))
    bg = ImageEnhance.Brightness(bg).enhance(0.45)
    return bg

def compose(cover, size, fg_ratio):
    w, h = size
    bg = make_bg(cover, size)
    fg = cover.copy()
    target = int(min(w, h) * fg_ratio)
    fg.thumbnail((target, target), Image.LANCZOS)
    x = (w - fg.width) // 2
    y = (h - fg.height) // 2
    # 影
    sh = Image.new("RGB", (fg.width + 40, fg.height + 40), (0, 0, 0))
    bg.paste(sh, (x - 20, y - 14))
    bg.paste(fg, (x, y))
    return bg

done = 0
for i, item in enumerate(MAN, 1):
    name = f"{i:03d}_{safe(item['title'])}.jpg"
    pf = os.path.join(DPHONE, name)
    pc = os.path.join(DPC, name)
    if os.path.exists(pf) and os.path.exists(pc):
        continue
    try:
        cover = Image.open(item["cover"]).convert("RGB")
    except Exception as e:
        print("SKIP", item["title"], e, flush=True)
        continue
    if not os.path.exists(pf):
        compose(cover, PHONE, 0.86).save(pf, "JPEG", quality=88)
    if not os.path.exists(pc):
        compose(cover, PC, 0.78).save(pc, "JPEG", quality=88)
    done += 1
    if done % 30 == 0:
        print(f"...{i}/{len(MAN)}", flush=True)

nph = len(os.listdir(DPHONE)); npc = len(os.listdir(DPC))
print(f"DONE phone={nph} pc={npc}", flush=True)
