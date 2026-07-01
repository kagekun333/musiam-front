// src/app/letters/page.tsx — 伯爵の手紙 一覧 (SEO記事置き場)
import type { Metadata } from "next";
import Link from "next/link";
import { getLetters, groupLettersByMonth } from "@/lib/letters";
import ParchmentBackdrop from "@/components/realm/ParchmentBackdrop";
import { siteUrl } from "@/lib/site-url";

const LIST_TITLE = "伯爵の手紙 | 伯爵 MUSIAM";
const LIST_DESC =
  "AI音楽制作の裏側、館の運営記、作品の物語 — 伯爵MUSIAMからの手紙。年代記としてすべて日付順に読める。";

export const metadata: Metadata = {
  title: LIST_TITLE,
  description: LIST_DESC,
  alternates: { canonical: `${siteUrl()}/letters` },
  openGraph: {
    title: LIST_TITLE,
    description: LIST_DESC,
    type: "website",
    url: `${siteUrl()}/letters`,
  },
  twitter: {
    card: "summary_large_image",
    title: LIST_TITLE,
    description: LIST_DESC,
  },
};

export default async function LettersPage() {
  const letters = await getLetters();
  const groups = groupLettersByMonth(letters);
  const base = siteUrl();
  // GEO対策: 直近分をhasPartとして構造化データに載せる(全552通載せるとペイロードが肥大化するため、
  // クロール可能な全件は sitemap.xml が担い、ここは「最近の代表例」を示す形にする)。
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${base}/letters#collection`,
    name: "伯爵の手紙",
    description: LIST_DESC,
    url: `${base}/letters`,
    inLanguage: "ja",
    isPartOf: { "@id": `${base}/#website` },
    about: { "@id": `${base}/about#person` },
    hasPart: letters.slice(0, 60).map((l) => ({
      "@type": "BlogPosting",
      headline: l.title,
      url: `${base}/letters/${l.slug}`,
      datePublished: l.date || undefined,
      ...(l.keywords.length ? { keywords: l.keywords.join(", ") } : {}),
    })),
  };
  return (
    <>
      <ParchmentBackdrop />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <main className="page-content rnv-parchment-page" style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.25rem 5rem", position: "relative" }}>
      <p style={{ textAlign: "center", fontFamily: "var(--rnv-font-rune)", fontSize: "0.7rem", letterSpacing: "0.28em", color: "var(--rnv-text-slate)", marginBottom: "0.5rem" }}>
        EPISTLES · 伯爵の書簡と記録
      </p>
      <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.7rem", textAlign: "center", marginBottom: "0.6rem" }}>
        伯爵の手紙
      </h1>
      <p style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "1.75rem" }}>
        制作の裏側と、国の日々を綴る年代記。読めば、この国の成り立ちが見えてきます。（全{letters.length}通）
      </p>
      {letters.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
          最初の手紙を、いま認めております。
        </p>
      ) : (
        <>
          {/* 年月ジャンプ索引: 552通を上から辿らずとも、過去の月へ直接飛べる動線 */}
          <nav aria-label="年月から探す" style={{ marginBottom: "2.5rem" }}>
            <p style={{ fontSize: "0.7rem", letterSpacing: "0.12em", color: "var(--color-text-muted)", marginBottom: "0.6rem", textAlign: "center" }}>
              年月から探す
            </p>
            <ul
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                justifyContent: "center",
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
            >
              {groups.map((g) => (
                <li key={g.key}>
                  <a
                    href={`#m-${g.key}`}
                    style={{
                      display: "inline-block",
                      fontSize: "0.78rem",
                      padding: "0.35rem 0.8rem",
                      borderRadius: 999,
                      border: "1px solid var(--color-border-subtle)",
                      background: "var(--bg-panel-light)",
                      color: "var(--color-text-secondary)",
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {g.label}
                    <span style={{ color: "var(--color-text-muted)", marginLeft: "0.35em" }}>({g.letters.length})</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {groups.map((g) => (
            <section key={g.key} id={`m-${g.key}`} style={{ marginBottom: "2.75rem", scrollMarginTop: "84px" }}>
              <h2
                style={{
                  fontFamily: "var(--font-serif), serif",
                  fontSize: "1.1rem",
                  color: "var(--rnv-ink)",
                  borderBottom: "1px solid var(--color-border-subtle)",
                  paddingBottom: "0.5rem",
                  marginBottom: "1rem",
                }}
              >
                {g.label}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {g.letters.map((l) => (
                  <Link
                    key={l.slug}
                    href={`/letters/${l.slug}`}
                    style={{
                      display: "block",
                      padding: "1.3rem 1.4rem",
                      borderRadius: 14,
                      border: "1px solid var(--color-border-subtle)",
                      background: "var(--bg-panel-light)",
                      textDecoration: "none",
                      color: "var(--color-text-primary)",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", color: "var(--rnv-text-amber)", fontWeight: 600, marginBottom: 4 }}>{l.date}</div>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{l.title}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>
                      {l.description}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </>
      )}
      </main>
    </>
  );
}
