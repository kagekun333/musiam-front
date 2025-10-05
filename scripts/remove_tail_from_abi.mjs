// scripts/remove_tail_from_abi.mjs
// Usage:
//   node scripts/remove_tail_from_abi.mjs            # -> dist/abi.json を処理
//   node scripts/remove_tail_from_abi.mjs path/to.json
//
// 挙動:
// - JSON内のあらゆる階層にある "tail" キーを削除
// - 書き込み前に .bak-ISO日時 でバックアップ作成
// - 削除数を表示。見つからなければ無変更

import fs from "node:fs";
import path from "node:path";

const target = process.argv[2] || "dist/abi.json";

if (!fs.existsSync(target)) {
  console.error(`[ERR] File not found: ${target}`);
  process.exit(1);
}

const raw = fs.readFileSync(target, "utf8");

let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error(`[ERR] JSON parse failed for ${target}: ${e.message}`);
  process.exit(1);
}

let removed = 0;

function stripTail(node) {
  if (Array.isArray(node)) {
    for (const v of node) stripTail(v);
  } else if (node && typeof node === "object") {
    if (Object.prototype.hasOwnProperty.call(node, "tail")) {
      delete node.tail;
      removed++;
    }
    for (const k of Object.keys(node)) {
      stripTail(node[k]);
    }
  }
}

stripTail(data);

if (removed === 0) {
  console.log("[INFO] No 'tail' fields found. No changes written.");
  process.exit(0);
}

// backup
const backup =
  target + ".bak-" + new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync(backup, raw);

// write updated
fs.writeFileSync(target, JSON.stringify(data, null, 2) + "\n");

console.log(`[OK] Removed ${removed} 'tail' field(s).`);
console.log(`[OK] Wrote ${target}`);
console.log(`[OK] Backup saved to ${backup}`);
