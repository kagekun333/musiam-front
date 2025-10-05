#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json, re, argparse
from pathlib import Path

def load_json(p): return json.loads(Path(p).read_text(encoding="utf-8"))

KANJI_DIGITS = ["一","二","三","四","五","六","七","八","九"]
def int_to_kanji(n:int)->str:
    if n==100: return "百"
    tens, ones = divmod(n,10)
    s = ""
    if tens>0: s += ("" if tens==1 else KANJI_DIGITS[tens-1]) + "十"
    if ones>0: s += KANJI_DIGITS[ones-1]
    return s or "〇"

en_ord_units = ["Zero","First","Second","Third","Fourth","Fifth","Sixth","Seventh","Eighth","Ninth","Tenth",
                "Eleventh","Twelfth","Thirteenth","Fourteenth","Fifteenth","Sixteenth","Seventeenth","Eighteenth","Nineteenth","Twentieth"]
def to_ordinal(n:int)->str:
    if n==100: return "One Hundredth"
    if n<=20: return en_ord_units[n]
    tens_names = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"]
    tens, ones = divmod(n,10)
    base = tens_names[tens] if 0<=tens<len(tens_names) else ""
    return base if ones==0 else f"{base}-{en_ord_units[ones]}"

def split_entries(text):
    lines = text.replace("\r\n","\n").split("\n")
    idx = []
    for i,l in enumerate(lines):
        if re.match(r"^第[\d一二三四五六七八九十百〇]+", l) or re.match(r"^\s*(\d{1,3})\s*(?:[:：]|$)", l):
            idx.append(i)
    if not idx or idx[0]!=0: idx = [0] + idx
    idx = sorted(set(idx))
    idx2 = idx + [len(lines)]
    entries = []
    for a,b in zip(idx2[:-1], idx2[1:]):
        block = "\n".join(lines[a:b]).strip()
        if block: entries.append(block)
    return entries

def parse_id(header):
    m = re.search(r"^第([\d一二三四五六七八九十百〇]+)", header)
    if m:
        token = m.group(1)
        if token.isdigit(): return int(token)
        if token=="百": return 100
        if "十" in token:
            a,b = token.split("十") if "十" in token else ("","")
            tens = 1 if a=="" else (KANJI_DIGITS.index(a)+1 if a in KANJI_DIGITS else 0)
            ones = (KANJI_DIGITS.index(b)+1 if b in KANJI_DIGITS else 0)
            return tens*10+ones
        if token in KANJI_DIGITS: return KANJI_DIGITS.index(token)+1
    m = re.match(r"^\s*(\d{1,3})\b", header)
    if m: return int(m.group(1))
    return None

def is_poem_line(line):
    s = line.strip()
    if not s: return False
    han = len(re.findall(r"[\u4e00-\u9fff]", s))
    return 4 <= han <= 7 and (":" not in s and "：" not in s)

def clean_noise(s):
    s = re.sub(r"===\s*TEXT START\s*===\s*", "", s, flags=re.I)
    return s.strip()

def extract_body_without_poem(block):
    if not block: return ""
    lines = block.replace("\r\n","\n").split("\n")
    if lines: lines = lines[1:]  # drop header
    kept = []
    for l in lines:
        if is_poem_line(l): continue
        kept.append(l)
    out = []
    for l in kept:
        if l.strip()=="" and (not out or out[-1].strip()==""): continue
        out.append(l.rstrip())
    return clean_noise("\n".join(out).strip())

def map_by_id(entries):
    m = {}
    for e in entries:
        head = e.split("\n",1)[0]
        did = parse_id(head)
        if did is not None and 1<=did<=100:
            m[did] = e
    return m

def normalize_categories(text, alias_map):
    if not text: return text
    lines = text.split("\n")
    out = []
    for ln in lines:
        if ":" in ln or "：" in ln:
            sep = ":" if ":" in ln else "："
            key, val = ln.split(sep,1)
            norm_key = key.strip()
            for canonical, alist in alias_map.items():
                all_keys = [canonical] + alist
                if any(norm_key == a for a in all_keys):
                    norm_key = canonical; break
            out.append(f"{norm_key}{sep}{val.strip()}")
        else:
            out.append(ln)
    return "\n".join(out)

def main():
    ap = argparse.ArgumentParser(description="Sync Omikuji ja/en.txt from core.json + rank_map.json + bak files")
    ap.add_argument("--core", required=True)
    ap.add_argument("--rankmap", required=True)
    ap.add_argument("--ja_bak", required=True)
    ap.add_argument("--en_bak", required=True)
    ap.add_argument("--rank_en_map", required=True)
    ap.add_argument("--alias_ja", default="")
    ap.add_argument("--alias_en", default="")
    ap.add_argument("--out_dir", required=True)
    args = ap.parse_args()

    core = load_json(args.core)
    rank_map = load_json(args.rankmap)
    rank_en = load_json(args.rank_en_map)
    alias_ja = load_json(args.alias_ja) if args.alias_ja else {}
    alias_en = load_json(args.alias_en) if args.alias_en else {}

    core_by_id = {int(x["id"]): x for x in core}

    ja_bak = Path(args.ja_bak).read_text(encoding="utf-8", errors="ignore")
    en_bak = Path(args.en_bak).read_text(encoding="utf-8", errors="ignore")
    ja_bak_by = map_by_id(split_entries(ja_bak))
    en_bak_by = map_by_id(split_entries(en_bak))

    out_dir = Path(args.out_dir); out_dir.mkdir(parents=True, exist_ok=True)

    report = {"total":0,"rank_overrides":[], "missing_in_bak":[]}
    ja_out, en_out = [], []

    for i in range(1,101):
        c = core_by_id.get(i)
        if not c: continue
        report["total"] += 1
        final_rank = rank_map.get(str(i), c.get("rank","吉"))
        if final_rank != c.get("rank",""):
            report["rank_overrides"].append({"id":i,"core_rank":c.get("rank",""),"final_rank":final_rank})

        ja_header = f"第{int_to_kanji(i)}　{final_rank}"
        en_header = f"{to_ordinal(i)}: {rank_en.get(final_rank,'Good Fortune')}"

        poems = [re.sub(r"[\u0020\u3000]+","", p) for p in c.get("poem_kanji", [])]

        ja_body = extract_body_without_poem(ja_bak_by.get(i,""))
        en_body = extract_body_without_poem(en_bak_by.get(i,""))
        if i not in ja_bak_by: report["missing_in_bak"].append({"lang":"ja","id":i})
        if i not in en_bak_by: report["missing_in_bak"].append({"lang":"en","id":i})

        ja_body = normalize_categories(ja_body, alias_ja) if ja_body else ja_body
        en_body = normalize_categories(en_body, alias_en) if en_body else en_body

        ja_block = "\n".join([ja_header, *poems] + ([ja_body] if ja_body else [])).strip()
        en_block = "\n".join([en_header] + ([en_body] if en_body else [])).strip()
        ja_out.append(ja_block)
        en_out.append(en_block)

    (out_dir/"ja.txt").write_text("\n\n".join(ja_out)+"\n", encoding="utf-8")
    (out_dir/"en.txt").write_text("\n\n".join(en_out)+"\n", encoding="utf-8")
    (out_dir/"sync_report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

if __name__ == "__main__":
    main()
