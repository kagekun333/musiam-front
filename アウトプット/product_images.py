#!/usr/bin/env python3
# 売店8商品の商品画像（1200x1200）を本物のジャケットアートのコラージュから生成
import os, json, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

OUT = "/sessions/eloquent-lucid-lovelace/mnt/outputs"
OD = os.path.join(OUT, "product_images"); os.makedirs(OD, exist_ok=True)
MAN = json.load(open(f"{OUT}/art_manifest.json", encoding="utf-8"))
FB = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"
FR = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc"
SEAL = "/sessions/eloquent-lucid-lovelace/mnt/musiam-front/public/brand/abi-seal.webp"
GOLD = (212, 175, 55); CREAM = (245, 232, 200); BG = (7, 12, 22)
SZ = 1200

random.seed(7)
covers = [m["cover"] for m in MAN]

def collage(n=6):
    """n×n のカバーコラージュ → 暗くしてブラー背景に"""
    cell = SZ // n
    base = Image.new("RGB", (SZ, SZ), BG)
    pics = random.sample(covers, min(n*n, len(covers)))
    for i, p in enumerate(pics):
        try:
            im = Image.open(p).convert("RGB")
        except Exception:
            continue
        s = max(cell/im.width, cell/im.height)
        im = im.resize((int(im.width*s)+1, int(im.height*s)+1), Image.LANCZOS)
        im = im.crop((0, 0, cell, cell))
        base.paste(im, ((i % n)*cell, (i//n)*cell))
    base = base.filter(ImageFilter.GaussianBlur(6))
    base = ImageEnhance.Brightness(base).enhance(0.34)
    return base

def hero(path):
    base = collage(6)
    try:
        im = Image.open(path).convert("RGB")
        im.thumbnail((620, 620), Image.LANCZOS)
        x = (SZ-im.width)//2; y = 250
        sh = Image.new("RGB", (im.width+30, im.height+30), (0,0,0))
        base.paste(sh, (x-15, y-8)); base.paste(im, (x, y))
    except Exception:
        pass
    return base

def vignette(img):
    v = Image.new("L", (SZ, SZ), 0); d = ImageDraw.Draw(v)
    d.ellipse((-260,-260,SZ+260,SZ+260), fill=255)
    v = v.filter(ImageFilter.GaussianBlur(200))
    dark = ImageEnhance.Brightness(img).enhance(0.5)
    return Image.composite(img, dark, v)

def fit(draw, text, path, size, maxw):
    f = ImageFont.truetype(path, size)
    while draw.textlength(text, font=f) > maxw and f.size > 22:
        f = ImageFont.truetype(path, f.size-2)
    return f

def text_center(img, lines, sub=None, hero_mode=False):
    d = ImageDraw.Draw(img)
    # 上部 or 下部に帯
    y = 120 if hero_mode else SZ//2 - 120
    for ln in lines:
        f = fit(d, ln, FB, 96 if not hero_mode else 70, SZ-180)
        w = d.textlength(ln, font=f)
        # 影
        d.text(((SZ-w)/2+2, y+2), ln, font=f, fill=(0,0,0))
        d.text(((SZ-w)/2, y), ln, font=f, fill=CREAM)
        y += f.size + 18
    if sub:
        fs = ImageFont.truetype(FR, 40); ws = d.textlength(sub, font=fs)
        d.text(((SZ-ws)/2, y+6), sub, font=fs, fill=GOLD)
    # フッター
    ff = ImageFont.truetype(FR, 34); t = "伯爵MUSIAM"
    d.text(((SZ-d.textlength(t, font=ff))/2, SZ-90), t, font=ff, fill=(190,180,165))
    return img

# 商品定義: id -> (lines, subtitle, hero cover or None)
P = {
  "bgm-commercial-license": (["商用利用OK", "BGMライセンス"], "YouTube・配信・店舗で使える", None),
  "best-collection-vol1":   (["BEST", "COLLECTION Vol.1"], "高音質WAV・未配信曲収録", None),
  "artbook-pdf":            (["画集", "307のアート"], "高解像度デジタル画集", None),
  "wallpaper-pack":         (["壁紙", "コレクション"], "スマホ / PC / タブレット", None),
  "special-omikuji":        (["特別な御籤"], "伯爵の親筆・限定アート", None),
  "oracle-song":            (["占い × 一曲"], "今日のあなたの調べ", None),
  "oracle-subscription":    (["日々の御籤"], "月額・毎日の一枚", None),
  "prompt-grimoire":        (["伯爵の魔導書"], "AI音楽制作プロンプト集", None),
}
# 単品はヒーローカバーを使う（コラージュより主役感）
HEROES = {
  "best-collection-vol1": 0, "special-omikuji": 40, "oracle-song": 80, "prompt-grimoire": 120,
}
for i, (pid, (lines, sub, _)) in enumerate(P.items()):
    if os.path.exists(os.path.join(OD, f"{pid}.jpg")):
        print("skip", pid); continue
    if pid in HEROES:
        img = hero(covers[HEROES[pid] % len(covers)])
        img = vignette(img)
        text_center(img, lines, sub, hero_mode=True)
    else:
        img = collage(6); img = vignette(img)
        text_center(img, lines, sub, hero_mode=False)
    img.save(os.path.join(OD, f"{pid}.jpg"), "JPEG", quality=90)
    print("made", pid)
print("DONE", len(P), "images ->", OD)
