import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

type Asset = { id: string; work: string; audience: string; hook: string; landingPath: string };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const locale = process.env.METAL_PRINT_CAMPAIGN_LOCALE === "en" ? "en" : "ja";
const packPath = path.join(root, `ops/metal-print-vip/organic-content-pack${locale === "en" ? "-en" : ""}-2026-07.json`);
const outputDir = path.join(root, `public/metal-print-campaign${locale === "en" ? "-en" : ""}`);
const pack = JSON.parse(fs.readFileSync(packPath, "utf8")) as { assets: Asset[] };
const covers: Record<string, string> = {
  "33 IGNITION": "public/works/covers-ssd/ssd-ed8295c7-01c4-4537-ac2309419d92f405.jpg",
  "A Town Called Almost Home": "public/works/covers-ssd/ssd-47c2c9a9-7793-40a9-8143f4e65713b181.jpg",
  BALIAN: "public/works/covers/spotify_1vLThFMjRi4noudDkGwf5f.jpg",
  "Deus sive Natura": "public/works/covers-ssd/ssd-ec48aba3-eada-4e60-bf993f67efc15af3.jpg",
};

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
}

function wrap(value: string, width = 22) {
  if (locale === "en") {
    const chunks: string[] = [];
    let line = "";
    for (const word of value.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > 42 && line) { chunks.push(line); line = word; } else line = next;
    }
    if (line) chunks.push(line);
    return chunks.slice(0, 3);
  }
  const chunks: string[] = [];
  let line = "";
  for (const character of value) {
    line += character;
    if (line.length >= width || /[。！？]/.test(character)) { chunks.push(line); line = ""; }
  }
  if (line) chunks.push(line);
  return chunks.slice(0, 3);
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  for (const asset of pack.assets) {
    const cover = covers[asset.work];
    if (!cover) throw new Error(`${asset.id}: cover mapping missing`);
    const image = await sharp(path.join(root, cover)).resize(1080, 1080, { fit: "cover" }).jpeg({ quality: 94 }).toBuffer();
    const lines = wrap(asset.hook).map((line, index) => `<text x="64" y="${1142 + index * 48}" fill="#f5efe0" font-family="serif" font-size="${locale === "en" ? 34 : 38}">${escapeXml(line)}</text>`).join("");
    const overlay = Buffer.from(`<svg width="1080" height="1350" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#080708"/><stop offset="1" stop-color="#17120a"/></linearGradient></defs>
      <rect y="1080" width="1080" height="270" fill="url(#fade)"/>
      <rect x="64" y="1108" width="72" height="3" fill="#d8b65c"/>
      ${lines}
      <text x="64" y="1310" fill="#d8b65c" font-family="sans-serif" font-size="20" letter-spacing="4">HAKUSYAKU MUSIAM · COLLECTOR PREVIEW</text>
      <text x="1016" y="1310" text-anchor="end" fill="#8f7b4e" font-family="sans-serif" font-size="17">${escapeXml(asset.id)}</text>
    </svg>`);
    const output = path.join(outputDir, `${asset.id.toLowerCase()}.jpg`);
    await sharp({ create: { width: 1080, height: 1350, channels: 3, background: "#080708" } })
      .composite([{ input: image, top: 0, left: 0 }, { input: overlay, top: 0, left: 0 }])
      .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
      .toFile(output);
  }
  console.log(`metal-print campaign assets: ${pack.assets.length} files written to ${outputDir}`);
}

void main();
