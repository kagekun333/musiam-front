import type { Reading } from "./reading";
import type { Work } from "./types";

export type ReasonInput = {
  reading: Reading;
  work: Work;
  matches: string[];
  freshnessRank: number;
  weight?: number;
};

function themeLead(theme: Reading["theme"], mood: Reading["mood"]): string {
  const leadByTheme = {
    rest:    "今日は休めのサイン。呼吸の幅を広げる音が要ります。",
    focus:   "今日は思考の輪郭がクリア。ノイズの少ない流れへ。",
    ignite:  "今日は火種がある。歩幅を半歩だけ大きく。",
    reflect: "今日は内省に光が当たる。静かな反射を。",
  } as const;
  if (theme === "reflect" && mood === "night") return "夜は内側の光がよく見える。静かな反射を。";
  if (theme === "focus" && mood === "morning") return "朝の輪郭はくっきり。無駄の無い流れへ。";
  return leadByTheme[theme];
}

function secondSentence(matches: string[], freshnessRank: number, weight?: number): string {
  const bestTag = matches[0];
  if (bestTag) return `〈${bestTag}〉の要素が強いこの作品は、今のあなたに噛み合います。`;
  if (freshnessRank <= 3) return "最新作。新しい温度を、そのままあなたの今日へ。";
  if (weight && weight >= 8) return "よく選ばれている一本。普遍的な推進力が、今の気分を支えます。";
  return "余白のある鳴り方が、今日のコンディションに寄り添います。";
}

export function buildReason(input: ReasonInput): string {
  const a = themeLead(input.reading.theme, input.reading.mood);
  const b = secondSentence(input.matches ?? [], input.freshnessRank ?? 99, input.weight);
  return `${a} ${b}`;
}
