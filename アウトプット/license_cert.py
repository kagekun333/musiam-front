#!/usr/bin/env python3
from weasyprint import HTML
import json, datetime
sel = json.load(open("/sessions/eloquent-lucid-lovelace/mnt/outputs/bgm_license_sel.json", encoding="utf-8"))
rows = "".join(f"<li>{i:02d}. {t['title']}（{t['genre']}）</li>" for i, t in enumerate(sel, 1))
today = datetime.date.today().strftime("%Y年%m月%d日")
html = f"""<!doctype html><html lang="ja"><head><meta charset="utf-8"><style>
@page {{ size:A4; margin:22mm; }}
*{{font-family:"Noto Serif CJK JP",serif;color:#26221d;}}
h1{{font-size:22pt;text-align:center;color:#a8862c;margin:0 0 2mm;}}
.sub{{text-align:center;color:#7a7066;font-size:10pt;margin-bottom:8mm;}}
h2{{font-size:13pt;color:#a8862c;border-bottom:1px solid #e6ddc8;padding-bottom:2mm;margin:7mm 0 3mm;}}
p,li{{font-size:10.5pt;line-height:1.8;}}
.box{{background:#faf6ea;border-left:3px solid #a8862c;padding:4mm 6mm;margin:3mm 0;}}
ul{{columns:2;font-size:9.5pt;}}
.foot{{margin-top:10mm;font-size:10pt;}}
</style></head><body>
<h1>商用利用許諾証</h1>
<div class="sub">Commercial Use License Certificate ／ 伯爵MUSIAM</div>

<p>本証は、本パックに含まれるオリジナル楽曲（全{len(sel)}曲）について、購入者に対し以下の範囲で<b>商用利用</b>を許諾するものです。</p>

<h2>許諾する利用（OK）</h2>
<div class="box">
YouTube・各種動画/配信のBGM／店舗・施設内のBGM／広告・CM・展示・イベント／
アプリ・ゲーム内BGM／企業のプレゼン・研修資料 など、楽曲を<b>背景・構成要素</b>として用いる商用利用。
</div>

<h2>禁止する利用（NG）</h2>
<div class="box">
楽曲そのもの（またはわずかな加工版）の<b>再販売・再配布・サブライセンス</b>／
楽曲を主たる商品とする利用（音源集としての販売等）／
楽曲が自作であるかのような<b>権利主張・著作権登録</b>／公序良俗に反する用途。
</div>

<h2>クレジット表示</h2>
<p>任意です。表示いただける場合は「Music: ABI伯爵 / 伯爵MUSIAM」を推奨します。</p>

<h2>収録曲</h2>
<ul>{rows}</ul>

<div class="foot">
発行日：{today}<br>
発行者：ABI伯爵（屋号）／伯爵MUSIAM<br>
お問い合わせ：abihakusyaku@gmail.com<br>
<span style="color:#7a7066;font-size:9pt;">※本証は商用利用の許諾を示すものです。権利は発行者に帰属します。</span>
</div>
</body></html>"""
HTML(string=html).write_pdf("/tmp/license_cert.pdf")
print("cert done")
