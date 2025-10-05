import type { Work } from "./types";

export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// タグ一致 > 新しさ > 重み
export function scoreOf(w: Work, want: string[]) {
  const tagHit = want.filter((t) => w.tags?.includes(t)).length;
  const days = Math.max(1, (Date.now() - new Date(w.releasedAt).getTime()) / 86400000);
  const fresh = 1 / days; // 新しいほど高い
  const weight = (w.weight ?? 0) / 10;
  return tagHit * 10 + fresh + weight;
}

export function pickTopN(
  all: Work[],
  want: string[],
  n: number,
  seed: number,
  avoidIds?: Set<string>
) {
  const rnd = mulberry32(seed);
  const filtered = avoidIds ? all.filter((w) => !avoidIds.has(w.id)) : all.slice();
  const scored = filtered.map((w) => ({ w, s: scoreOf(w, want), r: rnd() }));
  scored.sort((a, b) => b.s - a.s || a.r - b.r);
  return scored.slice(0, n).map((x) => x.w);
}
