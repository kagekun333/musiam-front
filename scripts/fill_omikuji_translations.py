# fill_omikuji_translations.py (force/ids 対応版)
# 目的:
# - ID単位で四句の詩を「全体→行」二段で忠実訳し直し、ja/enの両方を刷新
# - --force で既訳があっても上書き、--ids で対象IDを限定
# 依存: pip install --upgrade openai

import argparse, json, os, sys, time
from pathlib import Path
from typing import List, Dict, Any
from openai import OpenAI

ap = argparse.ArgumentParser()
ap.add_argument("--input", required=True, help="input JSON file (e.g., dist/omikuji.final.json)")
ap.add_argument("--output", default=None, help="output JSON file (default: overwrite input safely)")
ap.add_argument("--model", default="gpt-4o-mini", help="OpenAI model (e.g., gpt-4o-mini, gpt-4.1)")
ap.add_argument("--batch", type=int, default=20, help="poems per request (recommend 10-20)")
ap.add_argument("--temperature", type=float, default=0.2)
ap.add_argument("--seed", type=int, default=42)
ap.add_argument("--dry-run", action="store_true")
ap.add_argument("--force", action="store_true", help="retranslate & overwrite even if translations exist")
ap.add_argument("--ids", type=str, default="", help="comma-separated poem IDs to process (e.g., 1,2,3). If empty, process all.")
args = ap.parse_args()

src_path = Path(args.input)
out_path = Path(args.output) if args.output else src_path
if not src_path.exists():
    print(f"[ERR] input not found: {src_path}", file=sys.stderr); sys.exit(1)

with src_path.open("r", encoding="utf-8") as f:
    data: List[Dict[str, Any]] = json.load(f)

# ---- target selection ----
ids_filter = set()
if args.ids.strip():
    try:
        ids_filter = set(int(x.strip()) for x in args.ids.split(",") if x.strip())
    except:
        print("[ERR] --ids must be comma-separated integers", file=sys.stderr); sys.exit(1)

def is_placeholder_ja(s: str) -> bool:
    s = (s or "").strip()
    return s in ("訳準備中", "（訳準備中）")

def is_placeholder_en(s: str) -> bool:
    return (s or "").strip().upper() == "TBD"

def poem_needs_work(item: Dict[str, Any]) -> bool:
    """詩（ID）単位で、いずれかの行にプレースホルダがある場合 True。
       --force の場合は常に True（上書き）。"""
    if args.force:
        return True
    for ln in item.get("lines", []):
        if is_placeholder_ja(ln.get("ja","")) or is_placeholder_en(ln.get("en","")):
            return True
    return False

targets: List[Dict[str, Any]] = []
for it in data:
    if ids_filter and it.get("id") not in ids_filter:
        continue
    if poem_needs_work(it):
        # lines[] が4行で orig が揃っているものだけ対象
        lines = it.get("lines", [])
        if isinstance(lines, list) and len(lines) == 4 and all("orig" in x for x in lines):
            targets.append(it)

print(f"[INFO] total poems: {len(data)}, selected: {len(targets)}, force={args.force}, ids_filter={'yes' if ids_filter else 'no'}")

if not targets:
    print("[OK] nothing to do."); sys.exit(0)

client = OpenAI()

# ---- Structured Output schema ----
schema = {
    "type": "object",
    "properties": {
        "results": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": { "type": "integer" },
                    "lines": {
                        "type": "array", "minItems": 4, "maxItems": 4,
                        "items": {
                            "type": "object",
                            "properties": {
                                "orig": { "type": "string" },
                                "ja":   { "type": "string", "minLength": 1 },
                                "en":   { "type": "string", "minLength": 1 }
                            },
                            "required": ["orig","ja","en"],
                            "additionalProperties": False
                        }
                    }
                },
                "required": ["id","lines"],
                "additionalProperties": False
            }
        }
    },
    "required": ["results"],
    "additionalProperties": False
}

def build_prompt(batch_items: List[Dict[str, Any]]) -> str:
    # バイアス最小：詩として全体→行。主語/解説/脚色の追加禁止。JSONのみ。
    tasks = []
    for it in batch_items:
        tasks.append({
            "id": it["id"],
            "lines": [ln["orig"] for ln in it["lines"]]
        })
    return (
        "Translate faithfully from Classical Chinese five-character quatrains into Japanese and English.\n"
        "- Read each 4-line poem as a whole, then produce per-line translations that reflect the whole.\n"
        "- Do NOT add subjects (I/you/we), commentary, or explanations not present in the text.\n"
        "- Keep imagery and order; return exactly 4 lines for each poem.\n"
        "Return ONLY JSON according to the schema.\n\n"
        "INPUT_TASKS:\n" + json.dumps({"tasks": tasks}, ensure_ascii=False)
    )

def call_api(batch_items):
    # 1) プロンプト
    prompt = build_prompt(batch_items)

    # 2) 呼び出し（Chat Completions + JSONモード）
    resp = client.chat.completions.create(
        model=args.model,
        messages=[
            {"role": "system", "content":
             "You translate Classical Chinese five-character quatrains faithfully. "
             "Read each 4-line poem as a whole, then output per-line JA/EN with no added subjects or commentary. "
             "Return ONLY JSON. No extra keys, no notes, no prose."},
            {"role": "user", "content": prompt}
        ],
        temperature=args.temperature,
        response_format={"type": "json_object"}
    )

    raw = resp.choices[0].message.content

    # 3) まず素直にパース
    try:
        obj = json.loads(raw)
    except Exception as e:
        raise RuntimeError(f"JSON parse failed: {e}\n--- RAW ---\n{raw}")

    # 4) 受信フォーマットを頑丈化して正規形に補正
    # 期待正規形: {"results":[{"id":int,"lines":[{"orig":str,"ja":str,"en":str}×4]}]}
    if "results" not in obj or not isinstance(obj["results"], list):
        raise RuntimeError(f"missing 'results' array\n--- RAW ---\n{raw}")

    # id -> 正規化済み lines[]
    out = {}
    # id -> 入力 orig[] （復元に使う）
    input_origs_by_id = { it["id"]: [ln["orig"] for ln in it["lines"]] for it in batch_items }

    for r in obj["results"]:
        rid = r.get("id")
        if not isinstance(rid, int):
            raise RuntimeError(f"invalid or missing id in one result\n--- RAW ---\n{raw}")

        # ケースA: 想定どおり lines[4×{orig,ja,en}]
        if isinstance(r.get("lines"), list) and len(r["lines"]) == 4 and all(
            isinstance(x, dict) and "ja" in x and "en" in x for x in r["lines"]
        ):
            # orig が抜けていた場合は入力から補完
            fixed = []
            for i, x in enumerate(r["lines"]):
                o = x.get("orig")
                if not o:
                    o = input_origs_by_id[rid][i]
                fixed.append({"orig": o, "ja": x["ja"], "en": x["en"]})
            out[rid] = fixed
            continue

        # ケースB: ja[4], en[4] だけ来た → 入力origとジップして正規化
        if isinstance(r.get("ja"), list) and isinstance(r.get("en"), list) \
           and len(r["ja"]) == 4 and len(r["en"]) == 4:
            origs = input_origs_by_id[rid]
            fixed = []
            for i in range(4):
                fixed.append({"orig": origs[i], "ja": r["ja"][i], "en": r["en"][i]})
            out[rid] = fixed
            continue

        # ケースC: linesがあるが4行未満/過剰 → 先頭4行だけ採用（安全側）
        if isinstance(r.get("lines"), list) and len(r["lines"]) >= 1:
            origs = input_origs_by_id[rid]
            fixed = []
            for i in range(min(4, len(r["lines"]))):
                x = r["lines"][i]
                if isinstance(x, dict) and "ja" in x and "en" in x:
                    o = x.get("orig") or origs[i]
                    fixed.append({"orig": o, "ja": x["ja"], "en": x["en"]})
                elif isinstance(x, str):
                    # 稀に "ja|en" みたいな変な形が来る場合の防御（ここは最小限）
                    fixed.append({"orig": origs[i], "ja": x, "en": x})
            # 足りない分は空で埋めない（不完全はリトライ対象にする）
            if len(fixed) == 4 and all(len(y["ja"])>0 and len(y["en"])>0 for y in fixed):
                out[rid] = fixed
                continue

        # どれにも当てはまらない → 例外（上位でリトライさせると良い）
        raise RuntimeError(f"invalid result shape for id={rid}\n--- RAW ---\n{raw}")

    return out



def apply_result(item: Dict[str,Any], lines_out: List[Dict[str,str]], report: List[str]):
    # orig 照合 → 不一致行はスキップ
    for i,(ln_in, ln_out) in enumerate(zip(item["lines"], lines_out), start=1):
        if ln_in.get("orig") != ln_out.get("orig"):
            report.append(f"[WARN] id={item['id']} line{i}: orig mismatch -> SKIP")
            continue
        # 強制上書き or プレースホルダのみ上書き
        if args.force or is_placeholder_ja(ln_in.get("ja","")):
            ln_in["ja"] = ln_out["ja"]
            report.append(f" id={item['id']} line{i} JA updated")
        if args.force or is_placeholder_en(ln_in.get("en","")):
            ln_in["en"] = ln_out["en"]
            report.append(f" id={item['id']} line{i} EN updated")

B = max(1, args.batch)
changed_poems = 0
log: List[str] = []

for i in range(0, len(targets), B):
    chunk = targets[i:i+B]
    result_map = call_api(chunk)
    for item in chunk:
        rid = item["id"]
        if rid not in result_map:
            log.append(f"[WARN] id={rid} missing in result; skip"); continue
        before = json.dumps(item["lines"], ensure_ascii=False)
        apply_result(item, result_map[rid], log)
        after = json.dumps(item["lines"], ensure_ascii=False)
        if before != after:
            changed_poems += 1
    time.sleep(0.1)

print(f"[INFO] poems updated: {changed_poems}")

final_json = json.dumps(data, ensure_ascii=False, indent=2)
if args.dry_run:
    print("[DRY-RUN] no write.")
    print("\n".join(log[:40]))
    sys.exit(0)

if out_path == src_path:
    bak = src_path.with_suffix(src_path.suffix + f".{int(time.time())}.bak")
    bak.write_text(Path(src_path).read_text("utf-8"), encoding="utf-8")
    print(f"[BACKUP] -> {bak}")

out_path.write_text(final_json, encoding="utf-8")
print(f"[DONE] wrote -> {out_path}")
print("[LOG SAMPLE]")
print("\n".join(log[:40]))
