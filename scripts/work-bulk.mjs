// Bulk ingest for MUSIAM Exhibition
// Run: node scripts/work-bulk.mjs [import/all.tsv]

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const inTsv = process.argv[2] || "import/all.tsv";
const root = process.cwd();
const P = (...x) => path.join(root, ...x);

function toPublicURL(s) {
  if (!s) return "";
  let t = String(s).replace(/\\/g, "/").trim();
  // http/https はそのまま
  if (/^[a-z]+:\/\//i.test(t)) return t;
  // /public をURLから剥がし、先頭スラッシュを補う
  t = t.replace(/^\/?public\//, "/");
  if (!t.startsWith("/")) t = "/" + t;
  return t;
}

function parseTsv(file) {
  const raw = fs.readFileSync(file, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error(`TSV has no data rows: ${file}`);
  const H = lines[0].split("\t");
  const idx = Object.fromEntries(H.map((k, i) => [k, i]));

  // 想定11列: title type tags releasedAt weight cover localAudioOrURL localPdfOrURL preview sourceURL href
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split("\t");
    rows.push({
      title: c[idx.title] || "",
      type: c[idx.type] || "",
      tags: (c[idx.tags] || "").split(/[;,]\s*/).filter(Boolean),
      releasedAt: c[idx.releasedAt] || "",
      weight: c[idx.weight] ? Number(c[idx.weight]) : undefined,
      cover: c[idx.cover] || "",
      localAudioOrURL: c[idx.localAudioOrURL] || "",
      localPdfOrURL: c[idx.localPdfOrURL] || "",
      preview: c[idx.preview] || "",
      sourceURL: c[idx.sourceURL] || "",
      href: c[idx.href] || "",
    });
  }
  return rows;
}

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";
}

(async () => {
  const rows = parseTsv(inTsv);

  const items = rows.map((r, i) => {
    const links = {};
    // ★ここが肝: localAudioOrURL → links.listen / localPdfOrURL → links.read
    if (r.localAudioOrURL) links.listen = toPublicURL(r.localAudioOrURL);
    if (r.localPdfOrURL)   links.read   = toPublicURL(r.localPdfOrURL);

    return {
      id: `${slugify(r.title)}-${i}`,                    // 一意ID（TSVにid列が無い前提）
      title: r.title,
      type: r.type,
      cover: toPublicURL(r.cover),
      tags: r.tags,
      releasedAt: r.releasedAt || undefined,
      weight: r.weight,
      previewUrl: toPublicURL(r.preview),                // フロントは previewUrl を読む
      href: r.href || r.sourceURL || "",                 // クリック先があれば
      ...(Object.keys(links).length ? { links } : {}),   // links を持つ時だけ出力
    };
  });

  await fsp.mkdir(P("public/works"), { recursive: true });
  fs.writeFileSync(P("public/works/works.json"), JSON.stringify({ items }, null, 2));
  console.log("wrote public/works/works.json:", items.length);
})();
