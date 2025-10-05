import fs from "fs";
const p = "src/data/omikuji/line_translation_missing.json";
if (!fs.existsSync(p)) { console.error(`[missing] not found: ${p}`); process.exit(1); }
const obj = JSON.parse(fs.readFileSync(p,"utf8"));
const ja = Array.isArray(obj.ja)?obj.ja:Object.keys(obj.ja||{});
const en = Array.isArray(obj.en)?obj.en:Object.keys(obj.en||{});
const n = (ja.length||0) + (en.length||0);
if (n>0) { console.error(`[missing] pending keys: ${n}`); process.exit(1); }
console.log("[missing] OK: {}");