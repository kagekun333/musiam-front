// src/app/showcase/page.tsx — NFTショーケース（F5・新地平）
// 【境界・厳守】mint・出品・ウォレット接続・暗号資産/金銭のやり取りは一切行わない。
//   本ページは「世界観・原画ショーケース・ロードマップ・メタデータ草案・外部マーケット導線」のみ。
//   発行/出品はオーナー（ユーザー）が外部で実施する。
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import { dedupeWorks } from "@/lib/dedupeWorks";
import { buildAtlas, type AtlasWork } from "@/lib/atlas/regions";
import {
  NFT_COLLECTION,
  NFT_ROADMAP,
  NFT_MARKETPLACE_URL,
  pickShowcase,
} from "@/lib/nft/collection";
import "./showcase.css";

export const metadata: Metadata = {
  title: "ショーケース — 国の意匠（NFT） | 伯爵 MUSIAM",
  description:
    "伯爵MUSIAMの視覚の宝物庫。各地方の名所の原画・紋章・地図を限定コレクションとして提示するショーケース。発行・出品はオーナーが行います。",
  openGraph: {
    title: "ショーケース — 国の意匠（NFT） | 伯爵 MUSIAM",
    description: "各地方の名所の原画・紋章・地図を限定コレクションとして提示するショーケース。",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ショーケース — 国の意匠（NFT） | 伯爵 MUSIAM",
    description: "視覚の宝物庫。各地方の原画を限定コレクションとして。",
  },
};

export const revalidate = 3600;

export default async function ShowcasePage() {
  const merged = (await loadMergedWorksServer()) as AtlasWork[];
  const display = dedupeWorks(merged as Parameters<typeof dedupeWorks>[0]) as AtlasWork[];
  const atlas = buildAtlas(display, (w) => `/works/${encodeURIComponent(String(w.id))}`);
  // 各地方の名所を原画候補に。
  const landmarks = atlas
    .map((r) => (r.landmark ? { ...r.landmark, region: r.ja } : null))
    .filter((x): x is { id: string; title: string; cover: string; href: string; region: string } => x !== null);
  const showcase = pickShowcase(landmarks, 12);

  return (
    <main className="rnv-nft-main">
      <header className="rnv-nft-head">
        <p className="rnv-nft-kicker rnv-rune">NEW HORIZON · 新地平</p>
        <h1 className="rnv-nft-h1 rnv-realm-title">{NFT_COLLECTION.name}</h1>
        <p className="rnv-nft-tagline">{NFT_COLLECTION.tagline}</p>
        <p className="rnv-nft-desc">{NFT_COLLECTION.description}</p>

        <div className="rnv-nft-cta">
          {NFT_MARKETPLACE_URL ? (
            <a
              href={NFT_MARKETPLACE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rnv-nft-btn rnv-nft-btn--gold"
            >
              マーケットで見る
            </a>
          ) : (
            <span className="rnv-nft-btn rnv-nft-btn--disabled">マーケット出品 — 準備中</span>
          )}
          <Link href="/works" className="rnv-nft-btn rnv-nft-btn--ghost">
            原作（作品）を巡る
          </Link>
        </div>
      </header>

      <section className="rnv-nft-section">
        <h2 className="rnv-nft-section-title rnv-realm-title">原画ショーケース</h2>
        <p className="rnv-nft-section-note">各地方の名所より。コレクションの原画候補です（鑑賞用の提示）。</p>
        <ul className="rnv-nft-grid" role="list">
          {showcase.map((s) => (
            <li key={s.id} className="rnv-nft-tile">
              <Link href={s.href} className="rnv-nft-tile-link rnv-breathe">
                <span className="rnv-nft-tile-cover">
                  <Image src={s.cover} alt={s.title} fill sizes="220px" className="rnv-nft-tile-img" />
                </span>
                <span className="rnv-nft-tile-meta">
                  <span className="rnv-nft-tile-region rnv-rune">{s.region}</span>
                  <span className="rnv-nft-tile-title">{s.title}</span>
                </span>
              </Link>
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
          本ページは世界観の提示と導線のみを担います。NFTの<strong>発行（mint）・出品・暗号資産や金銭のやり取りは行いません</strong>。
          コレクションの作成・mint・マーケットへの出品・販売は、オーナー自身がウォレットで実施します。
          メタデータの草案は下記からご利用いただけます。
        </p>
        <div className="rnv-nft-meta-links">
          <a href="/nft/collection.json" target="_blank" rel="noopener noreferrer" className="rnv-nft-btn rnv-nft-btn--ghost">
            コレクションmetadata草案
          </a>
          <a href="/nft/token-template.json" target="_blank" rel="noopener noreferrer" className="rnv-nft-btn rnv-nft-btn--ghost">
            トークンmetadata雛形
          </a>
        </div>
      </section>
    </main>
  );
}
