#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patch_missing_kannon.py
- tempdata/kannon_100_raw.json を読み、指定番号だけ Wayback (CDX) で再取得して追記
- chance.org.tw の URL 表記揺れを多数試行（「金龍山」の有無・記号差異・全角/半角）
使い方:
  python scripts/patch_missing_kannon.py --nums 38,57,60,62,71,72,73,74,89 --raw tempdata/kannon_100_raw.json --csv tempdata/kannon_100.csv
"""

import re
import json
import csv
import time
import argparse
from pathlib import Path
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"}
CDX_API = "https://web.archive.org/cdx/search/cdx"

def cdx_latest_snapshot(session: requests.Session, original_url: str, timeout=25):
    params = {
        "url": original_url,
        "output": "json",
        "filter": "statuscode:200",
        "limit": "1",
        "from": "2008",
        "to": "2026",
        "fl": "timestamp,original,statuscode"
    }
    r = session.get(CDX_API, params=params, headers=HEADERS, timeout=timeout)
    r.raise_for_status()
    js = r.json()
    if isinstance(js, list) and len(js) >= 2:
        ts, orig, sc = js[1]
        return f"https://web.archive.org/web/{ts}/{orig}"
    return None

def fetch_wayback(session: requests.Session, orig_url: str, timeout=30):
    snap = cdx_latest_snapshot(session, orig_url, timeout=max(20, timeout-5))
    if not snap:
        raise RuntimeError(f"No snapshot for {orig_url}")
    r = session.get(snap, headers=HEADERS, timeout=timeout)
    r.raise_for_status()
    r.encoding = r.apparent_encoding or "utf-8"
    return r.text

def extract_poem(html: str):
    soup = BeautifulSoup(html, "html.parser")
    title = soup.title.get_text().strip() if soup.title else ""
    h1 = soup.find("h1")
    header = h1.get_text(strip=True) if h1 else title

    text = soup.get_text("\n", strip=True)
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]

    def is_poem_line(s: str):
        han = len(re.findall(r"[\u4e00-\u9fff]", s))
        return (han >= 4) and (any(p in s for p in ["，", "。", "．", "、"]))
    poem_lines = [ln for ln in lines if is_poem_line(ln)]

    poem = []
    for i in range(len(poem_lines) - 3):
        chunk = poem_lines[i:i+4]
        lens = [len(x) for x in chunk]
        if max(lens) - min(lens) <= 12:
            poem = chunk; break
    if not poem and poem_lines:
        poem = poem_lines[:4]
    return header, poem

def chance_variants(num: int):
    """
    チャンスページの多パターン生成：
    - ディレクトリ名：『淺草金龍山觀音寺一百籤』『淺草觀音寺一百籤』
    - 中央記号：『‧』『・』『.』『_』『 』（空白）
    - ファイル末尾：__第%03d籤.htm / _第%03d籤.htm / 第%03d籤.htm
    """
    base = "https://www.chance.org.tw"
    dirs = [
        "籤詩集/淺草金龍山觀音寺一百籤",
        "籤詩集/淺草觀音寺一百籤",
    ]
    mids = ["‧", "・", ".", "_", " "]  # 記号の揺れ
    tails = [
        "__第{n:03d}籤.htm",
        "_第{n:03d}籤.htm",
        "第{n:03d}籤.htm",
    ]
    for d in dirs:
        for mid in mids:
            name = f"籤詩網{mid}{d.split('/')[-1]}"
            for t in tails:
                file = t.format(n=num)
                # それぞれ URL エンコード
                p = "/" + "/".join(quote(seg) for seg in d.split("/")) + "/" + quote(name) + file
                yield base + p

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--nums", required=True, help="例: 38,57,60")
    ap.add_argument("--raw", default="tempdata/kannon_100_raw.json")
    ap.add_argument("--csv", default="tempdata/kannon_100.csv")
    ap.add_argument("--delay", type=float, default=0.5)
    args = ap.parse_args()

    want = sorted({int(x) for x in re.split(r"[,\s]+", args.nums.strip()) if x})
    raw_path = Path(args.raw)
    csv_path = Path(args.csv)
    if not raw_path.exists():
        print(f"[ERR] raw json not found: {raw_path}")
        return

    data = json.loads(raw_path.read_text(encoding="utf-8"))
    have = {r["number"] for r in data if r.get("number")}
    target = [n for n in want if n not in have]
    if not target:
        print("[OK] nothing to patch (all present).")
        return

    sess = requests.Session()
    patched = 0
    for n in target:
        hit = False
        for url in chance_variants(n):
            try:
                html = fetch_wayback(sess, url)
                header, poem = extract_poem(html)
                num = n
                if not poem:
                    soup = BeautifulSoup(html, "html.parser")
                    txt = soup.get_text("\n", strip=True)[:400]
                    poem = [txt]
                data.append({
                    "number": num,
                    "header": header,
                    "poem_lines": poem,
                    "source_url": url,
                })
                print(f"[OK] patched {n} via {url}")
                patched += 1
                hit = True
                break
            except Exception as e:
                print(f"[TRY] {n} miss: {url} -> {e}")
                time.sleep(args.delay)
        if not hit:
            print(f"[MISS] {n}: no snapshot across variants.")

    # 整理＆保存
    data2 = [r for r in data if r.get("number")]
    data2.sort(key=lambda x: x["number"])
    dedup, seen = [], set()
    for r in data2:
        n = r["number"]
        if n not in seen:
            dedup.append(r); seen.add(n)
    json.dump(dedup, open(raw_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f); w.writerow(["number","header","poem","source_url"])
        for r in dedup:
            poem_str = " / ".join(r["poem_lines"])
            w.writerow([r["number"], r["header"], poem_str, r["source_url"]])

    missing = [n for n in range(1,101) if n not in {r['number'] for r in dedup if r['number'] is not None}]
    print(f"[DONE] patched={patched}  missing={missing}")
    if missing:
        print("[NOTE] 上記が残れば temples.tw の Wayback も試す追加パターンを差し込み可能。")

if __name__ == "__main__":
    main()
