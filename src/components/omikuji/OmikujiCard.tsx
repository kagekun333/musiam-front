import React from "react";

/* ===========================
   Types
=========================== */
export type OmikujiLine = { orig: string; ja: string; en: string };
export type OmikujiEntry = {
  id: number;
  rank_ja: string;
  rank_en: string; // e.g., "Great Luck", "Good Luck"
  header_ja: string;
  header_en: string;
  lines: OmikujiLine[]; // 4 lines
};

/* ===========================
   Rank theme (zinc系 / 和風トーン)
=========================== */
const RANK_THEME: Record<
  string,
  { accent: string; patternOpacity: number; baseBg: string; cardShadow: string; isDark?: boolean }
> = {
  "great luck":        { accent: "#D8B65C", patternOpacity: 0.16, baseBg: "bg-zinc-50", cardShadow: "shadow-[0_8px_24px_rgba(0,0,0,0.12)]" },
  "good luck":         { accent: "#6FAF7A", patternOpacity: 0.14, baseBg: "bg-zinc-50", cardShadow: "shadow-[0_8px_24px_rgba(0,0,0,0.12)]" },
  "small luck":        { accent: "#79A7D1", patternOpacity: 0.13, baseBg: "bg-zinc-50", cardShadow: "shadow-[0_8px_24px_rgba(0,0,0,0.12)]" },
  "mixed luck":        { accent: "#9AA4B2", patternOpacity: 0.12, baseBg: "bg-zinc-50", cardShadow: "shadow-[0_8px_24px_rgba(0,0,0,0.12)]" },
  "later luck":        { accent: "#B9A2C8", patternOpacity: 0.12, baseBg: "bg-zinc-50", cardShadow: "shadow-[0_8px_24px_rgba(0,0,0,0.12)]" },
  "slight later luck": { accent: "#CABBA6", patternOpacity: 0.11, baseBg: "bg-zinc-50", cardShadow: "shadow-[0_8px_24px_rgba(0,0,0,0.12)]" },
  "bad luck":          { accent: "#A7A7A7", patternOpacity: 0.10, baseBg: "bg-zinc-900", cardShadow: "shadow-[0_4px_16px_rgba(0,0,0,0.22)]", isDark: true },
};

/* ===========================
   Card Component
=========================== */
export default function OmikujiCard({
  entry,
  lang = "ja",
  className = "",
}: {
  entry: OmikujiEntry;
  lang?: "ja" | "en";
  className?: string; // PNG書き出し時の固定サイズ指定に使える
}) {
  const norm = entry.rank_en.toLowerCase();
  const theme = RANK_THEME[norm] ?? RANK_THEME["good luck"];

  // ヘッダー：ENは "No. {id} — {rank_en}"（サブタイトル無し）
  const headerText = lang === "ja" ? entry.header_ja : `No. ${entry.id} — ${entry.rank_en}`;

  return (
    <article
      data-omikuji-card
      className={[
        "relative min-h-[420px] w-full overflow-hidden rounded-2xl",
        theme.baseBg,
        theme.cardShadow,
        theme.isDark ? "text-zinc-100" : "text-zinc-900",
        className,
      ].join(" ")}
      style={{
        // CSS variables for theming
        // @ts-ignore
        "--accent": theme.accent,
        // @ts-ignore
        "--pattern-color": theme.isDark ? "#ddd" : "#777",
        // 麻の葉の濃さ（ライト 0.24 / ダーク 0.20）
        // @ts-ignore
        "--pattern-opacity": theme.isDark ? "0.20" : "0.24",
      }}
    >
      {/* 背景（和紙グラデ） */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.82),rgba(0,0,0,0)_58%),radial-gradient(ellipse_at_bottom_right,rgba(0,0,0,0.05),rgba(0,0,0,0)_60%)]" />

      {/* 麻の葉（縁リングのみ表示：globals.css の .asanoha-edge がマスク処理） */}
      <div className="asanoha-edge absolute inset-0" />

      {/* 紙ノイズ（質感） */}
      <div className="paper-noise absolute inset-0" />

      {/* 外枠アクセント：ringではなくborderで確実に色を通す */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl border-[1.5px]"
        style={{ borderColor: "var(--accent)" as any }}
      />

      {/* 内側の薄い白ライン＆ごく薄い内側シャドウ */}
      <div className="pointer-events-none absolute inset-[4px] rounded-xl border border-white/60" />
      <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_1px_8px_rgba(0,0,0,0.05)]" />

      {/* Content */}
      <div className="relative z-10 mx-auto flex h-full w-[min(92%,880px)] flex-col p-8">
        {/* Header */}
        <header className="mb-4">
          <h2 className="font-serif text-[clamp(22px,2.8vw,26px)] font-semibold tracking-[0.02em]">
            {headerText}
          </h2>

          {/* 見出し帯：ランク色の直指定（環境差を避ける） */}
          <div
            className="-mx-8 mt-3 h-[2px] w-[calc(100%+4rem)] rounded-[2px]"
            style={{
              background:
                "linear-gradient(90deg, rgba(0,0,0,0) 0%, var(--accent) 10%, var(--accent) 90%, rgba(0,0,0,0) 100%)",
              opacity: 0.95,
            }}
          />
        </header>

        {/* Body: 4 pairs */}
        <main className="grid flex-1 grid-rows-4 gap-y-6">
          {entry.lines.slice(0, 4).map((ln, i) => (
            <div key={i} className="[&_p]:leading-snug">
              <p className="font-serif text-[clamp(18px,2.4vw,23px)] font-semibold tracking-[0.01em]">
                {ln.orig}
              </p>
              <p className="mt-1 font-sans text-[clamp(16px,2.05vw,20px)] leading-[1.7]">
                {lang === "ja" ? ln.ja : ln.en}
              </p>
            </div>
          ))}
        </main>
      </div>
    </article>
  );
}
