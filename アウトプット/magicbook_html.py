#!/usr/bin/env python3
# 伯爵の魔導書 — HTML→PDF（weasyprint, フォント埋め込み・テキスト選択可）
import json, collections, html as H
from weasyprint import HTML

OUT = "/sessions/eloquent-lucid-lovelace/mnt/outputs"
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
sel, idx, seen = [], {g: 0 for g in by}, set()
while len(sel) < 50:
    moved = False
    for g in order:
        while idx[g] < len(by[g]) and by[g][idx[g]]["title"] in seen:
            idx[g] += 1
        if idx[g] < len(by[g]):
            e = by[g][idx[g]]; sel.append(e); seen.add(e["title"]); idx[g] += 1; moved = True
            if len(sel) >= 50: break
    if not moved: break

def esc(s): return H.escape(s or "")

entries = ""
for i, t in enumerate(sel, 1):
    notes = t["notes"]
    if len(notes) > 460: notes = notes[:457] + "…"
    meta = f"ジャンル：{esc(t['genre'])}"
    if t["mood"]: meta += f"　／　ムード：{esc(t['mood'])}"
    entries += f"""<div class="entry">
      <div class="etitle"><span class="num">{i:02d}</span>{esc(t['title'])}</div>
      <div class="meta">{meta}</div>
      <div class="notes">{esc(notes)}</div>
    </div>"""

doc = f"""<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
@page {{ size: A4; margin: 20mm 18mm 18mm 18mm;
  @bottom-center {{ content: "伯爵の魔導書 — 伯爵MUSIAM"; font-size: 8pt; color: #8a8073; }}
  @bottom-right {{ content: counter(page); font-size: 8pt; color: #8a8073; }} }}
@page :first {{ @bottom-center {{ content: ""; }} @bottom-right {{ content: ""; }} }}
* {{ font-family: "Noto Serif CJK JP", serif; }}
body {{ color: #26221d; }}
.cover {{ height: 235mm; display: flex; flex-direction: column; justify-content: center;
  align-items: center; text-align: center; page-break-after: always; }}
.cover h1 {{ font-size: 40pt; margin: 0 0 6mm; letter-spacing: 2px; }}
.cover .sub {{ font-size: 15pt; color: #a8862c; margin-bottom: 14mm; }}
.cover .au {{ font-size: 11pt; color: #7a7066; line-height: 1.9; }}
.cover .rule {{ width: 70mm; border-top: 1px solid #a8862c; margin-top: 10mm; }}
h2 {{ color: #a8862c; font-size: 17pt; border-bottom: 1px solid #e6ddc8;
  padding-bottom: 3mm; margin: 8mm 0 5mm; }}
p {{ font-size: 10.5pt; line-height: 1.75; margin: 0 0 3.2mm; }}
.tmpl {{ background: #faf6ea; border-left: 3px solid #a8862c; padding: 4mm 5mm;
  font-size: 10pt; line-height: 1.7; margin: 3mm 0; }}
.entry {{ padding: 3mm 0; border-bottom: 1px solid #ece4d2; page-break-inside: avoid; }}
.etitle {{ font-size: 12.5pt; font-weight: 700; margin-bottom: 1.5mm; }}
.num {{ color: #a8862c; margin-right: 4mm; }}
.meta {{ font-size: 9pt; color: #a8862c; margin-bottom: 1.5mm; }}
.notes {{ font-size: 10pt; line-height: 1.7; color: #322c25; }}
.lead {{ font-size: 10.5pt; color: #5a5249; }}
</style></head><body>

<div class="cover">
  <h1>伯爵の魔導書</h1>
  <div class="sub">AI音楽制作の作法と、着想のプロンプト集</div>
  <div class="au">ABI伯爵<br>伯爵MUSIAM</div>
  <div class="rule"></div>
</div>

<h2>序 — 音は、情景から生まれる</h2>
<p>AIに「いい曲を作って」と頼んでも、いい曲は出てこない。出てくるのは、どこかで聞いたような、誰のものでもない音だ。私が言葉にするのは、音そのものより<b>その曲が置かれる情景</b>である。時間帯、温度、光の角度、そこに誰がいて何を思っているのか。情景が立ち上がれば、音は自ずとそれに従う。</p>
<p>この館に二百を超える作品が一つの世界として在るのは、一曲ごとに情景の言葉を積み重ねてきたからだ。技術ではなく、<b>世界観の一貫性</b>こそが核心である。そして量を作れる時代だからこそ、<b>捨てる勇気</b>が質を決める。AIはいくらでも音を出すが、「これは館に置いていい音か」を決めるのは、いつも人間の仕事だ。</p>
<p>この魔導書は、その作法と、実際に作品を生んだ着想の記録である。後半には、ジャンルを横断した五十の着想を、ジャンル・ムード・情景の三層で収めた。あなた自身の一曲を生むための、種として使ってほしい。</p>

<h2>プロンプト設計の型 — 三層</h2>
<p><b>① ジャンル</b>：音の骨格（例：ワールド／ダンス／ハウス／トランス／ジャズ）。まず器を決める。</p>
<p><b>② ムード</b>：感情の温度（例：発射／覚醒／郷愁／神秘）。器に注ぐ熱を決める。</p>
<p><b>③ 情景</b>：時間・場所・光・聴き手・物語。最も大切な層。ここを具体的に書くほど、音は唯一になる。</p>
<div class="tmpl"><b>型のテンプレート：</b>「〔ジャンル〕で、〔ムード〕を帯びた一曲。〔時間帯と光〕の中、〔場所〕に〔聴き手〕がいる。〔起きていること／映像のイメージ〕。」</div>

<h2>作品から学ぶ — 五十の着想</h2>
<p class="lead">以下は実際の作品の設計メモである。各項のムードと情景を、あなたのプロンプトの素材として読み替えてほしい。</p>
{entries}

</body></html>"""

out = "/tmp/magicbook.pdf"
HTML(string=doc).write_pdf(out)
import os
print("DONE", round(os.path.getsize(out)/1024/1024, 2), "MB / entries", len(sel))
