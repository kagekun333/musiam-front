// src/lib/design/tokens.ts
// リノベ v1 デザイントークン (F0) — TSX から型安全に参照するためのミラー。
// 値の正本は src/styles/renovation-tokens.css。ここはコンポーネントでの利用と
// 「地方(territory)」生成などロジック側の共通定数を提供する。
// globals.css / 既存トークンには触れない（追加専用）。

/** 特異色: 灰青(slate) + 琥珀(amber)。 */
export const palette = {
  slate: {
    50: "#e7edf5",
    100: "#c7d4e4",
    200: "#9fb3cd",
    300: "#7c96b8", // 標準アクセント（精=AI 層）
    400: "#5b7398",
    500: "#41577a",
    600: "#2e4060",
    700: "#1f2d46",
    ink: "#0b1422",
  },
  amber: {
    100: "#f6e4bd",
    200: "#ecca8a",
    300: "#e0b35e", // 標準アクセント（伯爵=人 層）
    400: "#d09a3e",
    500: "#b07c2a",
  },
  bg: {
    void: "#070e18", // globals.css と同一
    realm: "#0b1422",
  },
  text: {
    base: "#e6ebf3",
    soft: "#b9c4d6",
    muted: "#8290a8",
  },
} as const;

/** 二層視覚: 伯爵=人(sovereign) / 精=AI(spirit)。 */
export const layers = {
  sovereign: {
    font: "var(--rnv-font-sovereign)",
    accent: palette.amber[300],
    line: "var(--rnv-line-hair)",
    glow: "var(--rnv-glow-amber)",
  },
  spirit: {
    font: "var(--rnv-font-spirit)",
    accent: palette.slate[300],
    line: "var(--rnv-line-grid)",
    glow: "var(--rnv-glow-slate)",
  },
} as const;

/** カートグラフィ（記号アイコン + 等高線）。 */
export const cartography = {
  contour: "var(--rnv-map-contour)",
  contourLit: "var(--rnv-map-contour-lit)",
  symbol: palette.amber[300], // 名所 = 代表作
  symbolNew: palette.slate[200], // 最近ひらかれた土地 = 新着
  territory: "var(--rnv-map-territory)",
  route: "var(--rnv-map-route)",
} as const;

/** CSS変数名（インラインstyleで参照する際の補助）。 */
export const cssVar = {
  slate300: "var(--rnv-slate-300)",
  amber300: "var(--rnv-amber-300)",
  bgRealm: "var(--rnv-bg-realm)",
  panel: "var(--rnv-bg-panel)",
  text: "var(--rnv-text)",
  textSoft: "var(--rnv-text-soft)",
  lineHair: "var(--rnv-line-hair)",
  lineGrid: "var(--rnv-line-grid)",
} as const;

export const motion = {
  ease: "cubic-bezier(0.22, 0.61, 0.36, 1)",
  fast: "160ms",
  base: "280ms",
  slow: "520ms",
} as const;

export type DesignLayer = keyof typeof layers;
