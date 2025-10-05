// scripts/sync_kannon_images.mjs
// src/data/kannon100/NNN/{front,back}.jpg(等) → public/images/kannon100/NNN/ に同期
import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SRC  = path.join(ROOT, "src", "data", "kannon100");      // 画像の元フォルダ
const DEST = path.join(ROOT, "public", "images", "kannon100");  // 公開パス: /images/kannon100

const EXTS = ["jpg", "jpeg", "png", "webp"]; // 万一拡張子が違っても拾えるように

async function ensureDir(dir) { await fs.mkdir(dir, { recursive: true }); }

async function firstExisting(fileBases) {
  for (const base of fileBases) {
    try { await fs.access(base); return base; } catch {}
  }
  return null;
}

async function copyFile(src, dest) {
  const buf = await fs.readFile(src);
  await ensureDir(path.dirname(dest));
  await fs.writeFile(dest, buf);
  console.log("copied:", dest);
}

async function main() {
  for (let id = 1; id <= 100; id++) {
    const n = String(id).padStart(3, "0");
    const srcDir = path.join(SRC, n);
    const destDir = path.join(DEST, n);

    const frontCandidates = EXTS.map(ext => path.join(srcDir, `front.${ext}`));
    const backCandidates  = EXTS.map(ext => path.join(srcDir, `back.${ext}`));

    const frontSrc = await firstExisting(frontCandidates);
    const backSrc  = await firstExisting(backCandidates);

    if (frontSrc) await copyFile(frontSrc, path.join(destDir, "front.jpg"));
    if (backSrc)  await copyFile(backSrc,  path.join(destDir, "back.jpg"));
  }
  console.log("✅ synced images → public/images/kannon100");
}

main().catch(e => {
  console.error("sync error:", e);
  process.exit(1);
});
