// src/app/showcase/page.tsx — NFT「国の意匠（Sigils of the Realm）」（v2: 地図結合）
// 【境界・厳守】mint・出品・ウォレット接続・暗号資産/金銭のやり取りは一切行わない。
//   本ページは「世界観・各地の意匠・ユーティリティ・ロードマップ・メタデータ草案・外部マーケット導線」のみ。
//   発行/出品はオーナー（ユーザー）が外部で実施する。
import type { Metadata } from "next";
import Link from "next/link";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import { dedupeWorks } from "@/lib/dedupeWorks";
import { buildAtlas, type AtlasWork } from "@/lib/atlas/regions";
import { NFT_ROADMAP, NFT_MARKETPLACE_URL } from "@/lib/nft/collection";
import { getSigils, SIGIL_COLLECTION, SIGIL_UTILITY } from "@/lib/nft/sigils";
import "./showcase.css";

export const metadata: Metadata = {
  title: "国の意匠（Sigils of the Realm）| 伯爵 MUSIAM",
  description:
    "伯爵MUSIAMの地図の各地の意匠（紋章）を所有するコレクション。地図がそのままコレクションの目録。発行・出品はオーナーが行います。",
  openGraph: {
    title: "国の意匠（Sigils of the Realm）| 伯爵 MUSIAM",
    description: "地図の各地の意匠を所有する。地図がそのままコレクションの目録。",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "国の意匠（Sigils of the Realm）| 伯爵 MUSIAM",
    description: "地図の各地の意匠を所有するコレクション。",
  },
};

export const revalidate = 3600;

function Medallion({ glyph, accent }: { glyph: string; accent: "amber" | "slate" }) {
  const ring = accent === "amber" ? "#cda14a" : "#8aa0bd";
  const ink = accent === "amber" ? "#8a6322" : "#46527a";
  return (
    <svg className="rnv-sigil-medal" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="#7e2330" />
      <circle cx="50" cy="50" r="46" fill="none" stroke="#5c161f" strokeWidth="3" />
      <circle cx="50" cy="50" r="38" fill="none" stroke={ring} strokeWidth="1" opacity="0.8" />
      <g stroke={ring} strokeWidth="0.8" opacity="0.6">
        <line x1="50" y1="6" x2="50" y2="14" /><line x1="50" y1="86" x2="50" y2="94" />
        <line x1="6" y1="50" x2="14" y2="50" /><line x1="86" y1="50" x2="94" y2="50" />
      </g>
      <text x="50" y="63" fontFamily="var(--rnv-font-display)" fontSize="34" textAnchor="middle" fill={ink}>{glyph}</text>
      <ellipse cx="40" cy="36" rx="14" ry="9" fill="#fff" opacity="0.1" />
    </svg>
  );
}

export default async function ShowcasePage() {
  const merged = (await loadMergedWorksServer()) as AtlasWork[];
  const display = dedupeWorks(merged as Parameters<typeof dedupeWorks>[0]) as AtlasWork[];
  const atlas = buildAtlas(display, (w) => `/works/${encodeURIComponent(String(w.id))}`);
  const countById = new Map(atlas.map((r) => [r.id, r.count]));
  const sigils = getSigils().filter((s) => (countById.get(s.id) || 0) > 0);

  return (
    <main className="rnv-nft-main">
      <header className="rnv-nft-head">
        <p className="rnv-nft-kicker rnv-rune">NEW HORIZON · 新地平 — 国の意匠</p>
        <h1 className="rnv-nft-h1 rnv-realm-title">{SIGIL_COLLECTION.name}</h1>
        <p className="rnv-nft-tagline">{SIGIL_COLLECTION.tagline}</p>
        <p className="rnv-nft-desc">{SIGIL_COLLECTION.description}</p>
        <div className="rnv-nft-cta">
          {NFT_MARKETPLACE_URL ? (
            <a href={NFT_MARKETPLACE_URL} target="_blank" rel="noopener noreferrer" className="rnv-nft-btn rnv-nft-btn--gold">マーケットで見る</a>
          ) : (
            <span className="rnv-nft-btn rnv-nft-btn--disabled">マーケット出品 — 準備中</span>
          )}
          <Link href="/" className="rnv-nft-btn rnv-nft-btn--ghost">地図で各地を巡る</Link>
        </div>
      </header>

      <section className="rnv-nft-section">
        <h2 className="rnv-nft-section-title rnv-realm-title">意匠の一覧</h2>
        <p className="rnv-nft-section-note">地図の各地に、ひとつの意匠。歩いた土地を、手元に。</p>
        <ul className="rnv-sigil-grid" role="list">
          {sigils.map((s) => (
            <li key={s.id} className="rnv-sigil-card">
              <Medallion glyph={s.glyph} accent={s.accent} />
              <div className="rnv-sigil-meta">
                <span className="rnv-sigil-name rnv-display">{s.ja}</span>
                <span className="rnv-sigil-en rnv-rune">{s.en} · {countById.get(s.id) || 0}作品</span>
                <span className="rnv-sigil-blurb">{s.blurb}</span>
                <Link href={`/realm/${s.id}`} className="rnv-sigil-link">この地を巡る →</Link>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rnv-nft-section">
        <h2 className="rnv-nft-section-title rnv-realm-title">意匠を持つ意味</h2>
        <ul className="rnv-sigil-util" role="list">
          {SIGIL_UTILITY.map((u) => (
            <li key={u.title} className="rnv-sigil-util-item">
              <span className="rnv-sigil-util-title rnv-display">{u.title}</span>
              <span className="rnv-sigil-util-body">{u.body}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rnv-nft-section">
        <h2 className="rnv-nft-section-title rnv-realm-title">ロードマップ（草案）</h2>
        <ol className="rnv-nft-roadmap" role="list">
          {NFT_ROADMAP.map((p) => (
            <li key={p.phase} className={`rnv-nft-phase is-${p.status}`}>
              <span className="rnv-nft-phase-no rnv-rune">{p.phase}</span>
              <div>
                <div className="rnv-nft-phase-title rnv-sovereign">
                  {p.title}
                  {p.status === "now" && <span className="rnv-nft-phase-badge">現在地</span>}
                </div>
                <p className="rnv-nft-phase-body">{p.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rnv-nft-boundary" aria-label="重要な注意">
        <h2 className="rnv-nft-section-title rnv-realm-title">発行・出品について</h2>
        <p className="rnv-nft-boundary-body">
          本ページは世界観の提示と導線のみ。NFTの<strong>発行（mint）・出品・暗号資産や金銭のやり取りは行いません</strong>。
          コレクションの作成・mint・マーケット出品・販売は、オーナー自身がウォレットで実施します。メタデータ草案は下記から。
        </p>
        <div className="rnv-nft-meta-links">
          <a href="/nft/collection.json" target="_blank" rel="noopener noreferrer" className="rnv-nft-btn rnv-nft-btn--ghost">コレクションmetadata草案</a>
          <a href="/nft/token-template.json" target="_blank" rel="noopener noreferrer" className="rnv-nft-btn rnv-nft-btn--ghost">トークンmetadata雛形</a>
        </div>
      </section>
    </main>
  );
}
