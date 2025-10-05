// NEW: src/features/oracle/omikuji-engine.ts
export type FortuneRank = "大吉"|"中吉"|"小吉"|"吉"|"末吉"|"凶";
export type OmikujiTopic =
  | "総運"|"願事"|"待人"|"旅立"|"商売"|"学問"|"恋愛"|"縁談"
  | "金運"|"仕事"|"病気"|"出産"|"失物"|"転居"|"争事"|"相場";

export type OmikujiItems = Partial<Record<OmikujiTopic, string>>;

export type OmikujiResult = {
  number: number;              // 第◯番
  rank: FortuneRank;           // 吉凶
  items: OmikujiItems;         // 項目本文（自作文面）
  mainTopic: OmikujiTopic;     // 推薦タグの主軸
};

export const DEFAULT_FORTUNE_DIST: Record<FortuneRank, number> = {
  大吉: 0.07, 中吉: 0.14, 小吉: 0.19, 吉: 0.18, 末吉: 0.12, 凶: 0.30 * 0.4, // 凶全体30%想定のうち最初は控えめ
};
// 凶を増やしたい場合は後で "小凶/半凶/末凶/大凶" を拡張する設計。まずは6段で運用。

export const OMIKUJI_RANGE = { min: 1, max: 100 };

function mulberry32(seed: number) { // 軽量乱数（日替わり再現用）
  return function() {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function dateSeed(isoYmd: string, clientId = "anon"): number {
  // 例: "2025-09-26" + clientId → 安定seed
  let s = 0;
  const str = isoYmd + "|" + clientId;
  for (let i = 0; i < str.length; i++) s = ((s << 5) - s) + str.charCodeAt(i) | 0;
  return s >>> 0;
}

export function pickRank(rand: () => number): FortuneRank {
  const entries = Object.entries(DEFAULT_FORTUNE_DIST) as [FortuneRank, number][];
  const sum = entries.reduce((a, [,v]) => a + v, 0);
  let r = rand() * sum;
  for (const [rank, p] of entries) { if ((r -= p) <= 0) return rank; }
  return "吉";
}

export function pickMainTopic(rand: () => number): OmikujiTopic {
  const topics: OmikujiTopic[] = ["仕事","金運","恋愛","学問","旅立","商売","総運","縁談","病気","出産","失物","転居","争事","相場"];
  return topics[Math.floor(rand() * topics.length)];
}

export function drawOmikuji(seed: number, ymd: string, getText: (rank: FortuneRank) => OmikujiItems): OmikujiResult {
  const rnd = mulberry32(seed);
  const number = Math.floor(rnd() * (OMIKUJI_RANGE.max - OMIKUJI_RANGE.min + 1)) + OMIKUJI_RANGE.min;
  const rank = pickRank(rnd);
  const mainTopic = pickMainTopic(rnd);
  const items = getText(rank); // 外部の文面辞書から取得（自作）
  return { number, rank, items, mainTopic };
}

// 推薦タグ：主項目→推奨タグ（例）
export function topicToTags(topic: OmikujiTopic): string[] {
  switch (topic) {
    case "仕事": return ["focus","productivity"];
    case "金運": return ["finance","discipline"];
    case "恋愛": return ["love","heart"];
    case "学問": return ["study","patience"];
    case "旅立": return ["journey","openness"];
    case "商売": return ["commerce","steady"];
    case "総運": return ["balance","harmony"];
    case "縁談": return ["bond","timing"];
    case "病気": return ["health","care"];
    case "出産": return ["family","calm"];
    case "失物": return ["order","trace"];
    case "転居": return ["move","cleanse"];
    case "争事": return ["peace","prudence"];
    case "相場": return ["market","risk"];
    default: return ["harmony"];
  }
}
