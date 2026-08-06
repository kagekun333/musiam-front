import fs from "node:fs/promises";
import path from "node:path";

const ARTIST_ID = "1811526635";
const ROOT = process.cwd();
const WORKS_PATH = path.join(ROOT, "public/works/works.json");
const COVERS_DIR = path.join(ROOT, "public/works/covers");
const API_URL = `https://itunes.apple.com/lookup?id=${ARTIST_ID}&entity=album&limit=200&country=US`;

function titleOf(collectionName = "") {
  return collectionName.replace(/\s+-\s+(Single|EP)$/i, "").trim();
}

function coverUrl(url = "") {
  return url.replace(/\/\d+x\d+bb\.jpg(?:\?.*)?$/, "/1600x1600bb.jpg");
}

async function downloadCover(collectionId, sourceUrl) {
  const fileName = `apple_${collectionId}.jpg`;
  const target = path.join(COVERS_DIR, fileName);
  try {
    await fs.access(target);
  } catch {
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`${collectionId}: cover HTTP ${response.status}`);
    await fs.writeFile(target, Buffer.from(await response.arrayBuffer()));
  }
  return `/works/covers/${fileName}`;
}

const response = await fetch(API_URL);
if (!response.ok) throw new Error(`Apple Music lookup HTTP ${response.status}`);
const lookup = await response.json();
const document = JSON.parse(await fs.readFile(WORKS_PATH, "utf8"));
const latestExistingMusicDate = document.items
  .filter((item) => item.type === "music")
  .map((item) => String(item.releasedAt || ""))
  .sort()
  .at(-1) || "0000-00-00";
const releases = lookup.results.filter((item) =>
  item.wrapperType === "collection"
  && item.artistId === Number(ARTIST_ID)
  && String(item.releaseDate).slice(0, 10) > latestExistingMusicDate
);
const existing = new Map(document.items.map((item) => [String(item.id), item]));
let added = 0;
const addedItems = [];

await fs.mkdir(COVERS_DIR, { recursive: true });
for (const release of releases) {
  const id = `apple-album-${release.collectionId}`;
  const artwork = coverUrl(release.artworkUrl100);
  const cover = await downloadCover(release.collectionId, artwork);
  const href = String(release.collectionViewUrl || "").replace(/[?&]uo=4(?:&|$)/, "");
  const next = {
    id,
    title: titleOf(release.collectionName),
    type: "music",
    cover,
    tags: ["apple-music", release.trackCount === 1 ? "single" : "album"],
    releasedAt: String(release.releaseDate).slice(0, 10),
    previewUrl: "",
    href,
    primaryHref: href,
    links: { appleMusic: href, listen: href },
  };
  if (!existing.has(id)) {
    addedItems.push(next);
    existing.set(id, next);
    added += 1;
  }
}

addedItems.sort((a, b) => String(b.releasedAt || "").localeCompare(String(a.releasedAt || "")) || String(a.id).localeCompare(String(b.id)));
document.items = [...addedItems, ...document.items];
await fs.writeFile(WORKS_PATH, `${JSON.stringify(document, null, 2)}\n`);
console.log(`syncAppleMusicWorks: done (after=${latestExistingMusicDate}, source=${releases.length}, added=${added}, existingChanged=0, total=${document.items.length})`);
