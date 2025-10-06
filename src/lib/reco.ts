// src/lib/reco.ts
/**
 * 作品レコメンドの最小コア（依存ゼロ）
 * - works.json など任意配列を normalize
 * - ランク（英語表記）と日付で安定シード → ランダム抽出
 */

export const RANK_ORDER = [
  "Great Luck",
  "Good Luck",
  "Small Luck",
  "Mixed Luck",
  "Later Luck",
  "Slight Later Luck",
  "Bad Luck",
] as const;
export type RankEn = (typeof RANK_ORDER)[number];

export type WorkItem = {
  id: string;
  title: string;
  type?: string;
  cover?: string;
  href?: string;
  previewUrl?: string;
  tags?: string[];
  mood?: string[];
};

export function rankIndex(rankEn: string): number {
  const i = RANK_ORDER.findIndex(
    (r) => r.toLowerCase() === String(rankEn).toLowerCase(),
  );
  return i >= 0 ? i : 1; // 未知 → "Good Luck" 付近にフォールバック
}

/** 作品配列のゆるい正規化（ページ実装と整合） */
export function normalizeWorks(raw: any[]): WorkItem[] {
  return (raw ?? []).map((w: any, i: number) => {
    const id =
      String(w?.id ?? w?.slug ?? w?.title ?? `w_${i}_${Math.random()}`);
    const title = String(w?.title ?? w?.titleJa ?? w?.titleEn ?? "Untitled");
    let cover: string | undefined;
    if (w?.cover) {
      const c = String(w.cover);
      cover = c.startsWith("http") || c.startsWith("/") ? c : `/${c}`;
    } else if (w?.slug) {
      cover = `/works/covers/${w.slug}.webp`;
    }
    const href = w?.href ?? w?.url ?? w?.link ?? undefined;

    return {
      id,
      title,
      type: w?.type ?? w?.kind ?? "",
      cover,
      href,
      previewUrl: w?.previewUrl,
      tags: Array.isArray(w?.tags) ? w.tags : undefined,
      mood: Array.isArray(w?.mood) ? w.mood : undefined,
    } as WorkItem;
  });
}

/** 文字列→32bit ハッシュ（簡易） */
function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** シード付きシャッフル（Fisher–Yates） */
function shuffleSeeded<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  let s = seed >>> 0;
  const rnd = () => {
    // xorshift32
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 0xffffffff;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickRecommendedWorks(args: {
  rankEn: string;
  works: WorkItem[];
  n?: number;
  allowTypes?: string[]; // e.g. ["music","book"]
}): WorkItem[] {
  const { rankEn, works, n = 6, allowTypes } = args;
  let pool = works.slice();

  if (allowTypes && allowTypes.length > 0) {
    const set = new Set(allowTypes.map((x) => String(x).toLowerCase()));
    pool = pool.filter((w) => (w.type ? set.has(String(w.type).toLowerCase()) : true));
  }

  // 「凶」のときはここでは返さず、呼び出し側で固定推薦を出す前提
  if (String(rankEn).toLowerCase() === "bad luck") return [];

  const today = new Date();
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(today.getDate()).padStart(2, "0")}`;
  const seed = hash32(`${rankEn}|${ymd}`);

  // ランクの重みをうっすら…
  const idx = rankIndex(rankEn);
  // 上位ほど先頭寄りが当たりやすいよう、軽くバイアス
  const biased = pool
    .map((w, i) => ({ w, score: i }))
    .map((x) => ({ w: x.w, score: x.score + idx * 0.1 }));

  const shuffled = shuffleSeeded(
    biased.sort((a, b) => a.score - b.score).map((x) => x.w),
    seed,
  );

  // 重複除去しつつ n 件
  const seen = new Set<string>();
  const picked: WorkItem[] = [];
  for (const w of shuffled) {
    if (seen.has(w.id)) continue;
    seen.add(w.id);
    picked.push(w);
    if (picked.length >= n) break;
  }
  return picked;
}
