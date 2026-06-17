#!/usr/bin/env python3
# 伯爵の魔導書 — AI音楽制作の作法とプロンプト集（PDF）
import json, collections
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph,
                                Spacer, PageBreak, Flowable)
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase.cidfonts import UnicodeCIDFont

OUT = "/sessions/eloquent-lucid-lovelace/mnt/outputs"
# 日本語CIDフォント（reportlab同梱・ファイル不要）。明朝=本文, ゴシック=見出し/強調。
pdfmetrics.registerFont(UnicodeCIDFont("HeiseiMin-W3"))
pdfmetrics.registerFont(UnicodeCIDFont("HeiseiKakuGo-W5"))
pdfmetrics.registerFontFamily("HeiseiMin-W3", normal="HeiseiMin-W3", bold="HeiseiKakuGo-W5")
JP = "HeiseiMin-W3"
JPB = "HeiseiKakuGo-W5"

GOLD = colors.HexColor("#a8862c")
INK = colors.HexColor("#26221d")
MUT = colors.HexColor("#7a7066")

# ---- データ：50の着想を選ぶ（ジャンル横断・情景の濃い順） ----
data = json.load(open(f"{OUT}/meta_all.json", encoding="utf-8"))
tracks = []
for r in data:
    for t in r["tracks"]:
        if t.get("notes") and t.get("t"):
            tracks.append({"title": t["t"], "genre": t.get("genre") or r.get("genre") or "—",
                           "mood": (t.get("mood") or "").strip(), "notes": t["notes"].strip()})
by = collections.defaultdict(list)
for t in tracks:
    by[t["genre"]].append(t)
for g in by:
    by[g].sort(key=lambda x: len(x["notes"]), reverse=True)
order = sorted(by, key=lambda g: -len(by[g]))
sel, idx = [], {g: 0 for g in by}
seen = set()
while len(sel) < 50:
    moved = False
    for g in order:
        while idx[g] < len(by[g]) and by[g][idx[g]]["title"] in seen:
            idx[g] += 1
        if idx[g] < len(by[g]):
            sel.append(by[g][idx[g]]); seen.add(by[g][idx[g]]["title"]); idx[g] += 1; moved = True
            if len(sel) >= 50: break
    if not moved: break

# ---- スタイル ----
styles = {
    "title": ParagraphStyle("t", fontName=JPB, fontSize=34, textColor=INK, leading=42, alignment=1),
    "subtitle": ParagraphStyle("st", fontName=JP, fontSize=15, textColor=GOLD, leading=22, alignment=1),
    "author": ParagraphStyle("au", fontName=JP, fontSize=11, textColor=MUT, leading=18, alignment=1),
    "h2": ParagraphStyle("h2", fontName=JPB, fontSize=17, textColor=GOLD, leading=24, spaceBefore=10, spaceAfter=8),
    "body": ParagraphStyle("b", fontName=JP, fontSize=10.5, textColor=INK, leading=18, spaceAfter=8),
    "entryTitle": ParagraphStyle("et", fontName=JPB, fontSize=12.5, textColor=INK, leading=18, spaceBefore=10),
    "meta": ParagraphStyle("m", fontName=JP, fontSize=9, textColor=GOLD, leading=14, spaceAfter=3),
    "notes": ParagraphStyle("n", fontName=JP, fontSize=10, textColor=INK, leading=16.5, spaceAfter=4),
}

class Rule(Flowable):
    def __init__(self, w, color=GOLD, th=0.6):
        super().__init__(); self.w=w; self.color=color; self.th=th
    def wrap(self, *a): return (self.w, self.th+6)
    def draw(self):
        self.canv.setStrokeColor(self.color); self.canv.setLineWidth(self.th)
        self.canv.line(0, 3, self.w, 3)

W, H = A4
MX = 2.0*cm
fw = W - 2*MX

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont(JP, 8); canvas.setFillColor(MUT)
    canvas.drawCentredString(W/2, 1.1*cm, "伯爵の魔導書 — 伯爵MUSIAM")
    if doc.page > 1:
        canvas.drawRightString(W-MX, 1.1*cm, str(doc.page))
    canvas.restoreState()

doc = BaseDocTemplate(f"{OUT}/伯爵の魔導書_プロンプト集.pdf", pagesize=A4,
                      leftMargin=MX, rightMargin=MX, topMargin=2.0*cm, bottomMargin=1.8*cm)
frame = Frame(MX, 1.8*cm, fw, H-3.8*cm, id="main")
doc.addPageTemplates([PageTemplate(id="p", frames=[frame], onPage=footer)])

S = []
P = lambda t, s: Paragraph(t, styles[s])

# 表紙
S += [Spacer(1, 5.5*cm), P("伯爵の魔導書", "title"), Spacer(1, 0.3*cm),
      P("AI音楽制作の作法と、着想のプロンプト集", "subtitle"), Spacer(1, 1.2*cm),
      P("ABI伯爵", "author"), P("伯爵MUSIAM", "author"),
      Spacer(1, 0.6*cm), Rule(fw*0.4), PageBreak()]

# 序文
S += [P("序 — 音は、情景から生まれる", "h2"),
      P("AIに「いい曲を作って」と頼んでも、いい曲は出てこない。出てくるのは、どこかで聞いたような、誰のものでもない音だ。私が言葉にするのは、音そのものより<b>その曲が置かれる情景</b>である。時間帯、温度、光の角度、そこに誰がいて何を思っているのか。情景が立ち上がれば、音は自ずとそれに従う。", "body"),
      P("この館に二百を超える作品が一つの世界として在るのは、一曲ごとに情景の言葉を積み重ねてきたからだ。技術ではなく、<b>世界観の一貫性</b>こそが核心である。そして量を作れる時代だからこそ、<b>捨てる勇気</b>が質を決める。AIはいくらでも音を出すが、「これは館に置いていい音か」を決めるのは、いつも人間の仕事だ。", "body"),
      P("この魔導書は、その作法と、実際に作品を生んだ着想の記録である。後半には、ジャンルを横断した五十の着想を、ジャンル・ムード・情景の三層で収めた。あなた自身の一曲を生むための、種として使ってほしい。", "body"),
      Spacer(1, 0.3*cm),
      P("プロンプト設計の型 — 三層", "h2"),
      P("<b>① ジャンル</b>：音の骨格（例：ワールド／ダンス／ハウス／トランス／ジャズ）。まず器を決める。", "body"),
      P("<b>② ムード</b>：感情の温度（例：発射／覚醒／郷愁／神秘）。器に注ぐ熱を決める。", "body"),
      P("<b>③ 情景</b>：時間・場所・光・聴き手・物語。最も大切な層。ここを具体的に書くほど、音は唯一になる。", "body"),
      Spacer(1, 0.2*cm),
      P("<b>型のテンプレート：</b>「〔ジャンル〕で、〔ムード〕を帯びた一曲。〔時間帯と光〕の中、〔場所〕に〔聴き手〕がいる。〔起きていること／映像のイメージ〕。」", "notes"),
      PageBreak()]

# 本文：50の着想
S += [P("作品から学ぶ — 五十の着想", "h2"),
      P("以下は実際の作品の設計メモである。各項のムードと情景を、あなたのプロンプトの素材として読み替えてほしい。", "body"), Spacer(1, 0.2*cm)]
for i, t in enumerate(sel, 1):
    notes = t["notes"]
    if len(notes) > 420: notes = notes[:417] + "…"
    S.append(P(f"{i:02d}　{t['title']}", "entryTitle"))
    meta = f"ジャンル：{t['genre']}"
    if t["mood"]: meta += f"　／　ムード：{t['mood']}"
    S.append(P(meta, "meta"))
    S.append(P(notes, "notes"))
    S.append(Rule(fw, colors.HexColor("#e6ddc8"), 0.4))

doc.build(S)
import os
print("DONE", round(os.path.getsize(f"{OUT}/伯爵の魔導書_プロンプト集.pdf")/1024/1024, 2), "MB / entries", len(sel))
