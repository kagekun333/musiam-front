# scripts/omikuji_auto_grade_refine.py
# 目的: 既訳JSONを "採点→修正→再採点" し、スコア>=targetで自動確定
import argparse, json, re, sys, time
from pathlib import Path
from typing import Dict, Any, List, Tuple
from copy import deepcopy
from openai import OpenAI

EN_MAX = 48
JA_MAX = 28
BANNED_WORDS_RE  = re.compile(r"\b(I|me|my|mine|we|us|our|ours|you|your|yours)\b", re.IGNORECASE)
BANNED_PUNCT_RE  = re.compile(r"[,\?\!\u2026\u2014;:\.]", re.UNICODE)  # , ? ! … — ; :
GLOSSARY_FIXES = [
    (re.compile(r"\bLord\s+Yin\b", re.IGNORECASE), "hidden grace"),
    (re.compile(r"\bstupa\b", re.IGNORECASE), "pagoda"),
    (re.compile(r"\bfamily path\b", re.IGNORECASE), "family fortunes"),
    (re.compile(r"\bone stick of incense\b", re.IGNORECASE), "a single prayer"),
]

def sanitize_en(s: str) -> str:
    if not s: return s
    s = BANNED_PUNCT_RE.sub("", s)           # 句読点除去
    s = re.sub(r"\s+", " ", s).strip()
    # 人称の弱体化
    if BANNED_WORDS_RE.search(s):
        s = re.sub(r"\b[Yy]our\b\s+", "", s)
        s = re.sub(r"\b[Yy]ou\b\s+", "", s)
        s = re.sub(r"\b[Ii]\b\s*", "", s)
        s = re.sub(r"\b[Ww]e\b\s*", "", s)
    # glossary軽矯正
    for pat, rep in GLOSSARY_FIXES:
        s = pat.sub(rep, s)
    # 長さ調整（機能語間引き）
    if len(s) > EN_MAX:
        for pat in [r"\bthat\b", r"\bthe\b", r"\band\b", r"\bthen\b", r"\bso\b", r"\bwill\b"]:
            s2 = re.sub(pat, "", s, flags=re.IGNORECASE)
            s2 = re.sub(r"\s{2,}", " ", s2).strip()
            if len(s2) < len(s):
                s = s2
            if len(s) <= EN_MAX: break
    return s[:EN_MAX].rstrip()

def lint_lines(lines: List[Dict[str,str]]) -> Tuple[List[Dict[str,str]], List[str]]:
    errs = []
    for i,x in enumerate(lines):
        ja, en = (x.get("ja","") or "").strip(), (x.get("en","") or "").strip()
        if not ja or not en: errs.append(f"line{i+1}: empty")
        if len(ja) > JA_MAX: errs.append(f"line{i+1}: JA too long ({len(ja)})")
        if BANNED_WORDS_RE.search(en): errs.append(f"line{i+1}: pronoun in EN")
        if BANNED_PUNCT_RE.search(en): errs.append(f"line{i+1}: punctuation in EN")
        if len(en) > EN_MAX: errs.append(f"line{i+1}: EN too long ({len(en)})")
    # sanitize pass（副作用OK）
    for x in lines:
        x["en"] = sanitize_en(x["en"])
    # 再チェック
    errs2 = []
    for i,x in enumerate(lines):
        en = x["en"]
        if BANNED_WORDS_RE.search(en): errs2.append(f"line{i+1}: pronoun in EN")
        if BANNED_PUNCT_RE.search(en): errs2.append(f"line{i+1}: punctuation in EN")
        if len(en) > EN_MAX: errs2.append(f"line{i+1}: EN too long ({len(en)})")
    return lines, (errs + errs2)

def build_judge_prompt(item: Dict[str,Any], glossary_note: str, target: int) -> List[Dict[str,str]]:
    # 評価用プロンプト（JSONで返す）
    sysmsg = (
        "You are a strict reviewer for translations of Classical Chinese five-character quatrains (omikuji). "
        "Score 0–100 with this rubric: fidelity(0-40), JA naturalness(0-15), EN poetic naturalness(0-20), "
        "imagery preservation(0-10), style compliance(0-10), glossary consistency(0-5). "
        "Style rules: EN has no punctuation (, . ? ! … — ; :), no personal pronouns (I/you/we), EN line<=48 chars; "
        "JA concise; preserve imagery; follow glossary hints if relevant. "
        "Return ONLY JSON: {\"score\":int, \"subscores\":{\"fidelity\":int,...}, "
        "\"pass\":bool, \"issues\":[{\"line\":1..4, \"ja\":\"...\", \"en\":\"...\", \"hint\":\"...\"}], "
        "\"summary\":\"...\" } "
        f"Threshold is {target}."
    )
    poem = {
        "id": item["id"],
        "orig": [ln["orig"] for ln in item["lines"]],
        "ja":   [ln["ja"]   for ln in item["lines"]],
        "en":   [ln["en"]   for ln in item["lines"]],
        "glossary": glossary_note
    }
    return [
        {"role":"system","content": sysmsg},
        {"role":"user","content": json.dumps(poem, ensure_ascii=False)}
    ]

def build_improve_prompt(item: Dict[str,Any], judge_json: Dict[str,Any], glossary_note: str) -> List[Dict[str,str]]:
    sysmsg = (
        "You are a careful fixer. Improve the 4 lines faithfully based on the judge issues. "
        "Do not add explanations. Keep classical imagery. EN: no punctuation (, . ? ! … — ; :), "
        "no personal pronouns, per-line <=48 chars. JA concise. "
        "Output ONLY JSON: {\"lines\":[{\"ja\":\"...\",\"en\":\"...\"}×4]}"
    )
    payload = {
        "id": item["id"],
        "orig": [ln["orig"] for ln in item["lines"]],
        "current": [{"ja":ln["ja"], "en":ln["en"]} for ln in item["lines"]],
        "issues": judge_json.get("issues", []),
        "glossary": glossary_note
    }
    return [
        {"role":"system","content": sysmsg},
        {"role":"user","content": json.dumps(payload, ensure_ascii=False)}
    ]

def chat_json(client: OpenAI, model: str, messages: List[Dict[str,str]], temperature: float=0.0) -> Dict[str,Any]:
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        response_format={"type":"json_object"}
    )
    raw = resp.choices[0].message.content
    try:
        return json.loads(raw)
    except Exception as e:
        raise RuntimeError(f"JSON parse failed: {e}\nRAW:\n{raw}")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--model", default="gpt-4o-mini")     # improveの第一候補
    ap.add_argument("--judge-model", default="gpt-4.1")   # 採点は高精度
    ap.add_argument("--passes", type=int, default=3)
    ap.add_argument("--target", type=int, default=90)
    ap.add_argument("--ids", type=str, default="")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    src = Path(args.input)
    out = Path(args.output)
    data = json.loads(src.read_text(encoding="utf-8"))
    ids_filter = set(int(x) for x in args.ids.split(",") if x.strip()) if args.ids.strip() else set()

    client = OpenAI(timeout=60.0)
    updated = deepcopy(data)

    glossary_note = (
        "陰公/隂公=hidden grace/hidden aid; 浮圖=pagoda; 青霄=azure sky; 雲梯=cloud ladder; "
        "東君=the Lord of Spring; 祿馬=fortune and steed; 侯手印=marquis seal; 禾刀=profit (ideographic hint)."
    )

    def judge(item) -> Dict[str,Any]:
        msgs = build_judge_prompt(item, glossary_note, args.target)
        return chat_json(client, args.judge_model, msgs, temperature=0.0)

    def improve(item, judge_json, escalate=False) -> List[Dict[str,str]]:
        mdl = args.model if not escalate else args.judge_model
        msgs = build_improve_prompt(item, judge_json, glossary_note)
        obj = chat_json(client, mdl, msgs, temperature=0.0)
        lines = obj.get("lines", [])
        if not isinstance(lines, list) or len(lines)!=4:
            raise RuntimeError("improve: invalid lines")
        return [{"ja":x.get("ja","").strip(), "en":x.get("en","").strip()} for x in lines]

    ok_cnt, changed_cnt = 0, 0
    logs = []

    for it in updated:
        if ids_filter and it["id"] not in ids_filter:
            continue

        # 1) 機械Lintだけ先に通す（外形減点の自動回収）
        base_lines = [{"ja":ln["ja"], "en":ln["en"]} for ln in it["lines"]]
        base_lines, _ = lint_lines(base_lines)
        for idx, ln in enumerate(it["lines"]):
            ln["en"] = base_lines[idx]["en"]

        # 2) 採点
        report = judge(it)
        score = int(report.get("score", 0))
        if score >= args.target:
            ok_cnt += 1
            logs.append(f"[OK] id={it['id']} score={score}")
            continue

        # 3) 反復リライト
        orig_snapshot = [{"ja":ln["ja"], "en":ln["en"]} for ln in it["lines"]]
        improved = False
        for p in range(1, args.passes+1):
            # mini → ダメなら hard へ
            escalate = (p == args.passes)
            new_lines = improve(it, report, escalate=escalate)
            new_lines, _ = lint_lines(new_lines)

            # 置換反映
            for idx, ln in enumerate(it["lines"]):
                ln["ja"] = new_lines[idx]["ja"]
                ln["en"] = new_lines[idx]["en"]

            # 再採点
            report = judge(it)
            score = int(report.get("score", 0))
            if score >= args.target:
                improved = True
                changed_cnt += 1
                logs.append(f"[FIXED] id={it['id']} pass={p} score={score} escalate={escalate}")
                break

        if not improved:
            # 失敗したら原状維持（安全）
            for idx, ln in enumerate(it["lines"]):
                ln["ja"] = orig_snapshot[idx]["ja"]
                ln["en"] = orig_snapshot[idx]["en"]
            logs.append(f"[FAIL] id={it['id']} last_score={score} issues={len(report.get('issues',[]))}")

    # 出力
    if args.dry_run:
        print("\n".join(logs[:200]))
        print(f"[SUMMARY] ok={ok_cnt}, improved={changed_cnt}, total={len(updated)}")
        return

    # .bak
    if out.exists():
        bak = out.with_suffix(out.suffix + f".{int(time.time())}.bak")
        bak.write_text(out.read_text(encoding="utf-8"), encoding="utf-8")
        print(f"[BACKUP] -> {bak}")
    out.write_text(json.dumps(updated, ensure_ascii=False, indent=2), encoding="utf-8")
    print("\n".join(logs[:200]))
    print(f"[DONE] wrote -> {out}")
    print(f"[SUMMARY] ok={ok_cnt}, improved={changed_cnt}, total={len(updated)}")

if __name__ == "__main__":
    main()
