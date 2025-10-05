#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json, re, io, sys, os

ROOT = "src/data/omikuji"
JA_IN  = os.path.join(ROOT, "ja.txt")
EN_IN  = os.path.join(ROOT, "en.txt")
JA_OUT = os.path.join(ROOT, "ja.with_trans.txt")
EN_OUT = os.path.join(ROOT, "en.with_trans.txt")
MISS   = os.path.join(ROOT, "line_translation_missing.json")
CORE   = os.path.join(ROOT, "core.json")

def read_utf8(p):
    with io.open(p, "r", encoding="utf-8") as f:
        return f.read().replace("\ufeff","")

def write_utf8(p, s):
    with io.open(p, "w", encoding="utf-8", newline="\n") as f:
        f.write(s)

def split_blocks(text):
    pat = r"(?m)^(?=第[一二三四五六七八九十百]+　|(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|(?:Twenty|Thirty|Forty|Fifty|Sixty|Seventy|Eighty|Ninety)(?:-(?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth))?):\s)"
    import re
    return list(filter(lambda x: x.strip(), re.split(pat, text)))

def tail_keep(old_block, poems_clean):
    lines = old_block.splitlines()
    i, m = 1, 0
    while i < len(lines) and m < 4:
        k = re.sub(r"[\u3000\u0020]", "", lines[i].strip()) if i < len(lines) else ""
        if k and k == poems_clean[m]:
            i += 1  # skip poem line
            # if next is a translation-like free line (non-empty, not 5-cjk, not label), skip it
            nxt = (lines[i].strip() if i < len(lines) else "")
            is5  = bool(re.match(r"^[\u3400-\u9FFF\uF900-\uFAFF]{5}$", re.sub(r"[\u3000\u0020]","",nxt)))
            isLb = bool(re.match(r"^([^：:]+)\s*[:：]\s*(.*)$", nxt))
            if nxt and (not is5) and (not isLb):
                i += 1
            m += 1
            continue
        i += 1
    return "\n".join(lines[i:]).strip()

def inject_by_core(base_text, trans_dict, core_poems_by_id):
    blocks = split_blocks(base_text)
    out = []
    missing = set()
    for idx, b in enumerate(blocks):
        bid = idx + 1
        poems = core_poems_by_id.get(bid, [])
        header = b.splitlines()[0] if b.splitlines() else ""
        # poems_clean already space-removed
        tail = tail_keep(b, poems)
        body = []
        for p in poems:
            body.append(p)  # poem (5-cjk, spaceless)
            t = (trans_dict.get(p, "") or "").strip()
            if not t:
                missing.add(p)
            body.append(t)
        block_new = "\n".join([header] + body + ([tail] if tail else []))
        out.append(block_new)
    return "\n".join(out) + "\n", sorted(list(missing))

def main():
    if not os.path.exists(JA_IN) or not os.path.exists(EN_IN) or not os.path.exists(CORE):
        sys.stderr.write("Required files missing. Need ja.txt, en.txt and core.json under src/data/omikuji.\n")
        sys.exit(2)
    core = json.load(io.open(CORE,"r",encoding="utf-8"))
    core_poems_by_id = { int(x["id"]): [ re.sub(r"[\u3000\u0020]","",str(s)) for s in (x.get("poem_kanji") or []) ] for x in core }

    tja = json.load(io.open("scripts/omikuji/translations_ja.json","r",encoding="utf-8"))
    ten = json.load(io.open("scripts/omikuji/translations_en.json","r",encoding="utf-8"))
    # 正規化：キーを「スペース除去」した5字に揃える
    tja = { re.sub(r"[\u3000\u0020]","",k): v for k,v in tja.items() }
    ten = { re.sub(r"[\u3000\u0020]","",k): v for k,v in ten.items() }

    ja_in = read_utf8(JA_IN)
    en_in = read_utf8(EN_IN)
    ja_out, miss_ja = inject_by_core(ja_in, tja, core_poems_by_id)
    en_out, miss_en = inject_by_core(en_in, ten, core_poems_by_id)
    write_utf8(JA_OUT, ja_out.replace("\ufeff",""))
    write_utf8(EN_OUT, en_out.replace("\ufeff",""))
    miss = {"ja": miss_ja, "en": miss_en}
    write_utf8(MISS, json.dumps(miss, ensure_ascii=False, indent=2))
    print("[add_line_translations] wrote:", JA_OUT, EN_OUT)
    print("[missing]", miss)

if __name__ == "__main__":
    main()