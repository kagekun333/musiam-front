// src/components/omikuji/OmikujiCardView.tsx
// ※ Windows の大小文字問題を回避するため、この固有名に統一します
import type { CSSProperties } from "react";

export type RankJa =
  | "大吉"
  | "吉"
  | "小吉"
  | "半吉"
  | "末吉"
  | "末小吉"
  | "凶";

const RANK_STYLE: Record<
  RankJa,
  {
    accent: string; // 枠線色
    paper: string; // 紙色
    patternTint: string; // 麻の葉色
    patternOpacity: number; // 麻の葉濃さ
    patternSize: string; // 麻の葉サイズ
    shadow: string; // 影
    glow?: string; // 大吉の淡い金グロー
  }
> = {
  大吉: {
    accent: "#CFAF4A",
    paper: "#FAF7EB",
    patternTint: "#CFAF4A",
    patternOpacity: 0.18,
    patternSize: "140px",
    shadow: "0 8px 24px rgba(0,0,0,.12)",
    glow: "radial-gradient(60% 50% at 50% 8%, rgba(207,175,74,0.16), transparent 60%)",
  },
  吉: {
    accent: "#6FAF7A",
    paper: "#FBFBF9",
    patternTint: "#6FAF7A",
    patternOpacity: 0.18,
    patternSize: "120px",
    shadow: "0 8px 22px rgba(0,0,0,.10)",
  },
  小吉: {
    accent: "#79A7D1",
    paper: "#FAFCFE",
    patternTint: "#79A7D1",
    patternOpacity: 0.16,
    patternSize: "110px",
    shadow: "0 8px 22px rgba(0,0,0,.10)",
  },
  半吉: {
    accent: "#9AA4B2",
    paper: "#F9F9F9",
    patternTint: "#9AA4B2",
    patternOpacity: 0.16,
    patternSize: "115px",
    shadow: "0 8px 20px rgba(0,0,0,.09)",
  },
  末吉: {
    accent: "#B9A2C8",
    paper: "#FBFAFD",
    patternTint: "#B9A2C8",
    patternOpacity: 0.16,
    patternSize: "130px",
    shadow: "0 8px 20px rgba(0,0,0,.09)",
  },
  末小吉: {
    accent: "#CABBA6",
    paper: "#FCFBF7",
    patternTint: "#CABBA6",
    patternOpacity: 0.16,
    patternSize: "125px",
    shadow: "0 8px 18px rgba(0,0,0,.08)",
  },
  凶: {
    accent: "#A7A7A7",
    paper: "#111111",
    patternTint: "#FFFFFF",
    patternOpacity: 0.10,
    patternSize: "120px",
    shadow: "0 4px 10px rgba(0,0,0,.30)",
  },
};

// 麻の葉SVG（currentColorで着色）
const ASANOHA_DATA_URL = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>
    <defs>
      <pattern id='p' x='0' y='0' width='120' height='120' patternUnits='userSpaceOnUse'>
        <g fill='none' stroke='currentColor' stroke-width='1'>
          <path d='M60 5 85 50 60 95 35 50Z'/>
          <path d='M60 5 98 25 98 70 60 95 22 70 22 25Z' opacity='0.5'/>
          <path d='M60 20 80 50 60 80 40 50Z' opacity='0.7'/>
        </g>
      </pattern>
    </defs>
    <rect width='100%' height='100%' fill='url(%23p)'/>
  </svg>`
)}")`;

// 和紙風テクスチャ
const paperTexture: CSSProperties = {
  backgroundImage:
    `radial-gradient(closest-side, rgba(0,0,0,0.06), rgba(0,0,0,0) 70%),` +
    `radial-gradient(circle at 20% 10%, rgba(0,0,0,0.04), rgba(0,0,0,0) 60%),` +
    `radial-gradient(circle at 80% 30%, rgba(0,0,0,0.03), rgba(0,0,0,0) 55%),` +
    `repeating-linear-gradient(90deg, rgba(0,0,0,0.015), rgba(0,0,0,0.015) 1px, transparent 1px, transparent 3px)`,
};

function OmikujiCard({
  rank,
  header,
  lines,
}: {
  rank: RankJa;
  header: string;
  lines: { orig: string; trans: string }[];
}) {
  const sty = RANK_STYLE[rank];
  const isDark = rank === "凶";
  return (
    <div
      className="relative max-w-[960px] w-full aspect-[16/9] rounded-2xl overflow-hidden border-2"
      style={{ borderColor: sty.accent, backgroundColor: sty.paper, boxShadow: sty.shadow }}
      role="region"
      aria-label="おみくじカード"
    >
      {/* ふちの陰影 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            `radial-gradient(120% 90% at 0% 0%, transparent 60%, rgba(0,0,0,0.06) 100%),` +
            `radial-gradient(120% 90% at 100% 100%, transparent 60%, rgba(0,0,0,0.06) 100%)`,
        }}
      />
      {/* 麻の葉パターン */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ color: sty.patternTint, opacity: sty.patternOpacity, backgroundImage: ASANOHA_DATA_URL, backgroundSize: sty.patternSize }}
      />
      {/* 大吉の金グロー */}
      {sty.glow && <div className="absolute inset-0 pointer-events-none" style={{ background: sty.glow }} />}
      {/* 和紙テクスチャ */}
      <div className="absolute inset-0 pointer-events-none" style={paperTexture} />

      {/* 本文 */}
      <div className={`relative h-full p-5 md:p-6 ${isDark ? "text-neutral-50" : "text-zinc-900"}`}>
        {/* ヘッダー帯 */}
        <div className="flex items-baseline justify-between pb-2.5 border-b" style={{ borderColor: sty.accent }}>
          <h2 className="text-[18px] md:text-[19px] font-semibold tracking-wide [font-feature-settings:'palt']">{header}</h2>
        </div>

        {/* 四句（原文→訳のペア） */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mt-4 md:mt-5">
          {lines.map((ln, i) => (
            <div key={i} className="py-0.5">
              <p className="font-serif text-[15.5px] leading-relaxed mb-1">{ln.orig}</p>
              <p className="text-[14.5px] leading-relaxed opacity-90">{ln.trans}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OmikujiCard;
export { OmikujiCard };

