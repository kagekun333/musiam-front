// src/app/not-found.tsx — カスタム404 (世界観維持 + 回遊導線)
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-content" style={{ textAlign: "center", padding: "6rem 1.5rem" }}>
      <p style={{ fontSize: "2.5rem", marginBottom: "1rem" }} aria-hidden>
        ⚜
      </p>
      <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.5rem", marginBottom: "0.8rem" }}>
        その扉は、まだ存在しないようです。
      </h1>
      <p style={{ color: "var(--color-text-muted)", lineHeight: 1.9, marginBottom: "2rem" }}>
        お探しの頁は移動したか、霧に消えました。
        <br />
        三つの門から、改めてお入りください。
      </p>
      <div style={{ display: "flex", gap: "0.8rem", justifyContent: "center", flexWrap: "wrap" }}>
        {[
          { href: "/", label: "ホーム" },
          { href: "/oracle", label: "占いの門" },
          { href: "/works", label: "展示の門" },
          { href: "/chat", label: "伯爵の門" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{
              padding: "0.65rem 1.5rem",
              borderRadius: 12,
              border: "1px solid var(--color-border-medium)",
              textDecoration: "none",
              color: "var(--color-text-primary)",
            }}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
