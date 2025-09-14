// node .musiam/ops/preflight.js
const fs = require("fs");
const path = require("path");
const cp = require("child_process");

function git(cmd){ return cp.execSync(cmd,{encoding:"utf8"}).trim(); }

const locks = (() => {
  try {
    const yaml = require("yaml");
    const txt = fs.readFileSync(path.join(__dirname,"../rules/locks.yaml"),"utf8");
    return (yaml.parse(txt)?.LOCKED || []).map(p => p.replace(/\\/g,"/"));
  } catch { return []; }
})();

const diff = git("git diff --name-only --cached").split("\n").filter(Boolean).map(p=>p.replace(/\\/g,"/"));

const lockedTouched = diff.filter(f => locks.includes(f));
if (lockedTouched.length) {
  console.error("❌ LOCKEDファイルに変更があります:", lockedTouched.join(", "));
  process.exit(1);
}

// App/Pages の重複ルート検出（同名はNG）
function exists(p){ try{ fs.accessSync(p); return true; } catch { return false; } }
const pages = diff.filter(f => f.startsWith("src/pages/") && f.endsWith(".tsx"));
const apps  = diff.filter(f => f.startsWith("src/app/")   && /\/page\.tsx$/.test(f));

const pageNames = new Set(pages.map(f => f.replace(/^src\/pages\//,"").replace(/\.tsx$/,"")));
for (const a of apps) {
  const name = a.replace(/^src\/app\//,"").replace(/\/page\.tsx$/,"");
  if (pageNames.has(name)) {
    console.error("❌ App/Pagesで重複ルート:", name);
    process.exit(1);
  }
}

// pages_legacy は型・ビルド対象外であるべき
try {
  const ts = JSON.parse(fs.readFileSync("tsconfig.json","utf8"));
  const ex = (ts.exclude || []);
  const need = ["src/pages_legacy/**/*","src/_archive/**/*"];
  for (const n of need) if (!ex.includes(n)) {
    console.warn("⚠ tsconfig.json の exclude に入っていません:", n);
  }
} catch {}

console.log("✅ preflight OK");
