// src/components/workshop/WorkshopHub.tsx
// 工房ハブ（F3）: 国の中心＝伯爵とAIの錬金工房。物語の芯であり、依頼・学び・対話の起点。
// 「言葉から作品（土地）が生まれる過程＝制作思想」を一望させ、三つの扉へ導く。
// 追加専用・サーバーコンポーネント（軽量）。既存ページは触らず“被せる”。
import Link from "next/link";
import "./workshop-hub.css";

type Door = {
  href: string;
  glyph: string;
  ja: string;
  en: string;
  desc: string;
  cta: string;
  accent: "amber" | "slate";
};

const DOORS: Door[] = [
  {
    href: "/chat",
    glyph: "♔",
    ja: "玉座の間",
    en: "The Throne",
    desc: "伯爵とAIの精に、世界のことを尋ねる。案内も、相談も、ここから。",
    cta: "伯爵と話す",
    accent: "amber",
  },
  {
    href: "/business",
    glyph: "⚒",
    ja: "工房に依頼する",
    en: "Commission the Atelier",
    desc: "あなたのための調べ・紋章・物語を、工房に鍛えさせる。法人・店舗・作品へ。",
    cta: "依頼を相談する",
    accent: "amber",
  },
  {
    href: "/atelier",
    glyph: "✎",
    ja: "弟子入りする",
    en: "Become an Apprentice",
    desc: "月数ドルで350作品を生んだ錬金術を、再現可能な製法として授ける講座。",
    cta: "弟子入りを志願する",
    accent: "slate",
  },
];

export default function WorkshopHub() {
  return (
    <section className="rnv-workshop" aria-label="工房 — 伯爵とAIの錬金の場">
      <div className="rnv-workshop__contours rnv-contours" aria-hidden="true" />

      <header className="rnv-workshop__head">
        <p className="rnv-workshop__kicker rnv-rune">ATELIER · 工房</p>
        <h2 className="rnv-workshop__title rnv-realm-title">国の中心で、世界は鍛えられている</h2>
        <p className="rnv-workshop__lede">
          ここは伯爵と、無数のAIの精が籠もる錬金工房。
          ひとつの言葉が精に渡り、調べとなり、やがて新しい土地（作品）がひらかれる。
          これが「ひとりとAI」の物語であり、すべての依頼と学びの起点です。
        </p>

        <p className="rnv-workshop__process rnv-rune" aria-label="制作の流れ: 言葉から精、そして作品へ">
          <span>言葉</span>
          <i aria-hidden="true">▸</i>
          <span>精（AI）</span>
          <i aria-hidden="true">▸</i>
          <span>調べ</span>
          <i aria-hidden="true">▸</i>
          <span className="rnv-workshop__process-end">作品＝土地</span>
        </p>
      </header>

      <ul className="rnv-workshop__doors" role="list">
        {DOORS.map((d) => (
          <li key={d.href}>
            <Link href={d.href} className="rnv-workshop__door rnv-breathe" data-accent={d.accent}>
              <span className={`rnv-mark ${d.accent === "slate" ? "rnv-mark--new" : ""}`} aria-hidden="true">
                {d.glyph}
              </span>
              <span className="rnv-workshop__door-names">
                <span className="rnv-workshop__door-ja rnv-realm-title">{d.ja}</span>
                <span className="rnv-workshop__door-en rnv-rune">{d.en}</span>
              </span>
              <span className="rnv-workshop__door-desc">{d.desc}</span>
              <span className="rnv-workshop__door-cta">{d.cta} →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
