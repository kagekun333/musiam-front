import fs from "node:fs/promises";
import path from "node:path";

const TMP = path.join(process.cwd(),"tempdata");
await fs.mkdir(TMP,{recursive:true});
const read = async p => JSON.parse(await fs.readFile(p,"utf8"));

const JA = await read("dist/omikuji_bundle.ja.json");
const EN = await read("dist/omikuji_bundle.en.json");
const ERR=[];

// 許容ランク（Unicode エスケープ）
const ALLOWED_RANK = new Set(["\u5927\u5409","\u4E2D\u5409","\u5C0F\u5409","\u5409","\u534A\u5409","\u672B\u5409","\u672B\u5C0F\u5409","\u51F6","\u5C0F\u51F6","\u534A\u51F6","\u672B\u51F6","\u5927\u51F6"]);

function chk(items, lang){
  const seen=new Set();
  for(const it of items){
    const {id,label,poem,summary,items:sub,rank} = it;
    if(seen.has(id)) ERR.push({id,code:"DUP_ID",msg:`dup (${lang})`}); else seen.add(id);
    if(!(label&&label.short)) ERR.push({id,code:"NO_LABEL",msg:`(${lang})`});
    if(!(poem&&Array.isArray(poem.hanbun)&&poem.hanbun.length===4)) ERR.push({id,code:"POEM_NOT_4",msg:`(${lang})`});
    for(const line of (poem?.hanbun||[])) if(!line || !line.trim()) ERR.push({id,code:"POEM_EMPTY",msg:`(${lang})`});
    if(!summary || !summary.trim()) ERR.push({id,code:"SUMMARY_EMPTY",msg:`(${lang})`});
    const need = ["wish","health","lost","person","houseMove","marriage"];
    for(const k of need){
      const v = sub?.[k];
      if(typeof v !== "string" || !v.trim()) ERR.push({id,code:`ITEM_${k.toUpperCase()}_EMPTY`,msg:`(${lang})`});
    }
    const rk = rank?.short;
    if(rk && !ALLOWED_RANK.has(rk)) ERR.push({id,code:"RANK_INVALID",msg:`${rk} (${lang})`});
  }
}
chk(JA,"ja"); chk(EN,"en");

const toCSV = rows => ["id,code,msg", ...rows.map(r=>[r.id,r.code,JSON.stringify(r.msg)].join(","))].join("\n");
await fs.writeFile(path.join(TMP,"qa_report.json"), JSON.stringify(ERR,null,2));
await fs.writeFile(path.join(TMP,"qa_report.csv"), toCSV(ERR));
console.log(`✅ validate: ${ERR.length} issues (see tempdata/qa_report.*)`);
if(ERR.length>0){ process.exitCode=1; }
