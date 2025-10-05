// scripts/check_kannon.js (relaxed v2)
const fs = require("fs");
const path = require("path");
const DATA_DIR = path.join(__dirname, "..", "src", "data", "kannon100");

const MIN_PAIRS  = 2;  // ← まずは2に緩めて実態確認（後で3〜4に戻す）
const MIN_LABELS = 2;

const HEADING = /第[一二三四五六七八九十百零〇\d]+\s*(?:大吉|中吉|小吉|吉|末吉|末小吉|半吉|凶|大凶)/;
const TITLE = /^[一-龥]{2,12}$/;
const SENT_END = /[。．.!！?？]/;

function exists(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
function read(p){ try{ return fs.readFileSync(p,"utf8"); } catch{ return ""; } }

function score(raw){
  const lines = (raw||"").replace(/\r/g,"").split("\n").map(s=>s.trim());
  const hasHeading = HEADING.test(lines.join(" "));

  // タイトル→説明（同一行 or 複数空行を許容）
  let pairs=0;
  for (let i=0;i<lines.length;i++){
    const t = lines[i];
    if (!t || !TITLE.test(t)) continue;

    // 同一行に説明
    const same = t.split(" ");
    if (same.length>=2 && SENT_END.test(same.slice(1).join(" "))) { pairs++; continue; }

    // 次行以降（空行最大3）
    let j=i+1, blanks=0, expl="";
    while (j<lines.length && blanks<=3){
      const s = lines[j];
      if (!s) { blanks++; j++; continue; }
      if (TITLE.test(s)) break;
      if (SENT_END.test(s)) { expl=s; break; }
      const comb = s+" "+(lines[j+1]||"");
      if (SENT_END.test(comb)) { expl=comb; break; }
      j++;
    }
    if (expl) pairs++;
  }

  // ラベル
  const LABEL_KEYS = ["願望","疾病","盼望的人","遺失物","失物","蓋新居","搬家","嫁娶","旅行","交往","商売","求財","學業","訴訟","萬事"];
  let labels=0;
  const text = lines.join("\n");
  for (const k of LABEL_KEYS){
    const re1 = new RegExp(`(^|\\n)\\s*${k}[：:][^\\n]*`, "m");
    const re2 = new RegExp(`(^|\\n)\\s*${k}[：:]\\s*\\n\\s*[^\\n]+`, "m");
    if (re1.test(text) || re2.test(text)) labels++;
  }

  // 注意書き
  const hasCaution = /(萬事|謹慎|小心|當心|粗心大意)/.test(text);

  const reasons=[];
  if (!hasHeading) reasons.push("見出しNG");
  if (pairs < MIN_PAIRS) reasons.push(`四句+説明が${pairs}組`);
  if (labels < MIN_LABELS) reasons.push(`ラベル少(${labels})`);
  if (!hasCaution) reasons.push("注意書き無し");

  return { hasHeading, pairs, labels, hasCaution, reasons };
}

function run(){
  let ok=0, ng=0; const rows=[];
  for (let n=1;n<=100;n++){
    const id = String(n).padStart(3,"0");
    const dir = path.join(DATA_DIR,id);
    const t = path.join(dir,`原文${id}.txt`);
    const f = path.join(dir,"front.jpg");
    const b = path.join(dir,"back.jpg");

    let status="OK", reasons=[];
    if (!exists(t)){ status="NO_TEXT"; reasons.push("原文無し"); }
    else {
      const sc = score(read(t));
      if (!(sc.hasHeading && sc.pairs>=MIN_PAIRS && sc.labels>=MIN_LABELS && sc.hasCaution)){
        status="NEEDS_FIX"; reasons=sc.reasons;
      }
    }
    if (!exists(f) || !exists(b)){
      status = status==="OK" ? "NEEDS_FIX" : status;
      if (!exists(f)) reasons.push("front.jpg無し");
      if (!exists(b)) reasons.push("back.jpg無し");
    }

    (status==="OK") ? ok++ : ng++;
    rows.push({n,status,reasons:reasons.join(" / ")});
  }
  const outCsv = path.join(DATA_DIR,"_check_report.csv");
  fs.writeFileSync(outCsv, "number,status,reasons\n" + rows.map(r=>`${r.n},${r.status},"${r.reasons.replace(/"/g,'""')}"`).join("\n"), "utf8");

  console.log("---- Summary ----");
  console.log("OK:", ok, " / NeedsFix:", ng);
  console.log("CSV:", outCsv);
  console.log("\nSample issues:");
  for (const r of rows.filter(x=>x.status!=="OK").slice(0,15)){
    console.log(`#${String(r.n).padStart(3,"0")}  ${r.status}  -> ${r.reasons}`);
  }
}
run();
