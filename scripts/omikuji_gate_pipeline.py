import argparse, json, os, re, sys, time
from pathlib import Path
from typing import List, Dict, Any, Tuple
from copy import deepcopy
from openai import OpenAI

# ===== 設定（現実寄りに微緩和）=====
EN_MAX = 48   # 英行の長さ上限（40→48）
JA_MAX = 28   # 和行の長さ上限（25→28）

# 句読点の禁止（英行）
BANNED_WORDS_RE  = re.compile(r"\b(I|me|my|mine|we|us|our|ours|you|your|yours)\b", re.IGNORECASE)
BANNED_PROPER_RE = re.compile(r"\bLord\s+Yin\b", re.IGNORECASE)
BANNED_PUNCT_RE  = re.compile(r"[,\?\!\u2026\u2014;:\.]", re.UNICODE)  # , ? ! … — ; : .

def is_placeholder_ja(s: str) -> bool:
    s = (s or "").strip()
    return s in ("訳準備中", "（訳準備中）")

def is_placeholder_en(s: str) -> bool:
    return (s or "").strip().upper() == "TBD"

def poem_has_placeholder(item: Dict[str, Any]) -> bool:
    for ln in item.get("lines", []):
        if is_placeholder_ja(ln.get("ja","")) or is_placeholder_en(ln.get("en","")):
            return True
    return False

def count_remaining_placeholders(dat) -> int:
    return sum(1 for it in dat for ln in it.get("lines", [])
               if is_placeholder_ja(ln.get("ja","")) or is_placeholder_en(ln.get("en","")))

def build_prompt(batch_items: List[Dict[str, Any]]) -> str:
    tasks = []
    for it in batch_items:
        tasks.append({"id": it["id"], "lines": [ln["orig"] for ln in it["lines"]]})
    return (
        "Translate faithfully from Classical Chinese five-character quatrains into Japanese and English.\n"
        "- Read each 4-line poem as a whole (imagery + causality), then output per-line translations.\n"
        "- DO NOT add subjects (I/you/we), invented proper nouns, or explanations.\n"
        "- Keep classical imagery. Be concise.\n"
        "- Return ONLY JSON as specified below.\n"
        "- Each EN line MUST contain NO punctuation (no comma/period/question/exclamation/ellipsis/em-dash/colon/semicolon). Hyphen is allowed (e.g., cloud-ladder). Keep each EN line <= 40 characters.\n\n"
        "OUTPUT_SCHEMA_EXAMPLE:\n"
        '{"results":[{"id":123,"lines":[\n'
        '  {"orig":"AAAAA","ja":"…","en":"…"},\n'
        '  {"orig":"BBBBB","ja":"…","en":"…"},\n'
        '  {"orig":"CCCCC","ja":"…","en":"…"},\n'
        '  {"orig":"DDDDD","ja":"…","en":"…"}\n'
        ']}]}\n\n'
        "INPUT_TASKS:\n" + json.dumps({"tasks": tasks}, ensure_ascii=False)
    )

def normalize_result(raw_obj: Dict[str, Any], input_origs_by_id: Dict[int, List[str]]) -> Dict[int, List[Dict[str, str]]]:
    out: Dict[int, List[Dict[str, str]]] = {}
    if "results" not in raw_obj or not isinstance(raw_obj["results"], list):
        raise RuntimeError("missing 'results'")
    for r in raw_obj["results"]:
        rid = r.get("id")
        if not isinstance(rid, int):
            raise RuntimeError("invalid id in results")
        if isinstance(r.get("lines"), list) and len(r["lines"]) >= 4:
            fixed = []
            for i in range(4):
                x = r["lines"][i]
                if not isinstance(x, dict) or "ja" not in x or "en" not in x:
                    raise RuntimeError(f"id={rid}: invalid line shape")
                o = x.get("orig") or input_origs_by_id[rid][i]
                fixed.append({"orig": o, "ja": (x["ja"] or "").strip(), "en": (x["en"] or "").strip()})
            out[rid] = fixed
            continue
        if isinstance(r.get("ja"), list) and isinstance(r.get("en"), list) and len(r["ja"])==4 and len(r["en"])==4:
            origs = input_origs_by_id[rid]
            out[rid] = [{"orig": origs[i], "ja": (r["ja"][i] or "").strip(), "en": (r["en"][i] or "").strip()} for i in range(4)]
            continue
        raise RuntimeError(f"id={rid}: unsupported result shape")
    return out

def normalize_en_line(s: str, limit: int) -> str:
    if not s: return s
    s = re.sub(r"[,\?\!\u2026\u2014;:\.]", "", s)  # 句読点を落とす
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) > limit:
        for pat in [r"\bthat\b", r"\bthe\b", r"\band\b", r"\bthen\b", r"\bso\b"]:
            s = re.sub(pat, "", s, flags=re.IGNORECASE)
            s = re.sub(r"\s{2,}", " ", s).strip()
            if len(s) <= limit: break
    return s[:limit].rstrip() if len(s) > limit else s

def validate_poem(item_in: Dict[str, Any], lines_out: List[Dict[str, str]]) -> Tuple[bool, List[str]]:
    errs = []
    if not isinstance(lines_out, list) or len(lines_out)!=4:
        return False, ["shape: lines != 4"]
    for i,x in enumerate(lines_out):
        if not x.get("ja") or not x.get("en") or not x.get("orig"):
            errs.append(f"line{i+1}: empty field")
    for i,(ln_in,ln_out) in enumerate(zip(item_in["lines"], lines_out)):
        if ln_in.get("orig") != ln_out.get("orig"):
            errs.append(f"line{i+1}: orig mismatch")
    for i,x in enumerate(lines_out):
        en = x["en"]
        if BANNED_WORDS_RE.search(en):  errs.append(f"line{i+1}: banned pronoun in EN")
        if BANNED_PROPER_RE.search(en): errs.append(f"line{i+1}: banned proper name in EN")
        if BANNED_PUNCT_RE.search(en):  errs.append(f"line{i+1}: banned punctuation in EN")
        if len(en) > EN_MAX:            errs.append(f"line{i+1}: EN too long")
        if len(x["ja"]) > JA_MAX:       errs.append(f"line{i+1}: JA too long")
    # glossaryの“stupa”誤用などの軽警告（任意）
    for i,x in enumerate(lines_out):
        if "stupa" in x["en"].lower():
            errs.append(f"line{i+1}: use 'pagoda' instead of 'stupa' (glossary)")
    return (len(errs)==0), errs

def tone_breaks_with_existing(item_in: Dict[str, Any], lines_out: List[Dict[str, str]]) -> bool:
    existing_en = [ln["en"] for ln in item_in["lines"] if not is_placeholder_en(ln.get("en",""))]
    if not existing_en: return False
    existing_has_punct   = any(BANNED_PUNCT_RE.search(e or "") for e in existing_en)
    existing_has_pronoun = any(BANNED_WORDS_RE.search(e or "") for e in existing_en)
    new_en = [x["en"] for x in lines_out]
    new_has_punct   = any(BANNED_PUNCT_RE.search(e or "") for e in new_en)
    new_has_pronoun = any(BANNED_WORDS_RE.search(e or "") for e in new_en)
    if (not existing_has_punct)   and new_has_punct:   return True
    if (not existing_has_pronoun) and new_has_pronoun: return True
    return False

client = OpenAI(timeout=60.0)

def call_api(batch_items: List[Dict[str, Any]], model: str, temperature: float) -> Dict[int, List[Dict[str, str]]]:
    prompt = build_prompt(batch_items)
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role":"system","content":(
                "You translate Classical Chinese five-character quatrains faithfully. "
                "Read each poem as a whole, then output per-line JA/EN. "
                "No added subjects, no invented proper nouns, no explanations. "
                "Return ONLY JSON. "
                "Each EN line MUST contain NO punctuation (no comma/period/question/exclamation/ellipsis/em-dash/colon/semicolon). "
                "Hyphen is allowed (e.g., cloud-ladder). Keep each EN line <= 40 characters."
            )},
            {"role":"user","content": prompt}
        ],
        temperature=temperature,
        response_format={"type":"json_object"}
    )
    raw = resp.choices[0].message.content
    try:
        obj = json.loads(raw)
    except Exception as e:
        raise RuntimeError(f"JSON parse failed: {e}\n--- RAW ---\n{raw}")
    input_origs_by_id = { it["id"]: [ln["orig"] for ln in it["lines"]] for it in batch_items }
    return normalize_result(obj, input_origs_by_id)

def process_chunk(chunk, model, temperature, max_retries=3):
    for attempt in range(max_retries):
        try:
            return call_api(chunk, model=model, temperature=temperature if attempt==0 else 0.0)
        except Exception as e:
            time.sleep(0.4*(attempt+1))
            if attempt==max_retries-1:
                raise

# ===== メイン =====
ap = argparse.ArgumentParser()
ap.add_argument("--input", required=True)
ap.add_argument("--output", required=True)
ap.add_argument("--model", default="gpt-4o-mini")
ap.add_argument("--hard-model", default="gpt-4.1")
ap.add_argument("--temperature", type=float, default=0.1)
ap.add_argument("--batch", type=int, default=20)
ap.add_argument("--max-retries", type=int, default=3)
ap.add_argument("--dry-run", action="store_true")
ap.add_argument("--ids", type=str, default="")
ap.add_argument("--no-auto-force", action="store_true")
ap.add_argument("--auto-complete", action="store_true", help="loop until placeholders=0 or no progress")
ap.add_argument("--max-passes", type=int, default=4)
ap.add_argument("--stop-if-unchanged", action="store_true")
args = ap.parse_args()

src_path = Path(args.input)
out_path = Path(args.output)
if not src_path.exists():
    print(f"[ERR] input not found: {src_path}", file=sys.stderr); sys.exit(1)

data = json.loads(src_path.read_text(encoding="utf-8"))

def one_pass(updated_data, ids_filter: set):
    targets = []
    for it in updated_data:
        if ids_filter:
            if it.get("id") in ids_filter:
                targets.append(it)
        else:
            if poem_has_placeholder(it):
                targets.append(it)
    total = len(updated_data)
    print(f"[INFO] poems total={total}, selected={len(targets)}, model={args.model}, hard={args.hard_model}", flush=True)
    if not targets:
        return updated_data, set(), [], [], 0

    B = max(1, args.batch)
    result_map = {}
    failed_ids, log_lines = [], []
    # API呼び
    for i in range(0, len(targets), B):
        chunk = targets[i:i+B]
        print(f"[CALL] chunk {i//B + 1}/{(len(targets)+B-1)//B} -> ids={[it['id'] for it in chunk]}", flush=True)
        try:
            out = process_chunk(chunk, model=args.model, temperature=args.temperature, max_retries=args.max_retries)
            result_map.update(out)
        except Exception as e:
            for it in chunk:
                try:
                    single = process_chunk([it], model=args.model, temperature=0.0, max_retries=args.max_retries)
                    result_map.update(single)
                except Exception as ee:
                    failed_ids.append(it["id"])
                    log_lines.append(f"[ERR] id={it['id']} API failed: {ee}")

    committed_ids = set()
    force_queue = []
    # Gate判定 + 自動整形
    for it in targets:
        rid = it["id"]
        if rid in failed_ids or rid not in result_map:
            continue
        lines_out = result_map[rid]
        # 自動整形（英行）
        for x in lines_out:
            x["en"] = normalize_en_line(x["en"], EN_MAX)

        ok1, errs = validate_poem(it, lines_out)
        if not ok1:
            # リトライ（mini 低温）
            retried = False
            for _ in range(args.max_retries):
                try:
                    single = process_chunk([it], model=args.model, temperature=0.0, max_retries=args.max_retries)
                    lines_out = single[rid]
                    for x in lines_out:
                        x["en"] = normalize_en_line(x["en"], EN_MAX)
                    ok1, errs = validate_poem(it, lines_out)
                    if ok1: retried = True; break
                except Exception as e:
                    pass
            if not ok1:
                if not args.no_auto_force:
                    force_queue.append(it)
                    log_lines.append(f"[GATE1->FORCE] id={rid} errs={errs}")
                    continue
                else:
                    failed_ids.append(rid)
                    log_lines.append(f"[FAIL] id={rid} gate1 errs={errs}")
                    continue

        if tone_breaks_with_existing(it, lines_out):
            if not args.no_auto_force:
                force_queue.append(it)
                log_lines.append(f"[GATE2->FORCE] id={rid} tone break")
                continue
            else:
                failed_ids.append(rid)
                log_lines.append(f"[FAIL] id={rid} tone break (no_auto_force)")
                continue

        # プレースホルダのみ上書き
        idx_in_data = updated_data.index(it)
        for idx, ln in enumerate(updated_data[idx_in_data]["lines"]):
            if is_placeholder_ja(ln.get("ja","")):
                ln["ja"] = lines_out[idx]["ja"]
            if is_placeholder_en(ln.get("en","")):
                ln["en"] = lines_out[idx]["en"]
        committed_ids.add(rid)
        log_lines.append(f"[OK] id={rid} placeholders filled")

    # Force: 詩単位で刷新
    if force_queue:
        for it in force_queue:
            rid = it["id"]
            success = False
            for mdl in (args.model, args.hard_model):
                try:
                    single = process_chunk([it], model=mdl, temperature=0.0, max_retries=args.max_retries)
                    lines_out = single[rid]
                    for x in lines_out:
                        x["en"] = normalize_en_line(x["en"], EN_MAX)
                    ok1, errs = validate_poem(it, lines_out)
                    if not ok1:
                        continue
                    idx_in_data = updated_data.index(it)
                    for idx, ln in enumerate(updated_data[idx_in_data]["lines"]):
                        ln["ja"] = lines_out[idx]["ja"]
                        ln["en"] = lines_out[idx]["en"]
                    committed_ids.add(rid)
                    log_lines.append(f"[FORCE-OK] id={rid} model={mdl}")
                    success = True
                    break
                except Exception as e:
                    pass
            if not success:
                failed_ids.append(rid)
                log_lines.append(f"[FORCE-FAIL] id={rid}")

    print("\n".join(log_lines[:120]))
    return updated_data, committed_ids, force_queue, failed_ids, len(committed_ids)

# --- AUTO ループ or 単発 ---
ids_filter = set(int(x.strip()) for x in args.ids.split(",") if x.strip()) if args.ids.strip() else set()
updated = deepcopy(data)

if args.auto_complete:
    prev_remaining = count_remaining_placeholders(updated)
    for p in range(1, args.max_passes+1):
        print(f"[AUTO] pass {p} start (remaining={prev_remaining})", flush=True)
        updated, ok_ids, fq, failed, changed = one_pass(updated, ids_filter)
        remaining = count_remaining_placeholders(updated)
        print(f"[AUTO] pass {p} end   (remaining={remaining}, ok={len(ok_ids)}, force_q={len(fq)}, failed={len(failed)})", flush=True)
        if remaining == 0:
            break
        if args.stop_if_unchanged and (remaining==prev_remaining or changed==0):
            print("[AUTO] no further progress; stopping", flush=True)
            break
        prev_remaining = remaining
else:
    updated, ok_ids, fq, failed, changed = one_pass(updated, ids_filter)

final_json = json.dumps(updated, ensure_ascii=False, indent=2)

if args.dry_run:
    print("[DRY-RUN] no write.")
    print(f'[SUMMARY] remaining={count_remaining_placeholders(updated)}')
    sys.exit(0)

# .bak（出力先の既存を退避）
if out_path.exists():
    bak = out_path.with_suffix(out_path.suffix + f".{int(time.time())}.bak")
    bak.write_text(out_path.read_text(encoding="utf-8"), encoding="utf-8")
    print(f"[BACKUP] -> {bak}")

out_path.write_text(final_json, encoding="utf-8")
print(f"[DONE] wrote -> {out_path}")
print(f'[SUMMARY] remaining={count_remaining_placeholders(updated)}')
