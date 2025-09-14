// src/pages/gates.tsx
import Link from "next/link";

const GATES = [
  { file: "torii.jpg",       href: "/oracle",     title: "占いの門（Oracle Gate）",    desc: "運命を読み、道をひらく。" },
  { file: "galaxy.jpg",      href: "/exhibition", title: "展示の門（Exhibition Gate）", desc: "無限の展示が、あなたを待つ。" },
  { file: "gothic-door.jpg", href: "/chat",       title: "伯爵の門（Count’s Gate）",   desc: "館の大扉、選ばれし者を迎える。" },
] as const;

export default function GatesPage() {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 24 }}>3 GATES</h1>

      {/* Tailwind なし。素の CSS Grid で確実に 3 カード化 */}
      <ul
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "24px",
          listStyle: "none",
          padding: 0,
          margin: 0,
        }}
      >
        {GATES.map((g) => (
          <li key={g.file} style={{ borderRadius: 16, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: 16 }}>
            <Link href={g.href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
              <div style={{ width: "100%", aspectRatio: "1 / 1", overflow: "hidden", borderRadius: 12, marginBottom: 12 }}>
                <img
                  src={`/gates/${g.file}`}
                  alt={g.title}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              </div>
              <div style={{ fontWeight: 700 }}>{g.title}</div>
              <div style={{ opacity: 0.75, fontSize: 14, marginTop: 4 }}>{g.desc}</div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
