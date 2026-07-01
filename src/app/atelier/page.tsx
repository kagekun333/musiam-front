// src/app/atelier/page.tsx — 講座「AI音楽工場の作り方」先行販売LP
// 戦略: 作る前に売る(需要検証)。興味登録の件数で講座制作のGo/NoGoを判断する。
import type { Metadata } from "next";
import LeadForm from "@/components/cta/LeadForm";
import ParchmentBackdrop from "@/components/realm/ParchmentBackdrop";
import "./atelier.css";

export const metadata: Metadata = {
  title: "伯爵の工房講座 — AI音楽工場の作り方 | 伯爵 MUSIAM",
  description:
    "月数ドルの運用費で350作品を生み出した制作パイプラインを、あなたの手に。AI音楽×自動化の実践講座、先行案内受付中。",
  openGraph: {
    title: "伯爵の工房講座 — AI音楽工場の作り方 | 伯爵 MUSIAM",
    description:
      "月数ドルで350作品を生んだAI音楽×自動化の制作パイプラインを再現可能な手順として講座化。先行案内受付中。",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "伯爵の工房講座 — AI音楽工場の作り方 | 伯爵 MUSIAM",
    description:
      "月数ドルで350作品を生んだAI音楽×自動化の制作パイプラインを講座化。先行案内受付中。",
  },
};

const CURRICULUM = [
  { n: "第一章", title: "工場の設計図", desc: "Suno×配信×販売を1人で回す全体アーキテクチャ" },
  { n: "第二章", title: "量産の作法", desc: "プロンプト設計・世界観の統一・品質の見極め" },
  { n: "第三章", title: "流通の門", desc: "DistroKid/KDPでの配信・出版と権利の基礎" },
  { n: "第四章", title: "自動化の儀", desc: "月数千円で回すAIパイプライン構築(実コード付き)" },
  { n: "第五章", title: "収益の錬金術", desc: "ストリーミング・直販・B2Bの三層収益設計" },
];

export default function AtelierPage() {
  return (
    <>
      <ParchmentBackdrop />
      <main className="atelier-main rnv-parchment-page">
      <section className="atelier-hero">
        <p className="atelier-kicker">Atelier · 弟子入り — 先行案内</p>
        <h1 className="atelier-title">
          AI音楽工場の作り方
          <span className="atelier-sub-title">月数ドルで350作品を生んだ、伯爵の製法書</span>
        </h1>
        <p className="atelier-lead">
          このサイトの楽曲216リリース・書籍134冊は、すべて1人とAIで作られています。
          その制作パイプラインのすべてを、再現可能な手順として講座化します。
        </p>
        <div className="atelier-price">
          先行価格 <strong>¥29,800</strong>
          <small>(正式リリース時 ¥49,800 予定)</small>
        </div>
        <LeadForm
          source="atelier_hero"
          subject="【工房・弟子入り】先行案内を希望します"
          label="弟子入りの先行案内を受け取る(無料)"
        />
        <p className="atelier-note">
          ※ まだ販売は開始していません。メールで先行案内にご登録いただいた方から優先的にご案内します。
        </p>
      </section>

      <section className="atelier-section">
        <h2 className="atelier-section-title">カリキュラム(予定)</h2>
        <ol className="atelier-curriculum">
          {CURRICULUM.map((c) => (
            <li key={c.n} className="atelier-chapter">
              <span className="atelier-chapter-n">{c.n}</span>
              <div>
                <div className="atelier-chapter-title">{c.title}</div>
                <div className="atelier-chapter-desc">{c.desc}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="atelier-section">
        <h2 className="atelier-section-title">こんな方へ</h2>
        <ul className="atelier-for">
          <li>音楽は作れないが、AIで音楽事業を始めたい</li>
          <li>Sunoは触ったことがあるが、量産と販売の仕組み化ができていない</li>
          <li>コンテンツ制作を自動化して、本業の傍らで回したい</li>
        </ul>
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <LeadForm
            source="atelier_footer"
            subject="【工房講座】先行案内を希望します"
            label="先行案内を受け取る(無料)"
          />
        </div>
      </section>
      </main>
    </>
  );
}
