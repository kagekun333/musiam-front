// src/app/offline/page.tsx — PWAオフライン時のフォールバック (sw.js の OFFLINE_URL が参照)
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "オフライン | 伯爵 MUSIAM",
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <main className="page-content" style={{ textAlign: "center", padding: "6rem 1.5rem" }}>
      <p style={{ fontSize: "2.5rem", marginBottom: "1rem" }} aria-hidden>
        ☾
      </p>
      <h1 style={{ fontFamily: "var(--font-serif), serif", fontSize: "1.5rem", marginBottom: "0.8rem" }}>
        館は今、霧の中に。
      </h1>
      <p style={{ color: "var(--color-text-muted)", lineHeight: 1.9, marginBottom: "2rem" }}>
        ネットワークに接続できません。
        <br />
        電波の戻る場所で、また扉をお開けください。
      </p>
      <Link
        href="/"
        style={{
          display: "inline-block",
          padding: "0.7rem 1.8rem",
          borderRadius: 12,
          border: "1px solid var(--color-border-medium)",
          textDecoration: "none",
          color: "var(--color-text-primary)",
        }}
      >
        再読み込み
      </Link>
    </main>
  );
}
