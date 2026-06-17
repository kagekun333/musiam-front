#!/usr/bin/env python3
# 特別な御籤カード20枚を生成（本物の御籤の漢詩＋和訳＋神秘的アート背景）
import os, json, random, textwrap
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

OUT = "/sessions/eloquent-lucid-lovelace/mnt/outputs"
OD = "/tmp/omikuji_cards"; os.makedirs(OD, exist_ok=True)
omi = json.load(open("/sessions/eloquent-lucid-lovelace/mnt/musiam-front/src/data/omikuji/abi.json", encoding="utf-8"))
man = json.load(open(f"{OUT}/art_manifest.json", encoding="utf-8"))
FB = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"
FR = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc"
GOLD=(212,175,55); CREAM=(245,232,200); INK=(20,16,28)

W,H = 1080, 1620  # 御籤らしい縦長カード
random.seed(11)
sel = random.sample(omi, 20)
covers = [m["cover"] for m in man]

def bg(cover):
    base = Image.new("RGB",(W,H),(10,8,18))
    try:
        im=Image.open(cover).convert("RGB")
        s=max(W/im.width,H/im.height); im=im.resize((int(im.width*s)+1,int(im.height*s)+1),Image.LANCZOS)
        im=im.crop((0,0,W,H)); im=im.filter(ImageFilter.GaussianBlur(22)); im=ImageEnhance.Brightness(im).enhance(0.32)
        base.paste(im,(0,0))
    except: pass
    return base

def draw_card(item, cover, path):
    img = bg(cover); d = ImageDraw.Draw(img)
    # 金枠
    d.rectangle((40,40,W-40,H-40), outline=GOLD, width=3)
    d.rectangle((54,54,W-54,H-54), outline=(120,98,40), width=1)
    fb=lambda s:ImageFont.truetype(FB,s); fr=lambda s:ImageFont.truetype(FR,s)
    def ctr(y,t,f,fill):
        w=d.textlength(t,font=f); d.text(((W-w)/2,y),t,font=f,fill=fill); return y+f.size
    ctr(110,"特別な御籤",fb(58),CREAM)
    ctr(195,"伯爵MUSIAM",fr(30),GOLD)
    # 籤番・rank
    ctr(290,item["header_ja"],fb(64),GOLD)
    # 漢詩（orig）
    y=430
    for l in item["lines"]:
        y=ctr(y+8,l["orig"],fb(46),CREAM)
    # 和訳
    y+=40
    for l in item["lines"]:
        t=l["ja"]
        f=fr(34)
        for seg in textwrap.wrap(t, width=20) or [t]:
            w=d.textlength(seg,font=f); d.text(((W-w)/2,y),seg,font=f,fill=(225,220,210)); y+=46
        y+=4
    # 伯爵の言葉
    y=H-300
    d.line((W/2-180,y-30,W/2+180,y-30),fill=(120,98,40),width=1)
    msg="この一枚は、あなたのために選ばれた。今日の歩みに、静かな光が差すように。"
    f=fr(30)
    for seg in textwrap.wrap(msg,width=22):
        w=d.textlength(seg,font=f); d.text(((W-w)/2,y),seg,font=f,fill=CREAM); y+=44
    ctr(H-110,"— ABI伯爵",fr(28),GOLD)
    img.save(path,"JPEG",quality=92)

for i,item in enumerate(sel,1):
    draw_card(item, covers[(i*7)%len(covers)], os.path.join(OD,f"omikuji_{i:02d}_{item['rank_ja']}.jpg"))
print("DONE cards:", len(os.listdir(OD)))
