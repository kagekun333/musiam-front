#!/usr/bin/env node
/**
 * musiam-front 用ディレクトリツリー生成スクリプト v1.1
 * - PowerShell互換の引数パーサ（--out=TREE.md / --out TREE.md の両対応）
 * - Markdown/テキスト切替（--format=md|text）
 * - 出力ファイル指定（--out=FILE）。未指定はstdout。--out=- もstdout。
 * - デフォ除外フォルダあり（node_modules/.git/.next/dist…）
 * - 深さ（--max-depth）/ ファイル表示（--include-files）
 *
 * 例:
 *   node scripts/generate-tree.mjs --max-depth=4 --out=TREE.md
 *   node scripts/generate-tree.mjs --include-files --max-depth 6 --format=text > TREE.txt
 */

import fs from "fs";
import path from "path";

// ---------- 引数パース（PowerShell/ Bash 両対応） ----------
function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      args._.push(a);
      continue;
    }
    // --key=value 形式
    if (a.includes("=")) {
      const idx = a.indexOf("=");
      const k = a.slice(2, idx);
      const v = a.slice(idx + 1);
      args[k] = v;
      continue;
    }
    // --flag / --key value 形式
    const k = a.replace(/^--/, "");
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[k] = next;
      i++; // 次の引数を消費
    } else {
      args[k] = true; // 値なしフラグ
    }
  }
  return args;
}

const CWD = process.cwd();
const args = parseArgs(process.argv);

const ROOT = path.resolve(CWD, args.root || ".");
const MAX_DEPTH = Number(args["max-depth"] ?? 4);
const INCLUDE_FILES = Boolean(args["include-files"] ?? false);
const FORMAT = (args.format || "md").toLowerCase(); // md | text
let OUT = args.out ?? null;

// --out が boolean true の事故対策：stdoutにフォールバック
if (OUT === true) OUT = null;
// 明示的に stdout を指定したいとき
if (OUT === "-" || OUT === "stdout") OUT = null;

const TITLE = args.title || `${path.basename(ROOT)} directory tree`;

const DEFAULT_EXCLUDES = [
  "node_modules",
  ".git",
  ".next",
  "dist",
  "out",
  "coverage",
  ".turbo",
  ".vercel",
  ".cache",
  "build",
  "tmp",
  ".DS_Store",
];

const extraEx = (args.exclude || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const EXCLUDE_SET = new Set(
  [...DEFAULT_EXCLUDES, ...extraEx].map((s) => s.replace(/[/\\]+$/, ""))
);

function isExcluded(name) {
  return EXCLUDE_SET.has(name);
}

function readDirSafe(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function sortEntries(entries) {
  const dirs = entries.filter((e) => e.isDirectory());
  const files = entries.filter((e) => e.isFile() || e.isSymbolicLink());
  dirs.sort((a, b) => a.name.localeCompare(b.name, "en"));
  files.sort((a, b) => a.name.localeCompare(b.name, "en"));
  return { dirs, files };
}

function drawTree(dir, depth = 0, prefix = "") {
  const entries = readDirSafe(dir).filter((e) => !isExcluded(e.name));
  const { dirs, files } = sortEntries(entries);

  const lines = [];
  const list = INCLUDE_FILES ? [...dirs, ...files] : dirs;

  list.forEach((ent, idx) => {
    const isLast = idx === list.length - 1;
    const branch = isLast ? "└── " : "├── ";
    lines.push(prefix + branch + ent.name);

    const full = path.join(dir, ent.name);
    if (ent.isDirectory() && depth + 1 < MAX_DEPTH) {
      const nextPrefix = prefix + (isLast ? "    " : "│   ");
      lines.push(...drawTree(full, depth + 1, nextPrefix));
    }
  });

  return lines;
}

function renderMarkdown(title, root) {
  const lines = drawTree(root, 0, "");
  const relRoot = path.relative(CWD, root) || ".";
  return [
    `# ${title}`,
    ``,
    `Root: \`${relRoot}\`  |  Depth: \`${MAX_DEPTH}\`  |  Files: \`${INCLUDE_FILES}\``,
    ``,
    "```text",
    path.basename(root),
    ...lines,
    "```",
    "",
  ].join("\n");
}

function renderText(root) {
  const lines = drawTree(root, 0, "");
  return [path.basename(root), ...lines, ""].join("\n");
}

function main() {
  if (!fs.existsSync(ROOT)) {
    console.error(`[ERR] Root not found: ${ROOT}`);
    process.exit(1);
  }

  const body =
    FORMAT === "text" ? renderText(ROOT) : renderMarkdown(TITLE, ROOT);

  if (OUT) {
    // 出力先の親ディレクトリが無い場合は作成
    const dir = path.dirname(path.resolve(CWD, OUT));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(OUT, body, "utf8");
    console.log(`[OK] Tree written to ${OUT}`);
  } else {
    // 標準出力
    process.stdout.write(body);
  }
}

main();
