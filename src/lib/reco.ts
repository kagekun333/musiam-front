import type { OmikujiItem, WorkItem } from "../types/omikuji";
import { seededIndex } from "./hash";

const RANK_TO_MOODS: Record<string, string[]> = {
  "Great Luck": ["uplifting", "bright", "victory", "celebration"],
  "Good Luck": ["hope", "optimistic", "warm"],
  "Small Luck": ["calm", "focus", "everyday"],
  "Mixed Luck": ["reflective", "growth", "turning-point"],
  "Later Luck": ["patience", "journey", "becoming"],
  "Slight Later Luck": ["seed", "gentle", "dawn"],
  "Bad Luck": ["healing", "resilience", "light-in-dark"],
};

// 作品データ（存在しない場合は空配列でも動く）
// 相対 require で optional 読み込み
let WORKS: WorkItem[] = [];
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  WORKS = require("../data/works.json") as WorkItem[];
} catch {
  WORKS = [];
}

function softIncludes(haystack: string[] | undefined, needles: string[]): boolean {
  if (!haystack || haystack.length === 0) return false;
  const lower = haystack.map((t) => t.toLowerCase());
  return needles.some((n) => lower.some((t) => t.includes(n.toLowerCase())));
}

export function recommendWorks(item: OmikujiItem, take = 3, seed = "seed"): WorkItem[] {
  const moods = RANK_TO_MOODS[item.rank_en] || ["calm"];
  const filtered = WORKS.filter(
    (w) => softIncludes(w.moodTags, moods) || softIncludes(w.tags, moods)
  );
  const pool = filtered.length > 0 ? filtered : WORKS; // 該当なしは全体から
  if (pool.length === 0) return [];

  const out: WorkItem[] = [];
  for (let i = 0; i < Math.min(take, pool.length); i++) {
    const idx = seededIndex(`${seed}-${i}`, pool.length);
    out.push(pool[idx]);
  }
  // 重複除去
  return Array.from(new Map(out.map((x) => [x.id, x])).values()).slice(0, take);
}
