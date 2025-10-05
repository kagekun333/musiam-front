import fs from "fs";
for (const f of process.argv.slice(2)) {
  const raw = fs.readFileSync(f, "utf8").replace(/\uFEFF/g,"");
  fs.writeFileSync(f, raw, {encoding:"utf8"});
  console.log(`[bom] stripped: ${f}`);
}