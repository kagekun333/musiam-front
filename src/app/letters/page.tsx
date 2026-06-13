// src/app/letters/page.tsx — 伯爵の手紙 一覧 (SEO記事置き場)
import type { Metadata } from "next";
import Link from "next/link";
import { getLetters } from "@/lib/letters";

export const metadata: Metadata = {
  title: "伯爵の手紙 | 伯爵 MUSIAM",
  description: "AI音楽制作の裏側、館の運営記、作品の物語 — 伯爵MUSIAMからの手紙。",
};

export default async function LettersPage() {
  const letters = await getLetters();
  return (
    <main className="page-content" style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 1.25rem 5rem" }}>
      <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.7rem", textAlign: "center", marginBottom: "0.6rem" }}>
        伯爵の手紙
      </h1>
      <p style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "2.5rem" }}>
        制作の裏側と、館の日々を綴ります。
      </p>
      {letters.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
          最初の手紙を、いま認めております。
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {letters.map((l) => (
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
              <div style={{ fontSize: "0.75rem", color: "#d8b65c", marginBottom: 4 }}>{l.date}</div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{l.title}</div>
              <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>
                {l.description}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
