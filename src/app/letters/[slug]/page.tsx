// src/app/letters/[slug]/page.tsx — 手紙の個別ページ
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { extractLetterFaq, getAdjacentLetters, getLetter, getLetters, renderMarkdown } from "@/lib/letters";
import { siteUrl } from "@/lib/site-url";

export const dynamicParams = false;

export async function generateStaticParams() {
  const letters = await getLetters();
  return letters.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params;
  const letter = await getLetter(slug);
  if (!letter) return {};
  const base = siteUrl();
  const url = `${base}/letters/${letter.slug}`;
  return {
    title: `${letter.title} | 伯爵の手紙`,
    description: letter.description,
    keywords: letter.keywords.length ? letter.keywords : undefined,
    alternates: { canonical: url },
    openGraph: {
      title: `${letter.title} | 伯爵の手紙`,
      description: letter.description,
      type: "article",
      url,
      publishedTime: letter.date || undefined,
      authors: [`${base}/about`],
    },
    twitter: {
      card: "summary_large_image",
      title: `${letter.title} | 伯爵の手紙`,
      description: letter.description,
    },
  };
}

export default async function LetterPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const letter = await getLetter(slug);
  if (!letter) notFound();
  const { prev, next } = await getAdjacentLetters(slug);

  const base = siteUrl();
  const url = `${base}/letters/${letter.slug}`;
  const faq = extractLetterFaq(letter.body);
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: letter.title,
    description: letter.description,
    datePublished: letter.date || undefined,
    dateModified: letter.date || undefined,
    inLanguage: "ja",
    url,
    mainEntityOfPage: url,
    isPartOf: { "@id": `${base}/letters#collection` },
    ...(letter.keywords.length ? { keywords: letter.keywords.join(", ") } : {}),
    author: { "@type": "Person", name: "ABI伯爵", url: `${base}/about` },
    publisher: { "@type": "Organization", name: "伯爵 MUSIAM", url: base },
  };
  const faqJsonLd = faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  return (
    <main className="page-content" style={{ maxWidth: 680, margin: "0 auto", padding: "3rem 1.25rem 5rem" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <p style={{ fontSize: "0.78rem", color: "var(--rnv-text-amber)", textAlign: "center", marginBottom: 8 }}>{letter.date}</p>
      <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.6rem", textAlign: "center", marginBottom: "2.2rem", lineHeight: 1.5 }}>
        {letter.title}
      </h1>
      <article
        className="prose-tight"
        style={{ fontSize: "0.95rem", lineHeight: 2, color: "var(--color-text-secondary)" }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(letter.body) }}
      />
      {(prev || next) && (
        <nav
          aria-label="前後の手紙"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
            marginTop: "3.5rem",
            paddingTop: "1.75rem",
            borderTop: "1px solid var(--color-border-subtle)",
          }}
        >
          {prev ? (
            <Link
              href={`/letters/${prev.slug}`}
              style={{
                display: "block",
                padding: "0.9rem 1rem",
                borderRadius: 12,
                border: "1px solid var(--color-border-subtle)",
                background: "var(--bg-panel-light)",
                textDecoration: "none",
                color: "var(--color-text-secondary)",
              }}
            >
              <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginBottom: 4 }}>← 前の手紙</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, lineHeight: 1.5 }}>{prev.title}</div>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/letters/${next.slug}`}
              style={{
                display: "block",
                padding: "0.9rem 1rem",
                borderRadius: 12,
                border: "1px solid var(--color-border-subtle)",
                background: "var(--bg-panel-light)",
                textDecoration: "none",
                color: "var(--color-text-secondary)",
                textAlign: "right",
              }}
            >
              <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginBottom: 4 }}>次の手紙 →</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, lineHeight: 1.5 }}>{next.title}</div>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <Link href="/letters" style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
          ← 手紙の一覧へ
        </Link>
      </div>
    </main>
  );
}
