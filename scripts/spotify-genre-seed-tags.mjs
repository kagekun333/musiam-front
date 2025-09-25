// scripts/spotify-genre-seed-tags.mjs
// 目的: 作品内の Spotify URL を検出し、moodSeeds を付与する
// 優先: (1) artists.genres → 種タグ, (2) related-artists[].genres → 種タグ
// 予備: (3) タイトル/タグ/説明のキーワード → 種タグ（最後の砦）
// 404 対策: /artists/{id} が 404 の場合は /search?type=artist&q=<name> で ID 再解決
// キャッシュ: artists, related, search をメモ化
//
// 実行例:
//   $env:SPOTIFY_MARKET='US'; node -r dotenv/config scripts/spotify-genre-seed-tags.mjs dotenv_config_path=.env.local

import fs from "node:fs";
import path from "node:path";

const DEBUG = (process.env.DEBUG || "false").toLowerCase() === "true";
const MARKET = process.env.SPOTIFY_MARKET || "US";
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("[spotify] SPOTIFY_CLIENT_ID/SECRET not set");
  process.exit(1);
}

const WORKS_PATH = path.resolve("public/works/works.json");
const SLEEP_MS = 160;

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function chunk(a,n){ const o=[]; for(let i=0;i<a.length;i+=n) o.push(a.slice(i,i+n)); return o; }

function readWorks(){
  const raw = fs.readFileSync(WORKS_PATH,"utf8");
  const data = JSON.parse(raw);
  const list = Array.isArray(data) ? data : (data.items||data.data||data.works||[]);
  return { data, list };
}
function writeWorks(base, list){
  const out = Array.isArray(base) ? list : { ...base };
  if (!Array.isArray(base)) {
    if (base.items) out.items = list;
    else if (base.data) out.data = list;
    else if (base.works) out.works = list;
  }
  fs.writeFileSync(WORKS_PATH, JSON.stringify(out, null, 2));
}

async function getToken(){
  const body = new URLSearchParams();
  body.set("grant_type","client_credentials");
  const res = await fetch("https://accounts.spotify.com/api/token",{
    method:"POST",
    headers:{
      Authorization:"Basic "+Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
      "Content-Type":"application/x-www-form-urlencoded"
    },
    body
  });
  if (!res.ok) throw new Error("token: "+res.status);
  const json = await res.json();
  return json.access_token;
}

async function api(token, url){
  const res = await fetch(url,{ headers:{ Authorization:`Bearer ${token}` } });
  if (res.status === 429) {
    const retry = parseInt(res.headers.get("retry-after")||"1",10)*1000;
    if (DEBUG) console.log("[429] sleep", retry,"ms");
    await sleep(retry);
    return api(token, url);
  }
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return await res.json();
}

// ===== Spotify URL 検出 =====
const RX = {
  any:   /https?:\/\/open\.spotify\.com\/(album|track|artist)\/([A-Za-z0-9]+)(?:\?.*)?/ig,
  uri:   /spotify:(album|track|artist):([A-Za-z0-9]+)/ig,
};
function* walkValues(obj){
  if (obj == null) return;
  if (typeof obj === "string") { yield obj; return; }
  if (Array.isArray(obj)) { for (const v of obj) yield* walkValues(v); return; }
  if (typeof obj === "object") { for (const k of Object.keys(obj)) yield* walkValues(obj[k]); }
}
function extractSpotifyRefs(work){
  const found = new Set();
  for (const val of walkValues(work)) {
    if (typeof val !== "string") continue;
    let m;
    RX.any.lastIndex = 0;
    while ((m = RX.any.exec(val))) found.add(`${m[1].toLowerCase()}:${m[2]}`);
    RX.uri.lastIndex = 0;
    while ((m = RX.uri.exec(val))) found.add(`${m[1].toLowerCase()}:${m[2]}`);
  }
  return Array.from(found).map(s=>{ const [kind,id] = s.split(":"); return { kind, id }; });
}

// ===== ジャンル→種タグ（1定義） =====
const GENRE_SEED_RULES = [
  // ポップ系
  { test: [/city ?pop/, /j-?pop/, /dance pop/, /\bindie pop\b/, /bedroom pop/], seeds: ["キャッチー","高揚","ポップ"] },
  // エレクトロ系
  { test: [/edm/, /house/, /techno/, /trance/, /electro/, /electronica/, /synthwave/, /future funk/, /vaporwave/], seeds: ["クラブ","疾走","高揚"] },
  // 和系エレクトロ/サブカル
  { test: [/japanese electronic/, /shibuya[- ]?kei/, /denpa|vocaloid|utaite|anisong|anime/], seeds: ["キャッチー","ポップ","ドリーミー"] },
  // ロック/ギター
  { test: [/\bindie rock\b/, /alt rock|alternative rock/, /math rock/, /post[- ]?rock/, /shoegaze/, /grunge/], seeds: ["熱量","内省","ドリーミー"] },
  { test: [/rock/, /metal/, /punk/], seeds: ["アグレッシブ","反骨","熱量"] },
  // ヒップホップ/R&B
  { test: [/hip ?hop|rap|trap/, /boom bap/, /drill/], seeds: ["アーバン","グルーヴ","ビター"] },
  { test: [/r&b|neo[- ]?soul|soultronica/], seeds: ["スムース","ロマンティック","夜"] },
  // ジャズ/ワールド
  { test: [/jazz|nu[- ]?jazz|jazztronica|bossa|samba/], seeds: ["洒脱","チル","余韻"] },
  { test: [/world|ethnic|afro|balkan|celtic/], seeds: ["民族","地平","スピリチュアル"] },
  // 和物
  { test: [/enka|kayoukyoku|kayōkyoku|citypop jp|jp funk/], seeds: ["ノスタルジー","叙情","温もり"] },
  // ダーク/ハード
  { test: [/industrial|ebm|dark|goth|witch house|noise/], seeds: ["ダーク","緊張","陰影"] },
  // アンビエント/実験
  { test: [/ambient|drone|idm|glitch|downtempo|trip[- ]?hop/], seeds: ["浮遊","内省","ドリーミー"] },
  // アコースティック/フォーク
  { test: [/folk|acoustic|singer[- ]?songwriter/], seeds: ["素朴","温もり","ノスタルジー"] },
  // ローファイ・チル
  { test: [/lo[- ]?fi|chill|lounge/], seeds: ["チル","リラックス","夜"] },
  // クラシック/スコア
  { test: [/classical|orchestral|score|soundtrack/], seeds: ["荘厳","映画的","叙情"] },
];
function genresToSeeds(genres){
  const g = (genres||[]).map(x=>String(x).toLowerCase());
  const out = new Set();
  for (const rule of GENRE_SEED_RULES) {
    if (rule.test.some(rx => g.some(s => rx.test(s)))) {
      for (const s of rule.seeds) out.add(s);
    }
  }
  return Array.from(out);
}

// ===== タイトル/タグ/説明 → 種タグ（最後の砦） =====
const TEXT_SEED_RULES = [
  { test: /(tokyo|city|urban|都会|渋谷|新宿|neon)/i, seeds: ["アーバン","グルーヴ"] },
  { test: /(matsuri|祭|wasshoi|nebuta|taiko|盆|bon)/i, seeds: ["情熱","熱量","ダンス"] },
  { test: /(ambient|drone|sleep|calm|ocean|lagoon|bay|tide)/i, seeds: ["浮遊","チル","ドリーミー"] },
  { test: /(run|rise|drive|高速|疾走|rush|dash|race|turbo|dragon)/i, seeds: ["疾走","高揚"] },
  { test: /(dark|goth|shadow|meltdown|崩壊|破壊|abyss|black)/i, seeds: ["ダーク","緊張"] },
  { test: /(jazz|swing|blue|bossa)/i, seeds: ["洒脱","余韻"] },
  { test: /(lo[-\s]?fi|chill|coffee|study)/i, seeds: ["チル","リラックス"] },
  { test: /(space|宇宙|zero ?gravity|orbit)/i, seeds: ["浮遊","高揚"] },
  { test: /(love|恋|ラブ|romance)/i, seeds: ["ロマンティック","ポップ"] },
  { test: /(acoustic|アコースティック|folk|wood|campfire)/i, seeds: ["素朴","温もり"] },
{ test: /(演歌)/i, seeds: ["ノスタルジー","叙情","温もり"] },
{ test: /(海|夏|花火|浜辺|波)/i, seeds: ["チル","浮遊","リラックス"] },
{ test: /\bwakaze\b/i, seeds: ["情熱","熱量","ダンス"] },



];
function seedsFromText(text){
  const out = new Set();
  if (!text) return [];
  for (const rule of TEXT_SEED_RULES) {
    if (rule.test.test(text)) { for (const s of rule.seeds) out.add(s); }
  }
  return Array.from(out);
}

// ===== API: 取得ロジック =====
async function collectArtistsFromAlbum(token, albumId){
  const ids = new Set(), nameById = new Map();
  const album = await api(token, `https://api.spotify.com/v1/albums/${albumId}?market=${MARKET}`);
  for (const a of (album.artists||[])) { ids.add(a.id); nameById.set(a.id, a.name); }
  let next = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50&market=${MARKET}`;
  while (next) {
    const page = await api(token, next);
    for (const t of (page.items||[])) {
      for (const a of (t.artists||[])) { ids.add(a.id); nameById.set(a.id, a.name); }
    }
    next = page.next;
    if (next) await sleep(SLEEP_MS);
  }
  return { artistIds: Array.from(ids), nameById };
}
async function collectArtistsFromTrack(token, trackId){
  const ids = new Set(), nameById = new Map();
  const track = await api(token, `https://api.spotify.com/v1/tracks/${trackId}?market=${MARKET}`);
  for (const a of (track.artists||[])) { ids.add(a.id); nameById.set(a.id, a.name); }
  if (track.album && track.album.id) {
    const got = await collectArtistsFromAlbum(token, track.album.id);
    for (const id of got.artistIds) ids.add(id);
    for (const [id, name] of got.nameById) nameById.set(id, name);
  }
  return { artistIds: Array.from(ids), nameById };
}

// ===== キャッシュ =====
const cacheArtistObj = new Map();      // id -> artist object (/artists/{id})
const cacheArtistGenres = new Map();   // id -> string[]
const cacheRelatedGenres = new Map();  // id -> string[]
const cacheSearchArtist = new Map();   // name(lower) -> id

async function getArtistObj(token, id){
  if (cacheArtistObj.has(id)) return cacheArtistObj.get(id);
  const obj = await api(token, `https://api.spotify.com/v1/artists/${id}`);
  cacheArtistObj.set(id, obj);
  cacheArtistGenres.set(id, obj.genres || []);
  return obj;
}
async function resolveArtistIdByName(token, name){
  const key = String(name||"").trim().toLowerCase();
  if (!key) return null;
  if (cacheSearchArtist.has(key)) return cacheSearchArtist.get(key);
  const q = encodeURIComponent(key);
  const json = await api(token, `https://api.spotify.com/v1/search?type=artist&limit=1&market=${MARKET}&q=${q}`);
  const id = json?.artists?.items?.[0]?.id || null;
  if (id) cacheSearchArtist.set(key, id);
  return id;
}

async function searchArtistIdsByTitle(token, title){
  const q = encodeURIComponent(`"${String(title||"").trim()}"`);
  const url = `https://api.spotify.com/v1/search?q=${q}&type=track,album,artist&limit=5&market=${MARKET}`;
  const json = await api(token, url);
  const ids = new Set();
  for (const t of (json.tracks?.items || [])) for (const a of (t.artists||[])) if (a.id) ids.add(a.id);
  for (const al of (json.albums?.items || [])) for (const a of (al.artists||[])) if (a.id) ids.add(a.id);
  for (const ar of (json.artists?.items || [])) if (ar.id) ids.add(ar.id);
  return Array.from(ids);
}


async function getGenresForArtistIds(token, artistIds, nameById){
  const out = new Set();
  const aliveIds = [];
  for (const group of chunk(artistIds, 50)) {
    try {
      const json = await api(token, `https://api.spotify.com/v1/artists?ids=${group.join(",")}`);
      for (const a of (json.artists||[])) {
        if (!a) continue;
        cacheArtistObj.set(a.id, a);
        cacheArtistGenres.set(a.id, a.genres||[]);
        (a.genres||[]).forEach(g=>out.add(g));
        aliveIds.push(a.id);
      }
      await sleep(SLEEP_MS);
    } catch {}
  }
  const missing = artistIds.filter(id => !aliveIds.includes(id));
  for (const id of missing) {
    const name = nameById.get(id) || null;
    try {
      const a = await getArtistObj(token, id);
      (a.genres||[]).forEach(g=>out.add(g));
    } catch {
      if (!name) continue;
      const altId = await resolveArtistIdByName(token, name);
      if (!altId) continue;
      try {
        const a2 = await getArtistObj(token, altId);
        (a2.genres||[]).forEach(g=>out.add(g));
      } catch {}
    }
    await sleep(SLEEP_MS);
  }
  return Array.from(out);
}
async function getRelatedGenres(token, artistIds){
  const out = new Set();
  for (const id of artistIds) {
    if (cacheRelatedGenres.has(id)) {
      for (const g of cacheRelatedGenres.get(id)) out.add(g);
      continue;
    }
    try {
      const json = await api(token, `https://api.spotify.com/v1/artists/${id}/related-artists`);
      const genres = [];
      for (const a of (json.artists||[])) {
        const gs = a.genres || [];
        gs.forEach(x=>{ out.add(x); genres.push(x); });
      }
      cacheRelatedGenres.set(id, genres);
    } catch (e) {
      if (DEBUG) console.log("[related err]", id);
    }
    await sleep(SLEEP_MS);
  }
  return Array.from(out);
}

(async () => {
  const token = await getToken();
  const { data, list } = readWorks();

  const perWorkRefs = list.map(w => ({ w, refs: extractSpotifyRefs(w) }));
  const seenCount = perWorkRefs.reduce((acc, x) => acc + x.refs.length, 0);
  console.log(`[spotify] refs seen=${seenCount}, market=${MARKET}`);

  let updated = 0;

  for (const { w, refs } of perWorkRefs) {
    if (!refs.length) continue;

    try {
      const artistIds = new Set();
      const nameById = new Map();

      for (const ref of refs) {
        if (ref.kind === "album") {
          const got = await collectArtistsFromAlbum(token, ref.id);
          got.artistIds.forEach(id=>artistIds.add(id));
          for (const [id,name] of got.nameById) nameById.set(id,name);
        } else if (ref.kind === "track") {
          const got = await collectArtistsFromTrack(token, ref.id);
          got.artistIds.forEach(id=>artistIds.add(id));
          for (const [id,name] of got.nameById) nameById.set(id,name);
        } else if (ref.kind === "artist") {
          artistIds.add(ref.id);
          // 可能なら即座に名前を取っておく
          try {
            const a = await getArtistObj(token, ref.id);
            if (a?.name) nameById.set(ref.id, a.name);
          } catch {}
        }
        await sleep(SLEEP_MS);
      }

      const idsArr = Array.from(artistIds);
      if (!idsArr.length) continue;

      // (1) 本人 genres
      const genres1 = await getGenresForArtistIds(token, idsArr, nameById);
      if (DEBUG) console.log("[genres1]", w.title, genres1.slice(0,8));
      let seeds = genresToSeeds(genres1);

      // (2) 関連アーティスト genres
      if (!seeds.length) {
        if (DEBUG) console.log("[try-related]", w.title, "artistIds=", idsArr.length);
        const genres2 = await getRelatedGenres(token, idsArr);
        if (DEBUG) console.log("[related genres]", w.title, genres2.slice(0,8));
        seeds = genresToSeeds(genres2);
      }

      // (2.5) まだ空なら：タイトル検索で候補アーティストを拾う
if (!seeds.length) {
  const searchIds = await searchArtistIdsByTitle(token, w.title);
  if (DEBUG) console.log("[searchIds]", w.title, searchIds.slice(0,5));
  if (searchIds.length) {
    // ジャンル再取得 → 種タグ
    const genres3 = await getGenresForArtistIds(token, searchIds, new Map());
    let s3 = genresToSeeds(genres3);
    if (!s3.length) {
      const genres4 = await getRelatedGenres(token, searchIds);
      s3 = genresToSeeds(genres4);
    }
    if (s3.length) seeds = s3;
  }
}


      // (3) なお空ならタイトル/タグ/説明から推測
      if (!seeds.length) {
        const text = [
          String(w.title || ""),
          Array.isArray(w.tags) ? w.tags.join(" ") : "",
          String(w.description || ""),
        ].join(" ").toLowerCase();
        const tSeeds = seedsFromText(text);
        if (tSeeds.length && DEBUG) console.log("[text seeds]", w.title, "->", tSeeds);
        if (tSeeds.length) seeds = tSeeds;
      }

      if (DEBUG) console.log("[seeds]", w.title, seeds);

      if (seeds.length) {
        w.moodSeeds = Array.from(new Set([...(w.moodSeeds||[]), ...seeds]));
        updated++;
      }

      await sleep(SLEEP_MS);
    } catch (e) {
      console.warn("[warn]", w.title, e?.message || e);
      await sleep(SLEEP_MS);
    }
  }

  writeWorks(data, list);
  console.log(`moodSeeds updated: ${updated}`);
})();
