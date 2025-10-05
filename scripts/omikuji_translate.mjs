import fs from "fs";
import path from "path";
import OpenAI from "openai";

const INPUT = process.argv[2] || "dist/omikuji.final.json";
const DRY   = process.argv.includes("--dry-run");
const MODEL = process.env.OMK_TRANSLATE_MODEL || "gpt-4o-mini"; // 任意のチャットモデル
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || undefined, // vLLMやGroqに差し替え可
});

function mkBackup(outPath, content){
  const ts = new Date().toISOString().replace(/[:.]/g,"");
  const bak = `${outPath}.${ts}.bak`;
  fs.writeFileSync(bak, content, "utf8");
  console.log(`Backup -> ${bak}`);
}

function needsTranslation(line){
  return (line.ja?.includes("訳準備中") || line.en?.toUpperCase() === "TBD");
}

function sanitizeLine(s){
  return s.replace(/\s+/g," ").trim();
}

function buildPrompt(id, header_ja, lines){
  const orig = lines.map(l => l.orig);
  return [
    {
      role: "system",
      content: [
        "You are a careful translator of Classical Chinese five-character quatrains used in Japanese omikuji.",
        "Read all four lines as one poem first (global meaning).",
        "Then produce per-line translations that follow the global meaning (NO literal one-by-one mismatches).",
        "Output strict JSON with fields: ja (array of 4 strings), en (array of 4 strings).",
        "Rules:",
        "- Keep imagery and causality. No added explanations, no fortune-telling items.",
        "- Japanese must be natural and concise; English poetic and concise.",
        "- No emojis, no commentary, no quotes, no code fences."
      ].join("\n")
    },
    {
      role: "user",
      content: JSON.stringify({
        id, header_ja,
        lines: orig
      })
    }
  ];
}

async function translateOne({id, header_ja, lines}) {
  const msgs = buildPrompt(id, header_ja, lines);
  const res = await client.chat.completions.create({
    model: MODEL,
    messages: msgs,
    temperature: 0.3,
    response_format: { type: "json_object" }
  });
  let payload;
  try {
    payload = JSON.parse(res.choices[0].message.content);
  } catch(e){
    throw new Error("JSON parse failed");
  }
  if (!Array.isArray(payload.ja) || !Array.isArray(payload.en) || payload.ja.length!==4 || payload.en.length!==4){
    throw new Error("Invalid translator output shape");
  }
  // QA: sanitize + simple guards
  const JA = payload.ja.map(sanitizeLine);
  const EN = payload.en.map(sanitizeLine);
  const bad = [...JA, ...EN].some(s =>
    /訳準備中|TBD/i.test(s) || s.length===0 || /[💡✨🔥🎉]/.test(s)
  );
  if (bad) throw new Error("Placeholder or invalid token remained");
  return { JA, EN };
}

async function main(){
  const p = path.resolve(INPUT);
  const raw = fs.readFileSync(p, "utf8");
  const data = JSON.parse(raw);

  let changed = 0, targets = 0;

  for (const item of data){
    const lines = item.lines || [];
    const need = lines.some(needsTranslation);
    if (!need) continue;
    targets++;

    // 全体把握の上で行訳を出すため、origだけ渡して一括生成
    const { JA, EN } = await translateOne(item);

    // 置換は「訳準備中/TBD」に限る（既訳は尊重）
    let idx = 0;
    for (const ln of lines){
      if (ln.ja?.includes("訳準備中")) { ln.ja = JA[idx]; changed++; }
      if ((ln.en||"").toUpperCase()==="TBD") { ln.en = EN[idx]; changed++; }
      idx++;
    }
  }

  if (targets===0){
    console.log("[OK] No lines needed translation.");
    return;
  }

  console.log(`[INFO] targets: ${targets}, lines changed: ${changed}`);

  if (DRY){
    console.log("[DRY-RUN] No file write.");
  } else {
    mkBackup(p, raw);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
    console.log(`[DONE] Updated -> ${p}`);
  }
}

main().catch(e=>{
  console.error("[ERR]", e.message);
  process.exit(1);
});
