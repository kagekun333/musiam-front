/**
 * 淺草観音100籤 - 原文（中国語）→ 日本語 / 英語 一括翻訳
 * - 入力:  ..\src\data\kannon100\NNN\原文NNN.txt
 * - 出力:  ..\src\data\kannon100\NNN\ja.txt, en.txt
 * - 既存ファイルはスキップ（FORCE=true で上書き）
 */
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

// ===== 設定 =====
const ROOT = path.join(__dirname, "..", "src", "data", "kannon100");
const MODEL = "gpt-4o-mini";         // 速くて安定、改行保持もしやすい
const TEMPERATURE = 0;               // 直訳寄せ（意訳は最小）
const CONCURRENCY = 3;               // 同時実行（回しすぎると429）
const FORCE = false;                 // 既存翻訳の上書き可否

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ----- ユーティリティ -----
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function listNumbers(){ return Array.from({length:100}, (_,i)=>String(i+1).padStart(3,"0")); }

function readRaw(nnn){
  const p = path.join(ROOT, nnn, `原文${nnn}.txt`);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8").trim();
}

function outPath(nnn, lang){ return path.join(ROOT, nnn, `${lang}.txt`); }

function needWrite(nnn, lang){
  if (FORCE) return true;
  return !fs.existsSync(outPath(nnn, lang));
}

async function translate(text, targetLang){
  // プロンプト：改行維持・記号そのまま・脚色禁止
  const sys = [
    "You are a precise, layout-preserving translator.",
    "Strictly preserve line breaks, headings, punctuation, bullets.",
    "Do NOT add explanations or notes.",
    "If the source includes labels like『願望：』keep them as labels in target language.",
  ].join(" ");

  const map = { ja: "Japanese", en: "English" };
  const user = `Translate the following Traditional Chinese text into ${map[targetLang]}.\n\n` +
               "=== TEXT START ===\n" + text + "\n=== TEXT END ===";

  for (let t=0; t<4; t++){
    try{
      const res = await client.chat.completions.create({
        model: MODEL,
        temperature: TEMPERATURE,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user }
        ]
      });
      const out = res.choices?.[0]?.message?.content?.trim() || "";
      return out;
    }catch(e){
      const code = e?.status || e?.code || "";
      if (t===3) throw e;
      // 軽い指数バックオフ
      await sleep(800 * Math.pow(2,t));
      // レート系は少し長めに待つ
      if (code===429) await sleep(1500);
    }
  }
}

async function worker(nnn){
  const src = readRaw(nnn);
  if (!src || src.length < 2){
    console.warn(`\n[skip] ${nnn}: 原文なし`);
    return { nnn, ok:false, reason:"no-source" };
  }

  // 日本語
  if (needWrite(nnn, "ja")){
    const ja = await translate(src, "ja");
    fs.writeFileSync(outPath(nnn, "ja"), ja + "\n", "utf8");
  }
  // 英語
  if (needWrite(nnn, "en")){
    const en = await translate(src, "en");
    fs.writeFileSync(outPath(nnn, "en"), en + "\n", "utf8");
  }

  process.stdout.write(`\r[translate] ${nnn} done  `);
  return { nnn, ok:true };
}

async function main(){
  if (!process.env.OPENAI_API_KEY){
    console.error("OPENAI_API_KEY が未設定です");
    process.exit(1);
  }
  const nums = listNumbers();

  // 素朴な並列実行キュー
  let i=0, running=0, ok=0, ng=0;
  await new Promise(resolve=>{
    function kick(){
      while (running < CONCURRENCY && i < nums.length){
        const nnn = nums[i++]; running++;
        worker(nnn).then(r=>{ r?.ok?ok++:ng++; running--; (i===nums.length && running===0)?resolve():kick(); });
      }
    }
    kick();
  });
  console.log(`\nDone. OK=${ok} NG=${ng}`);
}

main().catch(e=>{ console.error(e); process.exit(1); });
