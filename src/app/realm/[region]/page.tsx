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
import { getMusicStreamingLinks } from "@/lib/work-links";
import RegionGallery from "./RegionGallery";
import { toneOf } from "@/lib/realm/region-tones";
import "./realm-region.css";

export const revalidate = 3600;

export function generateStaticParams() {
  return [...ATLAS_REGIONS, FRONTIER_REGION].map((r) => ({ region: r.id }));
}

type Medium = "music" | "book" | "film" | "other";
type RegionWork = { id: string; title: string; cover: string; href: string; releasedAt: string; medium: Medium; genres: string[]; listen: string };

function genresOf(tags?: string[]): string[] {
  return (Array.isArray(tags) ? tags : [])
    .map((t) => String(t))
    .filter((t) => /^genre:/i.test(t))
    .map((t) => t.replace(/^genre:/i, "").trim())
    .filter(Boolean);
}

function mediumOf(type?: string, tags?: string[]): Medium {
  const t = String(type || "").toLowerCase();
  if (t.includes("film") || t.includes("video") || t.includes("movie")) return "film";
  if (t.includes("book") || (Array.isArray(tags) && tags.includes("English Edition"))) return "book";
  if (t === "music" || t.includes("album") || t.includes("track") || t.includes("song")) return "music";
  return t ? "other" : "music";
}

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
      medium: mediumOf(w.type, w.tags),
      genres: genresOf(w.tags),
      listen: getMusicStreamingLinks(w as Parameters<typeof getMusicStreamingLinks>[0])[0]?.url || "",
    }))
    .filter((w) => w.cover)
    .sort((a, b) => b.releasedAt.localeCompare(a.releasedAt));
}

// その地方の主たる媒体で「部屋」の性格を決める。
const ROOMS: Record<Medium, { room: string; en: string; line: string; cta: string; glyph: string }> = {
  music: { room: "試聴の広間", en: "LISTENING HALL", line: "この地に流れる調べ。耳をすませて。", cta: "聴く", glyph: "♪" },
  book: { room: "閲覧室", en: "READING ROOM", line: "棚にならぶ物語。手に取って。", cta: "読む", glyph: "▤" },
  film: { room: "上映室", en: "SCREENING ROOM", line: "上映中の景色。腰をおろして。", cta: "観る", glyph: "▶" },
  other: { room: "展示室", en: "GALLERY", line: "この地の作品を巡る。", cta: "ひらく", glyph: "◆" },
};

function dominantMedium(works: RegionWork[]): Medium {
  const c: Record<Medium, number> = { music: 0, book: 0, film: 0, other: 0 };
  for (const w of works) c[w.medium]++;
  return (Object.keys(c) as Medium[]).sort((a, b) => c[b] - c[a])[0] || "music";
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
  const medium = dominantMedium(works);
  const room = ROOMS[medium];
  const tone = toneOf(region);
  // 今、この地で流れている一曲（音楽地方で配信リンクのある最新作）
  const nowPlaying = medium === "music" ? works.find((w) => w.listen) : undefined;

  return (
    <main
      className={`rgn rgn--${medium}`}
      data-medium={medium}
      style={{ "--rgn-tint": tone.tint, "--rgn-deep": tone.deep } as React.CSSProperties}
    >
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
          <p className="rgn-room rnv-rune">{room.glyph} {room.room} · {room.en} — {works.length}</p>
          <p className="rgn-roomline">{room.line}</p>
        </header>

        {nowPlaying && (
          <aside className="rgn-now" aria-label="今、この地で流れている一曲">
            <span className="rgn-now-cover">
              <Image src={nowPlaying.cover} alt="" fill sizes="56px" className="rgn-now-img" />
              <span className="rgn-now-eq" aria-hidden="true"><i /><i /><i /></span>
            </span>
            <span className="rgn-now-meta">
              <span className="rgn-now-label rnv-rune">NOW BROADCASTING · 今、この地で流れている一曲</span>
              <span className="rgn-now-title rnv-display">{nowPlaying.title}</span>
            </span>
            <a href={nowPlaying.listen} target="_blank" rel="noopener noreferrer" className="rgn-now-listen">聴く</a>
          </aside>
        )}

        {works.length === 0 ? (
          <p className="rgn-empty">この地は、まだ誰もひらいていません。</p>
        ) : (
          <RegionGallery regionId={region} medium={medium} works={works} cta={room.cta} glyph={room.glyph} />
        )}

        <p className="rgn-foot">
          <Link href="/">← 地図へ戻る</Link> · <Link href="/works">全作品の索引（展示）</Link> ·{" "}
          <Link href="/showcase">この地の意匠（Sigil）</Link>
        </p>
      </div>
    </main>
  );
}
