#!/usr/bin/env python3
# 商用BGM向け30曲を選び、WAV→MP3変換（再開可能）
import os, json, glob, subprocess, shutil
OUT = "/sessions/eloquent-lucid-lovelace/mnt/outputs"
data = json.load(open(f"{OUT}/meta_all.json", encoding="utf-8"))
OD = "/tmp/bgmlic"; os.makedirs(OD, exist_ok=True)

# BGM適性の高いジャンル優先（店舗/映像で流しやすい）
PREF = ["ワールド","ハウス","ニューエイジ","ダウンテンポ","エレクトロニカ","ジャズ","トランス","アンビエント","チルアウト"]
flat = []
for r in data:
    adir = r["audio_dir"]
    for t in r["tracks"]:
        if not t.get("t"): continue
        wavs = glob.glob(os.path.join(adir, "*.wav"))
        wav = next((w for w in wavs if t["t"].lower() in os.path.basename(w).lower()), wavs[0] if wavs else None)
        if not wav: continue
        g = t.get("genre") or r.get("genre") or "—"
        notes = (t.get("notes") or "")
        inst = ("インスト" in notes) or ("instrumental" in notes.lower())
        flat.append({"title": t["t"], "genre": g, "wav": wav, "inst": inst})

# 優先ジャンル & インスト優先で30曲・多様に
def score(t):
    s = 0
    if t["genre"] in PREF: s += (len(PREF) - PREF.index(t["genre"]))
    if t["inst"]: s += 3
    return s
flat.sort(key=score, reverse=True)
sel, seen_g = [], {}
for t in flat:
    if len([x for x in sel if x["genre"] == t["genre"]]) >= 6:  # 1ジャンル最大6
        continue
    if t["title"] in [x["title"] for x in sel]: continue
    sel.append(t)
    if len(sel) >= 30: break
json.dump(sel, open(f"{OUT}/bgm_license_sel.json", "w"), ensure_ascii=False, indent=0)

done = 0
for i, t in enumerate(sel, 1):
    out = os.path.join(OD, f"{i:02d} {t['title']}.mp3")
    if os.path.exists(out): continue
    subprocess.run(["ffmpeg","-y","-loglevel","error","-i",t["wav"],"-b:a","256k",out], check=False)
    done += 1
    if done % 5 == 0: print(f"...{i}/30 converted", flush=True)
print("DONE mp3:", len(glob.glob(os.path.join(OD,'*.mp3'))), "/30")
