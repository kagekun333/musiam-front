// src/app/classic/page.tsx — 旧ホーム（リノベv2前）の退避先・フォールバック。
// 没入ホームが本番トップ。ここは復元用に保持（noindex）。
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import TodaysPick from "@/components/TodaysPick";
import HomeShowcase from "@/components/HomeShowcase";
import CoverMarquee from "@/components/CoverMarquee";
import Atlas from "@/components/atlas/Atlas";
import WorkshopHub from "@/components/workshop/WorkshopHub";

export const metadata: Metadata = {
  title: "伯爵 MUSIAM（クラシック表示）",
  robots: { index: false, follow: true },
};

type Gate = { file: string; href: string; ja: string; en: string; desc: string; cta: string };

const GATES: Gate[] = [
  { file: "galaxy.jpg", href: "/works", ja: "展示の門", en: "Exhibition Gate", desc: "無限の展示が、あなたを待つ。", cta: "展示を見る" },
  { file: "gothic-door.jpg", href: "/chat", ja: "伯爵の門", en: "Count's Gate", desc: "館の大扉、選ばれし者を迎える。", cta: "伯爵に相談" },
];

export default function ClassicHome() {
  return (
    <main className="page-content">
      <section className="hero hero--tight">
        <h1 className="wordmark" aria-label="伯爵 MUSIAM">
          <span className="wordmark-jp">伯爵</span>
          <span className="wordmark-en">MUSIAM</span>
        </h1>
        <p className="hero-sub">音楽と芸術の宮殿へ、ようこそ。</p>
      </section>

      <TodaysPick />
      <Atlas />

      <section className="gates-wrap">
        <h2 className="gates-title">2 GATES</h2>
        <ul className="gates-grid">
          {GATES.map((g) => (
            <li key={g.file}>
              <Link href={g.href} className="gate-link" style={{ display: "block" }} aria-label={`${g.ja}へ移動`}>
                <div className="gate-card">
                  <div className="media square">
                    <Image src={`/gates/${g.file}`} alt={`${g.ja}（${g.en}）`} fill className="gate-img" sizes="(max-width:640px) 30vw, (max-width:1024px) 30vw, 360px" />
                  </div>
                  <div className="gate-caption">
                    <div className="gate-title">
                      <span className="gate-title-ja">{g.ja}</span>
                      <span className="gate-title-en" aria-hidden="true">{g.en}</span>
                    </div>
                    <div className="gate-desc">{g.desc}</div>
                    <span className="gate-cta" aria-hidden="true">{g.cta}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <CoverMarquee />
      <WorkshopHub />
      <HomeShowcase />
      <div aria-hidden className="corner-mark" />
    </main>
  );
}
