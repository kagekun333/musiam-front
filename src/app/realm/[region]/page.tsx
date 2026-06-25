// src/app/realm/[region]/page.tsx — 地方ページ（没入ホームから「入る」場所）。
// その地方に属する作品群を羊皮紙のギャラリーで一望できる。地方=タグ駆動（assignRegionId）。
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import { dedupeWorks } from "@/lib/dedupeWorks";
import {
  ATLAS_REGIONS,
  FRONTIER_REGION,
  assignRegionId,
  regionDefById,
  type AtlasWork,
} from "@/lib/atlas/regions";
import "./realm-region.css";

export const revalidate = 3600;

export function generateStaticParams() {
  return [...ATLAS_REGIONS, FRONTIER_REGION].map((r) => ({ region: r.id }));
}

type RegionWork = { id: string; title: string; cover: string; href: string; releasedAt: string };

async function loadRegionWorks(regionId: string): Promise<RegionWork[]> {
  const merged = (await loadMergedWorksServer()) as AtlasWork[];
  const display = dedupeWorks(merged as Parameters<typeof dedupeWorks>[0]) as AtlasWork[];
  return display
    .filter((w) => w.id != null && w.title && assignRegionId(w) === regionId)
    .map((w) => ({
      id: String(w.id),
      title: String(w.title),
      cover: String(w.cover || ""),
      href: `/works/${encodeURIComponent(String(w.id))}`,
      releasedAt: String(w.releasedAt || ""),
    }))
    .filter((w) => w.cover)
    .sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
}

export async function generateMetadata(
  { params }: { params: Promise<{ region: string }> }
): Promise<Metadata> {
  const { region } = await params;
  const def = regionDefById(region);
  return {
    title: `${def.ja}（${def.en}） — 伯爵 MUSIAM`,
    description: `${def.blurb} 伯爵MUSIAMの地方「${def.ja}」に属する作品を巡る。`,
  };
}

export default async function RegionPage(
  { params }: { params: Promise<{ region: string }> }
) {
  const { region } = await params;
  const known = [...ATLAS_REGIONS, FRONTIER_REGION].some((r) => r.id === region);
  if (!known) notFound();

  const def = regionDefById(region);
  const works = await loadRegionWorks(region);

  return (
    <main className="rgn">
      <div className="rgn-parch" aria-hidden="true">
        <svg className="rgn-tex fiber" preserveAspectRatio="none"><defs><filter id="rgnFiber"><feTurbulence type="fractalNoise" baseFrequency="0.86" numOctaves="2" seed="8" stitchTiles="stitch" /><feColorMatrix type="matrix" values="0 0 0 0 0.30  0 0 0 0 0.22  0 0 0 0 0.11  0 0 0 0.6 0" /></filter></defs><rect width="100%" height="100%" filter="url(#rgnFiber)" /></svg>
      </div>

      <div className="rgn-inner">
        <nav className="rgn-crumb" aria-label="パンくず">
          <Link href="/">領土</Link> / <span>{def.ja}</span>
        </nav>

        <header className="rgn-head">
          <span className={`rgn-glyph ${def.accent}`} aria-hidden="true">{def.glyph}</span>
          <h1 className="rgn-title rnv-display rnv-gold-text">{def.ja}</h1>
          <p className="rgn-en rnv-rune">{def.en}</p>
          <p className="rgn-blurb">{def.blurb}</p>
          <p className="rgn-count rnv-rune">{works.length} 作品</p>
        </header>

        {works.length === 0 ? (
          <p className="rgn-empty">この地は、まだ誰もひらいていません。</p>
        ) : (
          <ul className="rgn-grid" role="list">
            {works.map((w) => (
              <li key={w.id}>
                <Link href={w.href} className="rgn-card">
                  <span className="rgn-card-cover">
                    <Image src={w.cover} alt={w.title} fill sizes="(max-width:640px) 40vw, 200px" className="rgn-card-img" />
                  </span>
                  <span className="rgn-card-title">{w.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="rgn-foot">
          <Link href="/">← 地図へ戻る</Link> · <Link href="/works">全作品の索引（展示）</Link>
        </p>
      </div>
    </main>
  );
}
