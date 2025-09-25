// src/lib/recommender.ts
import fs from "node:fs";
import path from "node:path";

export type LinkObj = { spotify?: string; amazon?: string; url?: string };
export type Work = {
  title: string;
  type?: string;
  cover?: string;
  link?: string | LinkObj;
  tags?: string[];
  moodTags?: string[];
  moodSeeds?: string[];
  description?: string;
};

export type RecoWork = Pick<Work, "title"|"type"|"cover"|"link">;

export function loadAllWorks(): Work[] {
  const p = path.resolve("public/works/works.json");
  const raw = fs.readFileSync(p, "utf8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : (data.items || data.data || data.works || []);
}

// 簡易スコア：moodTags一致を最優先→moodSeeds→tags。タイブレークはシード付き乱択。
export function recommend(works: Work[], target: string[], k = 3, seed = 1234): RecoWork[] {
  const tgt = new Set((target || []).map((s) => String(s)));
  const rng = mulberry32(seed);

  const scored = works.map((w) => {
    const mt = new Set((w.moodTags || []).map(String));
    const ms = new Set((w.moodSeeds || []).map(String));
    const tg = new Set((w.tags || []).map(String));

    const hitMT = countIntersect(mt, tgt);
    const hitMS = countIntersect(ms, tgt);
    const hitTG = countIntersect(tg, tgt);

    // 重みはMT>MS>tags
    const score = hitMT * 3 + hitMS * 2 + hitTG * 1 + rng() * 0.001;
    return { w, score, hitMT, hitMS, hitTG };
  });

  scored.sort((a, b) => b.score - a.score);

  const out: RecoWork[] = [];
  const seen = new Set<string>();
  for (const s of scored) {
    const key = s.w.title;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ title: s.w.title, type: s.w.type, cover: s.w.cover, link: s.w.link });
    if (out.length >= k) break;
  }
  return out;
}

function countIntersect(a: Set<string>, b: Set<string>) {
  let c = 0;
  for (const x of a) if (b.has(x)) c++;
  return c;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
