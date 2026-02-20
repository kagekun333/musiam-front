import React from "react";

/* ===========================
   Types
=========================== */
export type OmikujiLine = { orig: string; ja: string; en: string };
export type OmikujiEntry = {
  id: number;
  rank_ja: string;
  rank_en: string;
  header_ja: string;
  header_en: string;
  lines: OmikujiLine[]; // 4 lines
};

/* ===========================
   Rank themes（完全自己完結）
=========================== */
type RankTheme = {
  accent: string;
  paper: string;
  patternColor: string;
  patternOpacity: number;
  patternSize: number;
  glow?: string;
  isDark: boolean;
};

const RANK_THEME: Record<string, RankTheme> = {
  "great luck": {
    accent: "#CFAF4A",
    paper: "#FAF7EB",
    patternColor: "#CFAF4A",
    patternOpacity: 0.20,
    patternSize: 140,
    glow: "radial-gradient(60% 50% at 50% 8%, rgba(207,175,74,0.18), transparent 60%)",
    isDark: false,
  },
  "good luck": {
    accent: "#6FAF7A",
    paper: "#FBFBF9",
    patternColor: "#6FAF7A",
    patternOpacity: 0.17,
    patternSize: 120,
    isDark: false,
  },
  "small luck": {
    accent: "#79A7D1",
    paper: "#FAFCFE",
    patternColor: "#79A7D1",
    patternOpacity: 0.16,
    patternSize: 110,
    isDark: false,
  },
  "mixed luck": {
    accent: "#9AA4B2",
    paper: "#F9F9F9",
    patternColor: "#9AA4B2",
    patternOpacity: 0.16,
    patternSize: 115,
    isDark: false,
  },
  "later luck": {
    accent: "#B9A2C8",
    paper: "#FBFAFD",
    patternColor: "#B9A2C8",
    patternOpacity: 0.16,
    patternSize: 130,
    isDark: false,
  },
  "slight later luck": {
    accent: "#CABBA6",
    paper: "#FCFBF7",
    patternColor: "#CABBA6",
    patternOpacity: 0.16,
    patternSize: 125,
    isDark: false,
  },
  "bad luck": {
    accent: "#A7A7A7",
    paper: "#111111",
    patternColor: "#FFFFFF",
    patternOpacity: 0.11,
    patternSize: 120,
    isDark: true,
  },
};

/* ===========================
   麻の葉SVG（色を直接埋め込む＝currentColor依存ゼロ）
=========================== */
function makeAsanohaUrl(color: string, size: number): string {
  const encoded = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 120 120'>
      <defs>
        <pattern id='p' x='0' y='0' width='120' height='120' patternUnits='userSpaceOnUse'>
          <g fill='none' stroke='${color}' stroke-width='1'>
            <path d='M60 5 85 50 60 95 35 50Z'/>
            <path d='M60 5 98 25 98 70 60 95 22 70 22 25Z' opacity='0.5'/>
            <path d='M60 20 80 50 60 80 40 50Z' opacity='0.7'/>
          </g>
        </pattern>
      </defs>
      <rect width='100%' height='100%' fill='url(%23p)'/>
    </svg>`
  );
  return `url("data:image/svg+xml;utf8,${encoded}")`;
}

/* ===========================
   和紙テクスチャ（inline gradient）
=========================== */
const PAPER_TEXTURE =
  `radial-gradient(closest-side, rgba(0,0,0,0.05), rgba(0,0,0,0) 70%),` +
  `radial-gradient(circle at 20% 10%, rgba(0,0,0,0.03), rgba(0,0,0,0) 60%),` +
  `radial-gradient(circle at 80% 30%, rgba(0,0,0,0.025), rgba(0,0,0,0) 55%),` +
  `repeating-linear-gradient(90deg, rgba(0,0,0,0.012), rgba(0,0,0,0.012) 1px, transparent 1px, transparent 3px)`;

/* ===========================
   Card Component
=========================== */
export default function OmikujiCard({
  entry,
  lang = "ja",
}: {
  entry: OmikujiEntry;
  lang?: "ja" | "en";
  className?: string;
}) {
  const norm = entry.rank_en.toLowerCase();
  const t = RANK_THEME[norm] ?? RANK_THEME["good luck"];

  const header = lang === "ja" ? entry.header_ja : `No. ${entry.id} — ${entry.rank_en}`;
  const textColor = t.isDark ? "#f0f0f0" : "#1a1a1a";
  const asanohaUrl = makeAsanohaUrl(t.patternColor, t.patternSize);

  return (
    <article
      className="relative w-full max-w-[720px] mx-auto overflow-hidden rounded-2xl shadow-xl"
      style={{
        aspectRatio: "1200 / 630",
        backgroundColor: t.paper,
        border: `1.5px solid ${t.accent}`,
        color: textColor,
      }}
    >
      {/* 麻の葉パターン（色直接埋め込み） */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: asanohaUrl,
          backgroundSize: `${t.patternSize}px ${t.patternSize}px`,
          opacity: t.patternOpacity,
        }}
      />

      {/* 和紙テクスチャ */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: PAPER_TEXTURE,
        }}
      />

      {/* ふちの陰影 */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            `radial-gradient(120% 90% at 0% 0%, transparent 60%, rgba(0,0,0,0.06) 100%),` +
            `radial-gradient(120% 90% at 100% 100%, transparent 60%, rgba(0,0,0,0.06) 100%)`,
        }}
      />

      {/* 大吉：金グロー */}
      {t.glow && (
        <div aria-hidden style={{ position: "absolute", inset: 0, background: t.glow }} />
      )}

      {/* 内側の薄い白ライン */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 4,
          borderRadius: "0.7rem",
          border: t.isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.60)",
          pointerEvents: "none",
        }}
      />

      {/* === 本文 === */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "4.5% 5.5%",
          boxSizing: "border-box",
        }}
      >
        {/* ヘッダー */}
        <div style={{ marginBottom: "3%" }}>
          <h2
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "clamp(13px, 2.3vw, 20px)",
              fontWeight: 600,
              letterSpacing: "0.03em",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            {header}
          </h2>
          {/* アクセント区切り線 */}
          <div
            style={{
              marginTop: "2.5%",
              height: 2,
              borderRadius: 2,
              background: `linear-gradient(90deg, transparent 0%, ${t.accent} 8%, ${t.accent} 92%, transparent 100%)`,
              opacity: 0.95,
            }}
          />
        </div>

        {/* 本文：2列×2行グリッド */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: "3% 6%",
            minHeight: 0,
          }}
        >
          {entry.lines.slice(0, 4).map((ln, i) => (
            <div
              key={i}
              style={{
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
            >
              {/* 原文 */}
              <p
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "clamp(11px, 1.85vw, 17px)",
                  fontWeight: 600,
                  lineHeight: 1.45,
                  margin: 0,
                  marginBottom: "6%",
                  letterSpacing: "0.01em",
                }}
              >
                {ln.orig}
              </p>
              {/* 訳文 */}
              <p
                style={{
                  fontFamily: "system-ui, sans-serif",
                  fontSize: "clamp(10px, 1.6vw, 15px)",
                  lineHeight: 1.65,
                  margin: 0,
                  opacity: t.isDark ? 0.82 : 0.78,
                }}
              >
                {lang === "ja" ? ln.ja : ln.en}
              </p>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
