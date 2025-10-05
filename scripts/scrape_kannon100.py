#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
観音百籤（浅草観音版）スクレイパー / Wayback優先
- chance.org.tw は TLS/地域で弾かれるケースがあるため、CDX APIで最新スナップショットを取得し、それを取得する
- temples.tw も Wayback にフォールバック
出力:
  <out>/kannon_100.csv, <out>/kannon_100_raw.json

使い方（最短）:
  pip install requests beautifulsoup4
  python scripts/scrape_kannon100.py --base chance --out tempdata --force-wayback
"""
import re, csv, json, time, argparse
from pathlib import Path
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"}
CDX_API = "https://web.archive.org/cdx/search/cdx"

SITES = {
    "temples": {
        "index": "https://temples.tw/stick/fs_akt100",  # 変わりやすいので Wayback を基本に
    },
    "chance": {
        "index": "https://www.chance.org.tw/籤詩集/淺草金龍山觀音寺一百籤/籤詩網‧淺草金龍山觀音寺一百籤.htm"
    },
}

def fetch(url: str, session: requests.Session, timeout=20) -> str:
    r = session.get(url, headers=HEADERS, timeout=timeout)
    r.raise_for_status()
    r.encoding = r.apparent_encoding or "utf-8"
    return r.text

def wayback_snapshot_url(session: requests.Session, original_url: str, from_year="2008", to_year="2026") -> str | None:
    """
    CDX APIで original_url の最新スナップショットを取得し、スナップショットURLを返す
    """
    params = {
        "url": original_url,
        "output": "json",
        "filter": "statuscode:200",
        "limit": "1",
        "from": from_year,
        "to": to_year,
        "fl": "timestamp,original,statuscode"
    }
    try:
        res = session.get(CDX_API, params=params, headers=HEADERS, timeout=20)
        res.raise_for_status()
        data = res.json()
        # 先頭はヘッダ行、2行目以降にデータ
        if isinstance(data, list) and len(data) >= 2:
            ts, orig, sc = data[1]
            return f"https://web.archive.org/web/{ts}/{orig}"
    except Exception as e:
        print(f"[WARN] CDX lookup failed for {original_url}: {e}")
    return None

def fetch_with_wayback_only(session: requests.Session, original_url: str, timeout=20) -> str:
    """
    originに触れず、Waybackのスナップショットだけで取得
    """
    snap = wayback_snapshot_url(session, original_url)
    if not snap:
        raise RuntimeError(f"No snapshot for {original_url}")
    r = session.get(snap, headers=HEADERS, timeout=timeout)
    r.raise_for_status()
    r.encoding = r.apparent_encoding or "utf-8"
    return r.text

# ---------- temples: indexからリンクを拾う（Wayback優先） ----------
def discover_links_from_temples(index_html: str, base_url: str):
    soup = BeautifulSoup(index_html, "html.parser")
    links = []
    for a in soup.find_all("a", href=True):
        href = a["href"]
        text = (a.get_text() or "").strip()
        if href.startswith("/"):
            href = "https://temples.tw" + href
        elif not href.startswith("http"):
            href = base_url.rstrip("/") + "/" + href.lstrip("./")
        if re.search(r"(第\s*\d{1,3}\s*籤|第\d{1,3}籤)", text) or re.search(r"(第\s*\d{1,3}\s*籤|第\d{1,3}籤)", href):
            links.append(href)
    out, seen = [], set()
    for h in links:
        if h not in seen:
            out.append(h); seen.add(h)
    return out

# ---------- chance: 直URLを生成 ----------
def chance_url(num: int) -> str:
    base = "https://www.chance.org.tw"
    p1 = "/" + quote("籤詩集")
    p2 = "/" + quote("淺草金龍山觀音寺一百籤")
    p3 = "/" + quote("籤詩網‧淺草金龍山觀音寺一百籤") + f"__第{num:03d}籤.htm"
    return base + p1 + p2 + p3

def extract_poem(html: str):
    soup = BeautifulSoup(html, "html.parser")
    title = (soup.title.get_text().strip() if soup.title else "")
    h1 = soup.find("h1")
    header = h1.get_text(strip=True) if h1 else title

    text = soup.get_text("\n", strip=True)
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]

    def is_poem_line(s):
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

def number_from_header(header: str):
    m = re.search(r"第\s*(\d{1,3})\s*籤", header) or re.search(r"第(\d{1,3})籤", header)
    return int(m.group(1)) if m else None

def run_temples_wayback(session: requests.Session, delay=0.5):
    base = SITES["temples"]["index"].rsplit("/", 1)[0]
    try:
        idx_html = fetch_with_wayback_only(session, SITES["temples"]["index"])
    except Exception as e:
        print(f"[WARN] temples index snapshot not found: {e}")
        return []
    links = discover_links_from_temples(idx_html, base)
    print(f"[INFO] temples links: {len(links)}")
    results, seen = [], set()
    for url in links:
        if url in seen: continue
        try:
            html = fetch_with_wayback_only(session, url)
        except Exception as e:
            print(f"[WARN] temples fetch fail: {url} -> {e}")
            continue
        header, poem = extract_poem(html)
        num = number_from_header(header)
        if not poem:
            soup = BeautifulSoup(html, "html.parser")
            txt = soup.get_text("\n", strip=True)[:400]
            poem = [txt]
        results.append({"number": num, "header": header, "poem_lines": poem, "source_url": url})
        seen.add(url)
        time.sleep(delay)
    return results

def run_chance_wayback(session: requests.Session, delay=0.4):
    results = []
    for n in range(1, 101):
        url = chance_url(n)
        try:
            html = fetch_with_wayback_only(session, url)
        except Exception as e:
            print(f"[WARN] chance snapshot missing: {url} -> {e}")
            continue
        header, poem = extract_poem(html)
        num = number_from_header(header) or n
        if not poem:
            soup = BeautifulSoup(html, "html.parser")
            txt = soup.get_text("\n", strip=True)[:400]
            poem = [txt]
        results.append({"number": num, "header": header, "poem_lines": poem, "source_url": url})
        time.sleep(delay)
    return results

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="chance", choices=["temples", "chance", "auto"])
    ap.add_argument("--out", default="tempdata")
    ap.add_argument("--delay", type=float, default=0.6)
    ap.add_argument("--proxy", default=None)
    ap.add_argument("--force-wayback", action="store_true", help="originへは繋がず Wayback のみを使う（推奨）")
    args = ap.parse_args()

    outdir = Path(args.out); outdir.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    if args.proxy: session.proxies.update({"http": args.proxy, "https": args.proxy})

    results = []
    order = ["temples","chance"] if args.base=="auto" else [args.base]
    for key in order:
        if key == "temples":
            r = run_temples_wayback(session, delay=args.delay)
        else:
            r = run_chance_wayback(session, delay=args.delay)
        nums = {x["number"] for x in r if x.get("number")}
        print(f"[INFO] {key}: got {len(nums)} numbers (wayback)")
        results.extend(r)

    # 整理
    numbered = [r for r in results if r.get("number")]
    numbered.sort(key=lambda x: x["number"])
    dedup, seen = [], set()
    for r in numbered:
        n = r["number"]
        if n not in seen:
            dedup.append(r); seen.add(n)
    results = dedup

    raw_path = outdir/"kannon_100_raw.json"
    csv_path = outdir/"kannon_100.csv"
    json.dump(results, open(raw_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f); w.writerow(["number","header","poem","source_url"])
        for r in results:
            poem_str = " / ".join(r["poem_lines"])
            w.writerow([r["number"], r["header"], poem_str, r["source_url"]])

    missing = [n for n in range(1,101) if n not in {r['number'] for r in results if r['number'] is not None}]
    print(f"[OK] wrote: {csv_path} / {raw_path}")
    if missing: print(f"[NOTE] missing numbers: {missing}")
    else: print("[OK] 1..100 captured (wayback)")

if __name__ == "__main__":
    main()
