// src/components/HomeShowcase.tsx
// ホーム下部: 実績数字 + 法人導線 + 展示導線。page.tsx へ1行挿入で使う。
import Link from "next/link";
import "./home-showcase.css";

const STATS = [
  { num: "350", label: "公開作品" },
  { num: "216", label: "楽曲" },
  { num: "134", label: "書籍" },
];

export default function HomeShowcase() {
  return (
    <section className="showcase" aria-label="伯爵の工房">
      <div className="showcase-inner">
        <h2 className="showcase-title">伯爵の工房</h2>
        <p className="showcase-lead">
          この館の音楽も物語も、すべて当工房の自作。
          <br />
          その制作力を、あなたのために使えます。
        </p>

        <div className="showcase-stats">
          {STATS.map((s) => (
            <div key={s.label} className="showcase-stat">
              <span className="showcase-stat-num">{s.num}</span>
              <span className="showcase-stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="showcase-ctas">
          <Link href="/works" className="showcase-btn showcase-btn--ghost">
            作品を聴く・読む
          </Link>
          <Link href="/business" className="showcase-btn showcase-btn--gold">
            楽曲制作を依頼する
          </Link>
        </div>
      </div>
    </section>
  );
}
