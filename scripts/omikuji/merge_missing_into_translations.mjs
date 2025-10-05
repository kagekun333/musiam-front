import fs from "fs";
const MISS = "src/data/omikuji/line_translation_missing.json";
const JA = "scripts/omikuji/translations_ja.json";
const EN = "scripts/omikuji/translations_en.json";
if(!fs.existsSync(MISS)){ console.error("[merge-missing] no missing file"); process.exit(2); }
const miss = JSON.parse(fs.readFileSync(MISS,"utf8"));
const tja = fs.existsSync(JA)? JSON.parse(fs.readFileSync(JA,"utf8")) : {};
const ten = fs.existsSync(EN)? JSON.parse(fs.readFileSync(EN,"utf8")) : {};
let addJa=0, addEn=0;
for (const k of (miss.ja||[])) { if(!(k in tja)) { tja[k] = ""; addJa++; } }
for (const k of (miss.en||[])) { if(!(k in ten)) { ten[k] = ""; addEn++; } }
fs.writeFileSync(JA, JSON.stringify(tja,null,2), {encoding:"utf8"});
fs.writeFileSync(EN, JSON.stringify(ten,null,2), {encoding:"utf8"});
console.log(`[merge-missing] added JA:${addJa} EN:${addEn}`);