// src/app/letters/[slug]/page.tsx — 手紙の個別ページ
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLetter, getLetters, renderMarkdown } from "@/lib/letters";

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
  return {
    title: `${letter.title} | 伯爵の手紙`,
    description: letter.description,
  };
}

export default async function LetterPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const letter = await getLetter(slug);
  if (!letter) notFound();

  return (
    <main className="page-content" style={{ maxWidth: 680, margin: "0 auto", padding: "3rem 1.25rem 5rem" }}>
      <p style={{ fontSize: "0.78rem", color: "#d8b65c", textAlign: "center", marginBottom: 8 }}>{letter.date}</p>
      <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.6rem", textAlign: "center", marginBottom: "2.2rem", lineHeight: 1.5 }}>
        {letter.title}
      </h1>
      <article
        className="prose-tight"
        style={{ fontSize: "0.95rem", lineHeight: 2, color: "var(--color-text-secondary)" }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(letter.body) }}
      />
      <div style={{ textAlign: "center", marginTop: "3rem" }}>
        <Link href="/letters" style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
          ← 手紙の一覧へ
        </Link>
      </div>
    </main>
  );
}
