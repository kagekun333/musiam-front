// src/lib/recommender.ts
import type { Work } from "./loadWorks";

const daySeed = () => {
  const d = new Date();
  // 例: 20250913 + visitCount（visitCountは呼び出し元で足し込む想定）
  return Number(`${d.getFullYear()}${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}${d.getDate().toString().padStart(2, "0")}`);
};

const rng = (seed: number) => {
  let s = seed | 0;
  return () => ((s = (s * 1664525 + 1013904223) | 0), (s >>> 0) / 4294967296);
};

export function scoreWork(w: Work, want: string[], seed = daySeed()) {
  const now = Date.now();
  const days = Math.max(
    1,
    (now - new Date(w.releasedAt).getTime()) / 86_400_000
  );
  const tagHit = want.reduce((a, t) => a + (w.tags?.includes(t) ? 1 : 0), 0);
  const recency = 1 / Math.sqrt(days); // 新しいほど高得点
  const weight = w.weight ?? 1.0;
  const rand = rng(seed + (w.id?.length ?? 0))();
  // 重みは Spec で指定した係数
  return tagHit * 1.2 + recency * 0.8 + weight * 0.6 + rand * 0.2;
}

export function recommend(
  all: Work[],
  want: string[],
  k = 3,
  seed = daySeed()
): Work[] {
  return [...all]
    .sort((a, b) => scoreWork(b, want, seed) - scoreWork(a, want, seed))
    .slice(0, k);
}

/** 簡易タグ抽出（Count用のプレースホルダ。英数字・#のみ） */
export function extractTags(input: string): string[] {
  const words = (input || "")
    .toLowerCase()
    .split(/[^a-z0-9#]+/i)
    .filter(Boolean);
  // 重複排除＆短すぎる語は除外
  const uniq = Array.from(new Set(words)).filter((w) => w.length >= 2);
  return uniq.slice(0, 8);
}
