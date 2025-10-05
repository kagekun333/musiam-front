import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src", "data", "omikuji");
const DIST = path.join(ROOT, "dist");

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }

function loadJSON(p){ return JSON.parse(fs.readFileSync(p,"utf8")); }

function buildOne(lang, core, localeArr){
  const byId = new Map(localeArr.map(x=>[x.id,x]));
  const out = core.map(c=>{
    const loc = byId.get(c.id) || {};
    const poem = (c.poem?.hanbun?.length ? c.poem.hanbun : (c.poem_kanji || []));
    return {
      id: c.id,
      rank: c.rank ?? "",
      poem: { hanbun: Array.isArray(poem) ? poem.slice(0,4) : [] },
      summary: loc.summary ?? "",
      items:   loc.items   ?? {}
    };
  });
  ensureDir(DIST);
  const fp = path.join(DIST, `omikuji_bundle.${lang}.json`);
  fs.writeFileSync(fp, JSON.stringify(out,null,2));
  console.log("write:", fp);
}

function main(){
  const core = loadJSON(path.join(SRC,"core.json"));
  const locDir = path.join(SRC,"locale");
  const langs = fs.readdirSync(locDir)
    .map(f=>f.match(/^(.+)\.json$/)?.[1])
    .filter(Boolean);

  for(const lang of langs){
    const localeArr = loadJSON(path.join(locDir, `${lang}.json`));
    buildOne(lang, core, localeArr);
  }
  console.log("✅ build: wrote dist/omikuji_bundle.<lang>.json for", langs.join(", "));
}
main();
