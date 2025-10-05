import fs from "fs";

function fillPlaceholders(file, placeholder){
  const obj = JSON.parse(fs.readFileSync(file,"utf8"));
  let changed = 0;
  for (const k of Object.keys(obj)) {
    const v = (obj[k]??"").toString().trim();
    if (!v) { obj[k] = placeholder; changed++; }
  }
  fs.writeFileSync(file, JSON.stringify(obj,null,2), {encoding:"utf8"});
  console.log(`[fill] ${file}: filled ${changed} empty values`);
}

fillPlaceholders("scripts/omikuji/translations_ja.json", "（訳準備中）");
fillPlaceholders("scripts/omikuji/translations_en.json", "TBD");