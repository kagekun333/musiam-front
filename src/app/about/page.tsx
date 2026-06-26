// src/app/about/page.tsx
// AI認知の核となる正規エンティティページ。
// 散らばった活動を「ABI伯爵 / 伯爵MUSIAM」という1つの実体に束ね、
// Person JSON-LD + sameAs(外部リンク) + 可読プロフィールで検索・生成AIに提示する。
import type { Metadata } from "next";
import Link from "next/link";
import { siteUrl } from "@/lib/site-url";
import { ENTITY, SAME_AS, personJsonLd } from "@/lib/entity";
import ParchmentBackdrop from "@/components/realm/ParchmentBackdrop";

export const metadata: Metadata = {
  title: "館主について｜ABI伯爵 | 伯爵 MUSIAM",
  description: ENTITY.description,
  alternates: { canonical: `${siteUrl()}/about` },
  openGraph: {
    title: "館主について｜ABI伯爵 | 伯爵 MUSIAM",
    description: ENTITY.description,
    type: "profile",
    url: `${siteUrl()}/about`,
  },
  twitter: {
    card: "summary_large_image",
    title: "館主について｜ABI伯爵 | 伯爵 MUSIAM",
    description: ENTITY.description,
  },
};

// sameAsに入っているURLから人間向けのラベルを推定する。
function linkLabel(url: string): string {
  const h = url.toLowerCase();
  if (h.includes("youtube") || h.includes("youtu.be")) return "YouTube";
  if (h.includes("x.com") || h.includes("twitter")) return "X (Twitter)";
  if (h.includes("spotify")) return "Spotify";
  if (h.includes("instagram")) return "Instagram";
  if (h.includes("note.com")) return "note";
  if (h.includes("tiktok")) return "TikTok";
  if (h.includes("apple")) return "Apple Music";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const FACTS: [string, string][] = [
  ["名義", "ABI伯爵"],
  ["肩書き", ENTITY.jobTitle],
  ["拠点", "伯爵 MUSIAM（オンライン上の館）"],
  ["公開作品", "350作品（オリジナル楽曲 216・出版書籍 134）"],
  ["活動", "AI制作パイプラインによる楽曲・書籍・映像制作、工房依頼（法人向け音楽制作）、弟子入り（講座）"],
  ["連絡先", ENTITY.email],
];

export default function AboutPage() {
  const jsonLd = personJsonLd();

  return (
    <>
      <ParchmentBackdrop />
      <main
      className="page-content rnv-parchment-page"
      style={{ maxWidth: 760, margin: "0 auto", padding: "3rem 1.25rem 5rem" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="work-breadcrumb" aria-label="パンくず" style={{ marginBottom: "1.5rem", fontSize: "0.85rem", opacity: 0.7 }}>
        <Link href="/">ホーム</Link> / <span>館主について</span>
      </nav>

      <header style={{ marginBottom: "2.5rem" }}>
        <p className="rnv-rune" style={{ fontSize: "0.7rem", letterSpacing: "0.28em", color: "var(--rnv-text-slate)", marginBottom: "0.5rem" }}>
          THE UNMASKED CHAMBER · 素顔の間
        </p>
        <h1
          style={{
            fontFamily: "var(--font-serif), serif",
            fontSize: "1.8rem",
            lineHeight: 1.4,
            marginBottom: "0.75rem",
          }}
        >
          ABI伯爵
        </h1>
        <p style={{ fontSize: "0.95rem", lineHeight: 1.9, opacity: 0.9 }}>
          {ENTITY.description}
        </p>
      </header>

      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.15rem", marginBottom: "1rem" }}>
          プロフィール
        </h2>
        <dl
          style={{
            display: "grid",
            gap: 0,
            border: "1px solid var(--color-border-subtle)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {FACTS.map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(96px, 140px) 1fr",
                borderBottom: "1px solid var(--color-border-subtle)",
              }}
            >
              <dt
                style={{
                  padding: "0.9rem 1rem",
                  fontSize: "0.82rem",
                  color: "var(--color-text-muted)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                {k}
              </dt>
              <dd style={{ padding: "0.9rem 1rem", fontSize: "0.86rem", lineHeight: 1.8, margin: 0 }}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {SAME_AS.length > 0 && (
        <section style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.15rem", marginBottom: "1rem" }}>
            公式リンク
          </h2>
          <ul style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", listStyle: "none", padding: 0, margin: 0 }}>
            {SAME_AS.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  rel="me noopener"
                  target="_blank"
                  style={{
                    display: "inline-block",
                    padding: "0.5rem 1rem",
                    fontSize: "0.85rem",
                    border: "1px solid var(--color-border-subtle)",
                    borderRadius: 999,
                    textDecoration: "none",
                  }}
                >
                  {linkLabel(url)}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.15rem", marginBottom: "1rem" }}>
          館をめぐる
        </h2>
        <ul style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", listStyle: "none", padding: 0, margin: 0 }}>
          {[
            ["/works", "展示（全作品）"],
            ["/business", "工房に依頼（法人）"],
            ["/atelier", "弟子入り（講座）"],
            ["/shop", "交易所"],
            ["/showcase", "新地平（ショーケース）"],
          ].map(([href, label]) => (
            <li key={href}>
              <Link
                href={href}
                style={{
                  display: "inline-block",
                  padding: "0.5rem 1rem",
                  fontSize: "0.85rem",
                  border: "1px solid var(--color-border-subtle)",
                  borderRadius: 999,
                  textDecoration: "none",
                }}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      </main>
    </>
  );
}
