// src/app/page.tsx
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

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 16,
        }}
      >
        {GATES.map((g) => (
          <li key={g.file}>
            <Link
              href={g.href}
              style={{ textDecoration: "none", color: "inherit", display: "block" }}
            >
              <div
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  overflow: "hidden",
                  borderRadius: 12,
                  marginBottom: 12,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                }}
              >
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
