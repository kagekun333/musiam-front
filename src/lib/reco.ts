// src/lib/reco.ts
/**
 * 作品レコメンドの最小コア
 * - loadWorks からの Work 型を使用
 * - ランク（英語/日本語）と日付で安定シード → ランダム抽出
 * - moodTags ベースのスコアリング推薦
 */

import type { Work } from "./loadWorks";

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

// 日本語ランク対応
export const RANK_JA_TO_EN: Record<string, RankEn> = {
  "大吉": "Great Luck",
  "吉": "Good Luck",
  "小吉": "Small Luck",
  "半吉": "Mixed Luck",
  "末吉": "Later Luck",
  "末小吉": "Slight Later Luck",
  "凶": "Bad Luck",
};

// ランク → ムードタグのマッピング
export const RANK_TO_MOOD_TAGS: Record<RankEn, string[]> = {
  "Great Luck": ["uplifting", "bright", "energetic", "hopeful", "positive"],
  "Good Luck": ["hopeful", "positive", "calm", "peaceful", "gentle"],
  "Small Luck": ["calm", "peaceful", "gentle", "reflective", "serene"],
  "Mixed Luck": ["reflective", "thoughtful", "contemplative", "balanced"],
  "Later Luck": ["contemplative", "patient", "introspective", "quiet"],
  "Slight Later Luck": ["introspective", "quiet", "subdued", "soft"],
  "Bad Luck": ["melancholic", "introspective", "dark", "somber", "deep"],
};

// 後方互換のため、WorkItem エイリアスを残す
export type WorkItem = Work;

export function rankIndex(rankEn: string): number {
  const i = RANK_ORDER.findIndex(
    (r) => r.toLowerCase() === String(rankEn).toLowerCase(),
  );
  return i >= 0 ? i : 1; // 未知 → "Good Luck" 付近にフォールバック
}

/**
 * ランク文字列を正規化（日本語→英語変換）
 */
export function normalizeRank(rank: string): RankEn {
  // 日本語の場合は英語に変換
  const enRank = RANK_JA_TO_EN[rank];
  if (enRank) return enRank;

  // 英語の場合はそのまま
  const normalized = String(rank).trim();
  const found = RANK_ORDER.find(
    (r) => r.toLowerCase() === normalized.toLowerCase()
  );
  return found ?? "Good Luck"; // デフォルト
}

/**
 * 作品配列の正規化（後方互換）
 * loadWorks() がすでに正規化しているため、基本的には通過
 */
export function normalizeWorks(raw: Work[] | any[]): Work[] {
  // すでに Work 型の場合はそのまま返す
  if (raw.length === 0) return [];
  const first = raw[0];
  if (first && typeof first === "object" && "stableKey" in first) {
    return raw as Work[];
  }

  // 旧形式の場合は簡易変換（互換性のため）
  return (raw ?? []).map((w: any, i: number) => ({
    id: String(w?.id ?? `work_${i}`),
    stableKey: String(w?.stableKey ?? w?.id ?? `work_${i}`),
    title: String(w?.title ?? "Untitled"),
    type: (w?.type ?? "article") as Work["type"],
    cover: String(w?.cover ?? ""),
    tags: Array.isArray(w?.tags) ? w.tags : [],
    releasedAt: String(w?.releasedAt ?? ""),
    href: w?.href,
    primaryHref: w?.primaryHref ?? w?.href,
    salesHref: w?.salesHref,
    links: w?.links ?? {},
    moodTags: w?.moodTags,
    moodTagsInferred: w?.moodTagsInferred,
    moodSeeds: w?.moodSeeds,
  })) as Work[];
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
  works: Work[];
  n?: number;
  allowTypes?: string[]; // e.g. ["music","book"]
}): Work[] {
  const { works, n = 6, allowTypes } = args;
  const rankEn = normalizeRank(args.rankEn);
  let pool = works.slice();

  // タイプフィルタ
  if (allowTypes && allowTypes.length > 0) {
    const set = new Set(allowTypes.map((x) => String(x).toLowerCase()));
    pool = pool.filter((w) => (w.type ? set.has(String(w.type).toLowerCase()) : true));
  }

  // 「凶」のときはここでは返さず、呼び出し側で固定推薦を出す前提
  if (rankEn === "Bad Luck") return [];

  // ランク → ムードタグ取得
  const targetMoods = RANK_TO_MOOD_TAGS[rankEn] ?? [];
  const moodSet = new Set(targetMoods.map((m) => m.toLowerCase()));

  // moodTags ベースのスコアリング
  const scored = pool.map((w, i) => {
    // 作品のムードタグを収集
    const workMoods = [
      ...(w.moodTags ?? []),
      ...(w.moodTagsInferred ?? []),
      ...(w.moodSeeds ?? []),
      ...(w.tags ?? []),
    ]
      .map((t) => String(t).toLowerCase().trim())
      .filter(Boolean);

    // マッチ数を計算
    let moodScore = 0;
    for (const m of workMoods) {
      if (moodSet.has(m)) moodScore += 10;
      // 部分一致もスコア
      for (const target of targetMoods) {
        if (m.includes(target.toLowerCase()) || target.toLowerCase().includes(m)) {
          moodScore += 3;
        }
      }
    }

    // ランクバイアス（上位ほど若干有利）
    const rankBias = rankIndex(rankEn) * 0.1;

    return { w, score: moodScore + rankBias, originalIndex: i };
  });

  // スコア順にソート（同点の場合は元の順序維持）
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.originalIndex - b.originalIndex;
  });

  // 日付ベースのシード
  const today = new Date();
  const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(today.getDate()).padStart(2, "0")}`;
  const seed = hash32(`${rankEn}|${ymd}`);

  // 上位候補をシャッフル（多様性確保）
  const topCandidates = scored.slice(0, Math.min(scored.length, n * 3));
  const shuffled = shuffleSeeded(
    topCandidates.map((x) => x.w),
    seed
  );

  // 重複除去しつつ n 件（stableKey で判定）
  const seen = new Set<string>();
  const picked: Work[] = [];
  for (const w of shuffled) {
    const key = w.stableKey ?? w.id;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(w);
    if (picked.length >= n) break;
  }

  // 足りない場合は残りから補充
  if (picked.length < n) {
    for (const { w } of scored) {
      const key = w.stableKey ?? w.id;
      if (seen.has(key)) continue;
      seen.add(key);
      picked.push(w);
      if (picked.length >= n) break;
    }
  }

  return picked;
}
// ==== chat向けのムードベース推薦API ====

export type RecoWork = {
  id: string;
  title: string;
  score: number;
  type?: string;
  cover?: string;
  link?: string | { url: string };
  primaryHref?: string;  // 🆕 優先リンク
  salesHref?: string;    // 🆕 購入リンク
  stableKey?: string;    // 🆕 安定キー
};

// 安定乱数
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * ムードタグベースのスコアリング推薦（chat-reco 用）
 * - catalog: Work[] 配列
 * - moodTags: ユーザー発話から抽出されたキーワード
 * - n/seed: デフォルトあり（seed で安定）
 */
export function recommend(
  catalog: Work[],
  moodTags: string[],
  n = 12,
  seed = Date.now()
): RecoWork[] {
  const tagSet = new Set((moodTags || []).map((s) => String(s).toLowerCase().trim()).filter(Boolean));
  const rand = mulberry32(seed || 1);

  const scored = (catalog || []).map((w) => {
    // 作品側のタグ候補を統合（moodTags 優先）
    const merged = [
      ...(w.moodTags || []),
      ...(w.moodTagsInferred || []),
      ...(w.moodSeeds || []),
      ...(w.tags || []),
    ]
      .map((s) => String(s || "").toLowerCase().trim())
      .filter(Boolean);

    const wTags = new Set(merged);
    let overlap = 0;
    let partialMatch = 0;

    // 完全一致スコア
    if (tagSet.size && wTags.size) {
      for (const t of tagSet) {
        if (wTags.has(t)) {
          overlap++;
        } else {
          // 部分一致スコア
          for (const wt of wTags) {
            if (wt.includes(t) || t.includes(wt)) {
              partialMatch++;
              break;
            }
          }
        }
      }
    }

    // 書籍/音楽に軽いバイアス
    let typeBias = 0;
    if (w.type === "book") typeBias = 0.3;
    else if (w.type === "music") typeBias = 0.2;

    const score = overlap * 10 + partialMatch * 3 + typeBias + rand() * 0.5;

    return {
      id: w.id,
      stableKey: w.stableKey ?? w.id,
      title: w.title,
      type: w.type,
      cover: w.cover,
      link: w.primaryHref || w.href || undefined,
      primaryHref: w.primaryHref,
      salesHref: w.salesHref,
      score,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(0, n));
}

/** 旧コード互換（recommendWorks を参照しているページ用の受け皿） */
export function recommendWorks(
  catalog: Work[],
  moodTags: string[],
  n = 12,
  seed = Date.now()
): RecoWork[] {
  return recommend(catalog, moodTags, n, seed);
}
