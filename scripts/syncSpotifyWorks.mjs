import fs from "node:fs/promises";
import path from "node:path";

const ARTIST_ID = "40pIwXpxwKnxzCjqQ7Xmzm";
const ROOT = process.cwd();

const WORKS_JSON_PATH = path.join(ROOT, "public", "works", "works.json");
const COVERS_DIR = path.join(ROOT, "public", "works", "covers");

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} ${url}\n${text}`);
  }
  return res.json();
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download: ${url}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function getAccessToken() {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const json = await fetchJson("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  return json.access_token;
}

// 作品IDは「安定」させる（毎回増殖しない）
function spotifyWorkId(kind, spotifyId) {
  return `spotify-${kind}-${spotifyId}`;
}

function normalizeReleaseDate(release_date, precision) {
  // Spotifyは "year" / "month" / "day"
  if (!release_date) return undefined;
  if (precision === "day") return release_date; // YYYY-MM-DD
  if (precision === "month") return `${release_date}-01`; // YYYY-MM-01
  if (precision === "year") return `${release_date}-01-01`; // YYYY-01-01
  // fallback
  return release_date.length === 4 ? `${release_date}-01-01` : release_date;
}

function pickBestImage(images = []) {
  // images: [{url,height,width}...] 大きい順に並んでることが多い
  if (!Array.isArray(images) || images.length === 0) return undefined;
  // 念のため最大widthを選ぶ
  return images.slice().sort((a, b) => (b?.width ?? 0) - (a?.width ?? 0))[0]?.url;
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function readWorksJson() {
  const raw = await fs.readFile(WORKS_JSON_PATH, "utf8");
  const doc = JSON.parse(raw);
  if (!doc || !Array.isArray(doc.items)) doc.items = [];
  return doc;
}

async function writeWorksJson(doc) {
  // 2スペース整形
  await fs.writeFile(WORKS_JSON_PATH, JSON.stringify(doc, null, 2) + "\n", "utf8");
}

function existingIdSet(items) {
  const s = new Set();
  for (const it of items) if (it?.id) s.add(it.id);
  return s;
}

// 既存のspotify作品も「上書き更新」できるようにMap化
function itemMapById(items) {
  const m = new Map();
  for (const it of items) if (it?.id) m.set(it.id, it);
  return m;
}

async function downloadCoverIfNeeded(spotifyEntityId, imageUrl) {
  // cover filename: spotify_<id>.jpg
  const fileName = `spotify_${spotifyEntityId}.jpg`;
  const outPath = path.join(COVERS_DIR, fileName);
  const publicPath = `/works/covers/${fileName}`;

  try {
    await fs.access(outPath);
    return publicPath; // 既にある
  } catch {}

  if (!imageUrl) return undefined;

  const buf = await fetchBuffer(imageUrl);
  await fs.writeFile(outPath, buf);
  return publicPath;
}

async function getAllArtistAlbums(token) {
  // アーティストのアルバム一覧（アルバム/シングル）
  // limit 50、offsetで全件取得
  const out = [];
  let offset = 0;
  const limit = 50;

  while (true) {
    const url =
      `https://api.spotify.com/v1/artists/${ARTIST_ID}/albums` +
      `?include_groups=album,single&market=JP&limit=${limit}&offset=${offset}`;
    const json = await fetchJson(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const items = json?.items ?? [];
    for (const a of items) out.push(a);

    if (!json?.next) break;
    offset += limit;
    // 念のため軽く待つ
    await sleep(120);
  }

  // 同じアルバムが複数出ることがあるのでidでユニーク化
  const byId = new Map();
  for (const a of out) if (a?.id) byId.set(a.id, a);
  return Array.from(byId.values());
}

async function main() {
  console.log("syncSpotifyWorks: start");
  await ensureDir(COVERS_DIR);

  const token = await getAccessToken();
  const worksDoc = await readWorksJson();
  const items = worksDoc.items;

  const idSet = existingIdSet(items);
  const map = itemMapById(items);

  const albums = await getAllArtistAlbums(token);

  let added = 0;
  let updated = 0;

  for (const a of albums) {
    const spotifyAlbumId = a.id;
    const kind = a.album_type === "single" ? "single" : "album";
    const workId = spotifyWorkId(kind, spotifyAlbumId);

    const title = a.name || "Untitled";
    const releasedAt = normalizeReleaseDate(a.release_date, a.release_date_precision);
    const spotifyUrl = a.external_urls?.spotify;
    const bestImage = pickBestImage(a.images);
    const cover = await downloadCoverIfNeeded(spotifyAlbumId, bestImage);

    const tags = ["spotify", kind];

    const nextItem = {
      id: workId,
      title,
      type: "music",
      cover: cover || bestImage || "",
      tags,
      releasedAt,
      previewUrl: "",
      href: spotifyUrl,
      links: { listen: spotifyUrl },
    };

    if (idSet.has(workId)) {
      // 既存を更新（タイトル変更や画像更新に追従）
      const prev = map.get(workId);
      Object.assign(prev, nextItem);
      updated++;
    } else {
      items.unshift(nextItem); // 新着を先頭に入れる（任意）
      idSet.add(workId);
      added++;
    }
  }

  // releasedAt descで全体を軽く整列（任意。嫌なら消してOK）
  items.sort((a, b) => {
    const ad = a?.releasedAt ? Date.parse(a.releasedAt) : 0;
    const bd = b?.releasedAt ? Date.parse(b.releasedAt) : 0;
    return bd - ad;
  });

  await writeWorksJson(worksDoc);

  console.log(`syncSpotifyWorks: done (added=${added}, updated=${updated}, total=${items.length})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
