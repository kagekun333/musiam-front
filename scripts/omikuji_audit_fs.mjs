import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const BASE = path.join(ROOT, "src", "data", "kannon100");
const OUTD = path.join(ROOT, "tempdata");
await fsp.mkdir(OUTD, { recursive: true });

const RE_HEADING = /^第[零〇一二三四五六七八九十百千兩两\d]+\s*(籤|签)?\s*[大中小末半]?[吉凶](?:\s|$)/;
const RE_RANKONLY = /^\s*[大中小末半]?[吉凶]\s*$/;
const RE_COLLOQ = /[のがをはにで了的吧呢嗎个個們着著把与與於而及和]/u;
const RE_HAN_4_12 = /^[\p{Script=Han}]{4,12}$/u;

function exists(p){ try{ fs.accessSync(p); return true; } catch{ return false; } }
function read(p){ try{ return fs.readFileSync(p,"utf8"); } catch{ return null; } }

const rows = [];
for (let id=1; id<=100; id++){
  const n = String(id).padStart(3,"0");
  const dir = path.join(BASE, n);

  const fFront = path.join(dir, "front.jpg");
  const fBack  = path.join(dir, "back.jpg");

  const txtCandidates = [
    path.join(dir, `原文${n}.txt`),
    path.join(dir,  "原文.txt"),
    path.join(BASE, `原文${n}.txt`),
    path.join(dir,  "genbun.txt"),
    path.join(dir,  "poem.txt"),
  ];
  let tpath = null;
  for (const c of txtCandidates){ if (exists(c)) { tpath = c; break; } }

  const frontOk = exists(fFront);
  const backOk  = exists(fBack);
  const t = tpath ? read(tpath) : null;

  let long=0, colloq=0, head=0, headJoin=0, poemCands=[];
  if (t){
    const lines = t.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    for (const s of lines){
      if (s.length > 20) long++;
      if (RE_COLLOQ.test(s)) colloq++;
      if (RE_HEADING.test(s) || RE_RANKONLY.test(s)) {
        head++;
        if (s.length > 10) headJoin++; // 見出し+本文連結疑い
        continue;
      }
      if (RE_HAN_4_12.test(s)) poemCands.push(s);
    }
    poemCands = [...new Set(poemCands)].slice(0,6);
  }

  const issues = [];
  if (!frontOk) issues.push("MISS_FRONT");
  if (!backOk)  issues.push("MISS_BACK");
  if (!tpath)   issues.push("MISS_TXT");
  if (t && headJoin>0) issues.push("HEADER_JOINED");
  if (t && (poemCands.length<4)) issues.push("POEM_LT4");
  if (t && colloq>0) issues.push("COLLOQ_LINES");

  rows.push({
    id, dir: dir.replace(ROOT,""),
    front: frontOk? "OK":"NG",
    back:  backOk?  "OK":"NG",
    txt: tpath ? tpath.replace(ROOT,"") : "(none)",
    long, colloq, head, headJoin,
    poemCount: poemCands.length,
    sample: poemCands.join(" / "),
    issues: issues.join("|")
  });
}

// CSV出力
const csvHead = "id,front,back,txt,long,colloq,head,headJoin,poemCount,sample,issues,dir";
const csv = [
  csvHead,
  ...rows.map(r=>[
    r.id, r.front, r.back, JSON.stringify(r.txt),
    r.long, r.colloq, r.head, r.headJoin,
    r.poemCount, JSON.stringify(r.sample), JSON.stringify(r.issues), JSON.stringify(r.dir)
  ].join(","))
].join("\n");

await fsp.writeFile(path.join(OUTD, "omikuji_fs_report.csv"), csv);
await fsp.writeFile(path.join(OUTD, "omikuji_fs_report.json"), JSON.stringify(rows,null,2));
console.log("✅ wrote:", path.join(OUTD, "omikuji_fs_report.csv"));
