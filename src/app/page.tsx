// src/app/page.tsx
import Link from "next/link";
import Image from "next/image";


type Gate = {
  file: string;
  href: string;
  ja: string;
  en: string;
  desc: string;
  cta: string; // CTAボタンの文言
};

const GATES: Gate[] = [
  { file: "torii.jpg",       href: "/oracle",     ja: "占いの門", en: "Oracle Gate",     desc: "運命を読み、道をひらく。",       cta: "今日を占う" },
  { file: "galaxy.jpg",      href: "/exhibition", ja: "展示の門", en: "Exhibition Gate", desc: "無限の展示が、あなたを待つ。",   cta: "展示を見る" },
  { file: "gothic-door.jpg", href: "/chat",       ja: "伯爵の門", en: "Count's Gate",    desc: "館の大扉、選ばれし者を迎える。", cta: "伯爵に相談" },
];

export default function Home() {
  return (
    <main className="page-content">
      {/* グローバル背景は layout.tsx で提供 */}

      {/* Wordmark */}
      <section className="hero hero--tight">
        <h1 className="wordmark" aria-label="伯爵 MUSIAM">
          <span className="wordmark-jp">伯爵</span>
          <span className="wordmark-en">MUSIAM</span>
        </h1>
        <p className="hero-sub">音楽と芸術の宮殿へ、ようこそ。</p>
      </section>

      {/* 3 GATES */}
      <section className="gates-wrap">
        <h2 className="gates-title">3 GATES</h2>

        <ul className="gates-grid">
          {GATES.map((g) => (
            <li key={g.file}>
              {/* div+onClick を <Link> に統一。ネスト anchor 回避のため内側CTAはspanに */}
              <Link
                href={g.href}
                className="gate-link"
                style={{ display: "block" }}
                aria-label={`${g.ja}へ移動`}
              >
                <div className="gate-card">
                  <div className="media square">
                    <Image
                      src={`/gates/${g.file}`}
                      alt={`${g.ja}（${g.en}）`}
                      fill
                      className="gate-img"
                      sizes="(max-width:640px) 30vw, (max-width:1024px) 30vw, 360px"
                      priority={g.file === "torii.jpg"}
                    />
                  </div>

                  {/* 画像の外にキャプション */}
                  <div className="gate-caption">
                    <div className="gate-title">
                      <span className="gate-title-ja">{g.ja}</span>
                      <span className="gate-title-en" aria-hidden="true">{g.en}</span>
                    </div>
                    <div className="gate-desc">{g.desc}</div>

                    {/* CTAラベル（親Linkがナビ担当のためspanに変更） */}
                    <span className="gate-cta" aria-hidden="true">
                      {g.cta}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 右下ウォーターマーク：/public/brand/abi-seal.png を配置 */}
      <div aria-hidden className="corner-mark" />
    </main>
  );
}
