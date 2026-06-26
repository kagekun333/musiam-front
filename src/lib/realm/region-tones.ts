// src/lib/realm/region-tones.ts
// 地方ごとの「背景の気配」。羊皮紙の地は共通のまま、地方の性格に合う色を重ねて世界を描き分ける。
// tint = 紙に重ねる色の気配 / deep = 縁の焼け・陰りの色。atlas/regions.ts の id と対応。

export type RegionTone = { tint: string; deep: string };

export const REGION_TONES: Record<string, RegionTone> = {
  shrine: { tint: "#c2a23f", deep: "#6e561a" }, // 神々の社 — 金の聖性
  highland: { tint: "#c06a34", deep: "#7a3a18" }, // 祝祭の高地 — 篝火の熱
  coast: { tint: "#4f8f97", deep: "#285055" }, // 巡礼の海岸 — 海の碧
  reverie: { tint: "#6b5e8e", deep: "#3a3152" }, // 陶酔の樹海 — 忘我の紫
  dawn: { tint: "#e0a86f", deep: "#9a6a3a" }, // 払暁の岸 — 朝の光
  alley: { tint: "#61738e", deep: "#36435c" }, // 追憶の路地 — 雨の灰青
  citadel: { tint: "#6b6470", deep: "#3a3640" }, // 緊迫の城砦 — 鋼
  market: { tint: "#cda24c", deep: "#836225" }, // 陽だまりの市井 — 陽だまり
  library: { tint: "#8a5e34", deep: "#4e3318" }, // 物語の書架 — 革と古紙
  skyfield: { tint: "#5f8fb6", deep: "#335066" }, // 空撮／映像の高地 — 高空
  frontier: { tint: "#79738a", deep: "#443f52" }, // 未踏の辺境 — 霧
};

export function toneOf(id: string): RegionTone {
  return REGION_TONES[id] || { tint: "#9a8a6a", deep: "#5a4a2e" };
}
