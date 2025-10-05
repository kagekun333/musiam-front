import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const FILE = path.join(ROOT, "scripts", "migrate_kannon100_to_split.mjs");

// 1) 読み込み＆バックアップ
let src = await fs.readFile(FILE, "utf8");
const bakDir = path.join(ROOT, "scripts", "_backup");
await fs.mkdir(bakDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:TZ.]/g,"").slice(0,14);
await fs.writeFile(path.join(bakDir, `migrate_kannon100_to_split.${stamp}.bak.mjs`), src);

// 2) isPoemCandidate を置換（関数全体）
{
  const re = /function\s+isPoemCandidate\s*\(\s*s\s*\)\s*\{[\s\S]*?\n\}/m;
  const replacement = `function isPoemCandidate(s){
  if (!s) return false;
  if (isHeading(s)) return false;

  // 句読点・コロンなどは古典四句では原則使わない
  if (/[：:\\uFF1A，、,\\uFF0C\\u3001\\u3002。]/.test(s)) return false;

  const t = s.replace(/\\s/g, "");
  const han = (t.match(/[\\p{Script=Han}]/gu)||[]).length;
  const all = t.length;

  // 古典の定型：おおむね4〜12字（5〜7字が多い）
  if (all < 4 || all > 12) return false;

  // 口語助詞が混じる場合は除外
  if (/[のがをはにで了的吧呢嗎個們著把]/.test(t)) return false;

  return han / all >= 0.7;
}`;
  if (re.test(src)) {
    src = src.replace(re, replacement);
  } else if (!src.includes("function isPoemCandidate(")) {
    throw new Error("isPoemCandidate が見つかりません。ファイル構造を確認してください。");
  } else {
    // 既に同等の内容なら何もしない
  }
}

// 3) mergeShorts を置換（関数全体）
{
  const re = /function\s+mergeShorts\s*\(\s*arr\s*\)\s*\{[\s\S]*?\n\}/m;
  const replacement = `function mergeShorts(arr){
  const tmp=[];
  for (let i=0;i<arr.length;i++){
    let s = arr[i];
    // まず4字未満は次の極短（〜2字）を連結
    while (s.length < 4 && i+1 < arr.length) {
      const nx = arr[i+1];
      if (nx.length <= 2 && !/[：:\\uFF1A，、,\\uFF0C\\u3001\\u3002。]/.test(nx)) {
        s += nx;
        i++;
      } else break;
    }
    tmp.push(s);
  }
  // 後段：単独1字行が残っていたら直前へ吸収（例：「佳人一炷」+「香」）
  const out=[];
  for (let i=0;i<tmp.length;i++){
    const cur = tmp[i];
    const nxt = tmp[i+1];
    if (nxt && nxt.length===1 && cur.length<=6) {
      out.push(cur + nxt);
      i++; // 次を消費
    } else {
      out.push(cur);
    }
  }
  return out;
}`;
  if (re.test(src)) {
    src = src.replace(re, replacement);
  } else if (!src.includes("function mergeShorts(")) {
    throw new Error("mergeShorts が見つかりません。ファイル構造を確認してください。");
  }
}

// 4) candidates2 の追加フィルタ（4〜12字）を注入（冪等）
{
  const anchor = "let candidates2 = lines.filter(isPoemCandidate);";
  if (src.includes(anchor)) {
    const injection = `${anchor}
// 追加フィルタ：4〜12字のみ許容（口語長文や極短の混入を防止）
candidates2 = candidates2.filter(s => s.length >= 4 && s.length <= 12);`;
    // 既に注入済みかチェック
    if (!src.includes("candidates2 = candidates2.filter(s => s.length >= 4 && s.length <= 12)")) {
      src = src.replace(anchor, injection);
    }
  } else {
    console.warn("WARNING: anchor が見つからないため、長さフィルタの注入をスキップしました。");
  }
}

// 5) 書き戻し
await fs.writeFile(FILE, src);
console.log("✅ patched:", FILE);
