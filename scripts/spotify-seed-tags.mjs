// scripts/spotify-seed-tags.mjs
import fs from "node:fs/promises";
import path from "node:path";

const CID = process.env.SPOTIFY_CLIENT_ID;
const SEC = process.env.SPOTIFY_CLIENT_SECRET;
const MARKET = process.env.SPOTIFY_MARKET || "JP"; // JP/US/DEなど
if (!CID || !SEC) { console.error("Set SPOTIFY_CLIENT_ID/SECRET"); process.exit(1); }

const WORKS_PATH = path.join(process.cwd(), "public", "works", "works.json");
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

async function getToken() {
  const r = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type":"application/x-www-form-urlencoded",
      "Authorization":"Basic "+Buffer.from(`${CID}:${SEC}`).toString("base64"),
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) throw new Error("spotify token failed: "+r.status);
  return (await r.json()).access_token;
}

function parseSpotifyRef(u="") {
  try {
    const url = new URL(u);
    if (!url.hostname.includes("open.spotify.com")) return null;
    const [type,id] = url.pathname.split("/").filter(Boolean);
    if ((type==="track" || type==="album") && id) return { type, id };
  } catch {}
  return null;
}

async function fetchAlbumTrackIds(token, albumId) {
  let ids = [], next = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50&market=${MARKET}`, pages=0;
  while (next && pages<10) {
    const r = await fetch(next, { headers:{ Authorization:`Bearer ${token}` } });
    if (!r.ok) { console.warn(`[album:${albumId}] tracks ${r.status}`); break; }
    const j = await r.json();
    ids.push(...(j.items||[]).map(t=>t?.id).filter(Boolean));
    next = j.next; pages++; await sleep(120);
  }
  ids = [...new Set(ids)];
  if (!ids.length) console.warn(`[album:${albumId}] no track ids (market=${MARKET})`);
  return ids;
}

async function fetchAudioFeatures(token, ids) {
  let feats = [];
  for (let i=0;i<ids.length;i+=100) {
    const chunk = ids.slice(i,i+100);
    const r = await fetch(`https://api.spotify.com/v1/audio-features?ids=${chunk.join(",")}`, {
      headers:{ Authorization:`Bearer ${token}` }
    });
    if (!r.ok) { console.warn(`features ${r.status}`); continue; }
    const j = await r.json();
    feats.push(...(j.audio_features||[]).filter(x=>x && typeof x==='object'));
    await sleep(120);
  }
  return feats.filter(f=>typeof f.valence==='number' && typeof f.energy==='number' && typeof f.tempo==='number');
}

function avg(arr,k){ return arr.reduce((s,x)=>s+(x[k]||0),0)/arr.length; }

function mapFeaturesToSeeds({ valence, energy, tempo }) {
  const t = [];
  const v = valence ?? 0.5, e = energy ?? 0.5, bpm = tempo ?? 120;
  if (e >= 0.7 && v >= 0.6) t.push("高揚","熱狂");
  if (e >= 0.7 && v <  0.4) t.push("怒り","緊張");
  if (e <  0.4 && v >= 0.6) t.push("優美","多幸感");
  if (e <  0.4 && v <  0.4) t.push("静けさ","哀愁","孤独");
  if (Math.abs(v-0.5) <= 0.12) t.push("ノスタルジー");
  if (bpm >= 140) t.push("高揚");
  if (bpm <= 80)  t.push("静けさ");
  return [...new Set(t)].slice(0,5);
}

async function main() {
  const token = await getToken();
  const raw = await fs.readFile(WORKS_PATH,"utf8");
  const data = JSON.parse(raw);
  const arr = Array.isArray(data) ? data : (data.items||data.works||data.data||[]);

  let updated=0, seenAlbums=0, seenTracks=0;

  for (const w of arr) {
    const url = w.listenURL || w.href || "";
    const ref = parseSpotifyRef(url);
    if (!ref) continue;
    if (Array.isArray(w.moodSeeds) && w.moodSeeds.length) continue;

    if (ref.type === "track") {
      seenTracks++;
      const r = await fetch(`https://api.spotify.com/v1/audio-features/${ref.id}`, {
        headers:{ Authorization:`Bearer ${token}` }
      });
      if (!r.ok) { console.warn(`[track:${ref.id}] ${r.status}`); continue; }
      const f = await r.json();
      const seeds = mapFeaturesToSeeds(f);
      if (seeds.length) { w.moodSeeds = seeds; updated++; console.log(`seeded(track): ${w.title} → ${seeds.join(", ")}`); }
    } else {
      seenAlbums++;
      const ids = await fetchAlbumTrackIds(token, ref.id);
      if (!ids.length) continue;
      const feats = await fetchAudioFeatures(token, ids);
      if (!feats.length) { console.warn(`[album:${ref.id}] features empty`); continue; }
      const mean = { valence: avg(feats,'valence'), energy: avg(feats,'energy'), tempo: avg(feats,'tempo') };
      const seeds = mapFeaturesToSeeds(mean);
      if (seeds.length) { w.moodSeeds = seeds; updated++; console.log(`seeded(album): ${w.title} → ${seeds.join(", ")}`); }
    }
    await sleep(120);
  }

  const out = Array.isArray(data) ? arr : { ...data, items: arr };
  await fs.writeFile(WORKS_PATH, JSON.stringify(out,null,2)+"\n","utf8");
  console.log(`moodSeeds updated: ${updated} (albums seen=${seenAlbums}, tracks seen=${seenTracks}, market=${MARKET})`);
}
main().catch(e=>{ console.error(e); process.exit(1); });
