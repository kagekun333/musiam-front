#!/usr/bin/env node
// scripts/gen-ssd-covers.mjs
//
// works-ssd.json の cover が空な作品について、
// SSD 側の cover.jpeg を読み、public/works/covers-ssd/*.jpg に縮小コピーする。
//
// sharp 非依存で動かすため、macOS の sips を優先使用。

import fs from "node:fs/promises";
import path from "node:path";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);

const ROOT = process.cwd();
const WORKS_SSD_PATH = path.join(ROOT, "public/works/works-ssd.json");
const OUT_DIR = path.join(ROOT, "public/works/covers-ssd");
const SSD_ROOT =
  process.env.SSD_ROOT || "/Volumes/PortableSSD/mv-factory-os-data/伯爵MUSIC";

function asArray(json) {
  return Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : [];
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function resolveSourceCover(localCover) {
  if (!localCover) return "";
  const direct = path.join(SSD_ROOT, localCover);
  if (await fileExists(direct)) return direct;

  const parsed = path.parse(path.join(SSD_ROOT, localCover));
  for (const ext of [".jpeg", ".jpg", ".png", ".webp"]) {
    const candidate = path.join(parsed.dir, parsed.name + ext);
    if (await fileExists(candidate)) return candidate;
  }
  return "";
}

async function convertWithSips(src, dest) {
  await execFile("sips", ["-s", "format", "jpeg", "-Z", "1200", src, "--out", dest], {
    maxBuffer: 10 * 1024 * 1024,
  });
}

function escapeXml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function writePlaceholderSvg(dest, title) {
  const lines = String(title || "Untitled")
    .match(/.{1,14}/g) || ["Untitled"];
  const text = lines
    .slice(0, 3)
    .map(
      (line, idx) =>
        `<text x="50%" y="${46 + idx * 9}%" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="${
          idx === 0 ? 44 : 34
        }" fill="#f6f0d9">${escapeXml(line)}</text>`
    )
    .join("");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#111827"/>
      <stop offset="55%" stop-color="#1f2937"/>
      <stop offset="100%" stop-color="#3f2b14"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1200" fill="url(#g)"/>
  <rect x="64" y="64" width="1072" height="1072" rx="36" fill="none" stroke="#d4a954" stroke-width="4" opacity="0.7"/>
  ${text}
  <text x="50%" y="86%" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="28" fill="#d6d3d1" letter-spacing="6">HAKUSYAKU MUSIC</text>
</svg>`;
  await fs.writeFile(dest, svg, "utf8");
}

async function main() {
  const raw = await fs.readFile(WORKS_SSD_PATH, "utf8");
  const json = JSON.parse(raw);
  const items = asArray(json);

  await fs.mkdir(OUT_DIR, { recursive: true });

  let converted = 0;
  let skipped = 0;
  let missingSource = 0;

  for (const item of items) {
    const currentCover = String(item.cover || "").trim();
    const isGeneratedPlaceholder = /^\/works\/covers-ssd\/.+\.svg$/i.test(currentCover);
    if (currentCover && !isGeneratedPlaceholder) continue;
    const localCover = item?.ssd?.localCover;
    if (!localCover) {
      const destName = `${item.id}.svg`;
      const dest = path.join(OUT_DIR, destName);
      await writePlaceholderSvg(dest, item.title);
      item.cover = `/works/covers-ssd/${destName}`;
      missingSource++;
      continue;
    }

    const src = await resolveSourceCover(localCover);
    if (!src) {
      const destName = `${item.id}.svg`;
      const dest = path.join(OUT_DIR, destName);
      await writePlaceholderSvg(dest, item.title);
      item.cover = `/works/covers-ssd/${destName}`;
      missingSource++;
      continue;
    }

    const destName = `${item.id}.jpg`;
    const dest = path.join(OUT_DIR, destName);

    try {
      await convertWithSips(src, dest);
      item.cover = `/works/covers-ssd/${destName}`;
      converted++;
    } catch {
      try {
        await fs.copyFile(src, dest);
        item.cover = `/works/covers-ssd/${destName}`;
        converted++;
      } catch {
        skipped++;
      }
    }
  }

  const out = {
    ...json,
    items,
    coversGeneratedAt: new Date().toISOString(),
  };

  await fs.writeFile(WORKS_SSD_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ converted, skipped, missingSource }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
