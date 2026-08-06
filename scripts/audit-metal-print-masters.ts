import fs from "node:fs";
import path from "node:path";

const sourceRoot = "/Volumes/PortableSSD/mv-factory-os-data/伯爵MUSIC/releases";
const supportedNames = ["cover.png", "cover.jpg", "cover.jpeg"];
const provisionalMinimumLongSidePx = 3000;

type Dimensions = { width: number; height: number };

function readPngDimensions(filePath: string): Dimensions | null {
  const data = fs.readFileSync(filePath);
  const signature = "89504e470d0a1a0a";
  if (data.subarray(0, 8).toString("hex") !== signature || data.length < 24) return null;
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

function readJpegDimensions(filePath: string): Dimensions | null {
  const data = fs.readFileSync(filePath);
  if (data.length < 10 || data[0] !== 0xff || data[1] !== 0xd8) return null;
  const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 9 < data.length) {
    if (data[offset] !== 0xff) { offset += 1; continue; }
    const marker = data[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const length = data.readUInt16BE(offset);
    if (length < 2 || offset + length > data.length) return null;
    if (sofMarkers.has(marker)) return { height: data.readUInt16BE(offset + 3), width: data.readUInt16BE(offset + 5) };
    offset += length;
  }
  return null;
}

function dimensions(filePath: string): Dimensions | null {
  return /\.png$/i.test(filePath) ? readPngDimensions(filePath) : readJpegDimensions(filePath);
}

if (!fs.existsSync(sourceRoot)) throw new Error(`Source mount unavailable: ${sourceRoot}`);

const masters = fs.readdirSync(sourceRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((entry) => {
    const releasePath = path.join(sourceRoot, entry.name);
    const assetName = supportedNames.find((name) => fs.existsSync(path.join(releasePath, name)));
    if (!assetName) return [];
    const sourcePath = path.join(releasePath, assetName);
    const pixels = dimensions(sourcePath);
    if (!pixels) return [];
    return [{
      title: entry.name,
      sourcePath,
      pixels,
      longSidePx: Math.max(pixels.width, pixels.height),
      provisionalPrintMaster: Math.max(pixels.width, pixels.height) >= provisionalMinimumLongSidePx,
    }];
  });

const qualified = masters.filter((master) => master.provisionalPrintMaster);
console.log(JSON.stringify({
  sourceRoot,
  provisionalMinimumLongSidePx,
  auditedCount: masters.length,
  qualifiedCount: qualified.length,
  qualified,
  note: "Read-only source audit. A qualifying source is a candidate master only; rights, print proof, physical specification, cost, and lead time still require verification before offering it."
}, null, 2));
