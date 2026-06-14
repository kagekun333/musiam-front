// src/app/works/[id]/page.tsx — 作品個別ページ (307作品分の検索流入口)
// works.json + works-ssd.json をサーバーでマージして静的生成する。
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import type { CatalogWork } from "@/lib/mergeWorksCatalog";
import { siteUrl } from "@/lib/site-url";
import { isHyperfollowUrl } from "@/lib/work-links";
import WorkLinks, { type WorkLinkItem } from "./WorkLinks";
import DonationCTA from "@/components/cta/DonationCTA";
import "./work-page.css";

export const dynamicParams = false;

type Params = { id: string };

async function getWork(id: string): Promise<{ work: CatalogWork | null; all: CatalogWork[] }> {
  const all = await loadMergedWorksServer();
  const decoded = decodeURIComponent(id);
  const work = all.find((w) => String(w.id) === decoded) ?? null;
  return { work, all };
}

/** 伯爵の解説文 (scripts/gen-work-notes.mjs で生成。無ければ null) */
async function getCountNote(id: string): Promise<string | null> {
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const raw = await fs.readFile(path.join(process.cwd(), "public/works/works-notes.json"), "utf-8");
    const json = JSON.parse(raw) as { notes?: Record<string, string> };
    return json.notes?.[decodeURIComponent(id)] ?? null;
  } catch {
    return null;
  }
}

export async function generateStaticParams(): Promise<Params[]> {
  const works = await loadMergedWorksServer();
  return works
    .filter((w) => w.id != null && w.title)
    .map((w) => ({ id: encodeURIComponent(String(w.id)) }));
}

function typeLabel(type?: string): string {
  const t = String(type || "").toLowerCase();
  if (t.includes("music")) return "Music";
  if (t.includes("book")) return "Book";
  return "Work";
}

function buildLinks(work: CatalogWork): WorkLinkItem[] {
  const items: WorkLinkItem[] = [];
  const links = work.links;
  const map: Record<string, string> = {};
  if (links && !Array.isArray(links) && typeof links === "object") {
    for (const [k, v] of Object.entries(links)) {
      if (typeof v === "string" && v) map[k] = v;
    }
  }
  const isMusic = typeLabel(work.type) === "Music";
  const order: [string, string][] = isMusic
    ? [
        ["spotify", "Spotifyで聴く"],
        ["appleMusic", "Apple Musicで聴く"],
        ["amazonMusic", "Amazon Musicで聴く"],
        ["itunesBuy", "iTunesで購入"],
      ]
    : [
        ["amazon", "Amazonで読む"],
        ["kindle", "Kindleで読む"],
      ];
  const seen = new Set<string>();
  for (const [key, label] of order) {
    const url = map[key];
    if (url && !isHyperfollowUrl(url) && !seen.has(url)) {
      seen.add(url);
      items.push({ label, url, primary: items.length === 0 });
    }
  }
  // フォールバック: salesHref / primaryHref / href (HyperFollow/DistroKidは除外)
  const fallbackCandidates = [work.salesHref, work.primaryHref, work.href].filter(
    (u): u is string => typeof u === "string" && !!u && !isHyperfollowUrl(u)
  );
  const fallback = fallbackCandidates[0];
  if (items.length === 0 && fallback) {
    items.push({ label: isMusic ? "聴く" : "読む・購入", url: fallback, primary: true });
  } else if (work.salesHref && !isHyperfollowUrl(work.salesHref) && !seen.has(work.salesHref)) {
    items.push({ label: "購入する", url: work.salesHref });
  }
  return items;
}

/** Spotifyの作品URLから埋め込み試聴URLを作る。対応外なら null。 */
function spotifyEmbed(work: CatalogWork): string | null {
  const links = work.links;
  let url = "";
  if (links && !Array.isArray(links) && typeof links === "object") {
    const v = (links as Record<string, unknown>).spotify;
    if (typeof v === "string") url = v;
  }
  if (!url) {
    const fb = work.primaryHref || work.salesHref || work.href || "";
    if (typeof fb === "string" && fb.includes("open.spotify.com")) url = fb;
  }
  const m = url.match(/open\.spotify\.com\/(album|track|playlist)\/([A-Za-z0-9]+)/);
  if (!m) return null;
  return `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator&theme=0`;
}

function relatedWorks(work: CatalogWork, all: CatalogWork[], n = 4): CatalogWork[] {
  const tags = new Set(work.tags ?? []);
  return all
    .filter((w) => w.id !== work.id && w.title && w.cover)
    .map((w) => {
      let score = 0;
      if (String(w.type) === String(work.type)) score += 2;
      score += (w.tags ?? []).filter((t) => tags.has(t)).length;
      return { w, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.w);
}

export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { id } = await params;
  const { work } = await getWork(id);
  if (!work) return {};
  const t = typeLabel(work.type);
  const title = `${work.title} | 伯爵 MUSIAM`;
  const description =
    t === "Music"
      ? `「${work.title}」— 伯爵MUSIAMのオリジナル楽曲。Spotify・Apple Music・Amazon Musicで配信中。`
      : `「${work.title}」— 伯爵MUSIAMのオリジナル作品。`;
  const cover = work.cover ? `${siteUrl()}${work.cover}` : undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: t === "Music" ? "music.album" : "article",
      ...(cover ? { images: [{ url: cover }] } : {}),
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title,
      description,
      ...(cover ? { images: [cover] } : {}),
    },
    alternates: { canonical: `${siteUrl()}/works/${encodeURIComponent(String(work.id))}` },
  };
}

export default async function WorkPage(
  { params }: { params: Promise<Params> }
) {
  const { id } = await params;
  const { work, all } = await getWork(id);
  if (!work) notFound();
  const countNote = await getCountNote(id);

  const t = typeLabel(work.type);
  const links = buildLinks(work);
  const embed = t === "Music" ? spotifyEmbed(work) : null;
  const related = relatedWorks(work, all);
  const tracks = work.ssd?.tracks?.filter((tr) => tr.title) ?? [];
  const notes =
    typeof work.matchInfo === "object" && work.matchInfo
      ? (work.matchInfo as { summary?: string }).summary
      : undefined;

  // JSON-LD 構造化データ (検索結果のリッチ表示用)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": t === "Music" ? "MusicAlbum" : "Book",
    name: work.title,
    ...(work.cover ? { image: `${siteUrl()}${work.cover}` } : {}),
    ...(work.releasedAt ? { datePublished: work.releasedAt } : {}),
    byArtist: { "@type": "MusicGroup", name: "ABI伯爵" },
  };

  return (
    <main className="work-main">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="work-breadcrumb" aria-label="パンくず">
        <Link href="/">ホーム</Link> / <Link href="/works">展示</Link> /{" "}
        <span>{work.title}</span>
      </nav>

      <section className="work-hero">
        <div className="work-cover-wrap">
          {work.cover ? (
            <Image
              src={work.cover}
              alt={`${work.title} カバー`}
              fill
              sizes="(max-width:640px) 90vw, 320px"
              style={{ objectFit: "cover" }}
              priority
            />
          ) : (
            <div className="work-cover-fallback">{t === "Music" ? "♪" : "✦"}</div>
          )}
        </div>
        <div>
          <span className="work-type-badge">{t}</span>
          <h1 className="work-title">{work.title}</h1>
          {t === "Music" && (
            <div className="work-eq" aria-hidden>
              {Array.from({ length: 7 }).map((_, i) => (
                <span key={i} />
              ))}
            </div>
          )}
          {work.releasedAt && <p className="work-meta">リリース: {work.releasedAt}</p>}
          {(work.moodTags?.length || work.tags?.length) ? (
            <div className="work-tags">
              {(work.moodTags?.length ? work.moodTags : work.tags ?? []).slice(0, 8).map((tag) => (
                <span key={tag} className="work-tag">{tag}</span>
              ))}
            </div>
          ) : null}
          <WorkLinks workId={String(work.id)} items={links} />
          <div style={{ marginTop: "0.8rem" }}>
            <DonationCTA location="work_page" />
          </div>
        </div>
      </section>

      {embed && (
        <section className="work-section">
          <h2 className="work-section-title">試聴する</h2>
          <div className="work-embed">
            <iframe
              src={embed}
              width="100%"
              height="152"
              frameBorder="0"
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              title={`${work.title} 試聴`}
            />
          </div>
          <p className="work-embed-note">気に入ったら、上のボタンから各ストアでお楽しみください。</p>
        </section>
      )}

      {countNote && (
        <section className="work-section">
          <h2 className="work-section-title">伯爵の言葉</h2>
          <p className="work-notes">{countNote}</p>
        </section>
      )}

      {notes && (
        <section className="work-section">
          <h2 className="work-section-title">作品について</h2>
          <p className="work-notes">{notes}</p>
        </section>
      )}

      {tracks.length > 0 && (
        <section className="work-section">
          <h2 className="work-section-title">収録曲</h2>
          <ul className="work-tracks">
            {tracks.map((tr, i) => (
              <li key={`${tr.n ?? i}-${tr.title}`}>
                <span className="work-track-n">{tr.n ?? i + 1}</span>
                <span>{tr.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {related.length > 0 && (
        <section className="work-section">
          <h2 className="work-section-title">関連する作品</h2>
          <div className="work-related-grid">
            {related.map((w) => (
              <Link
                key={String(w.id)}
                href={`/works/${encodeURIComponent(String(w.id))}`}
                className="work-related-card"
              >
                <div className="work-related-cover">
                  {w.cover && (
                    <Image
                      src={w.cover}
                      alt={`${w.title} カバー`}
                      fill
                      sizes="160px"
                      style={{ objectFit: "cover" }}
                    />
                  )}
                </div>
                <div className="work-related-title">{w.title}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="work-cross">
        <p className="work-cross-text">
          この世界観の音楽を、あなたのブランド・店舗・コンテンツのためにも。
        </p>
        <div className="work-cross-row">
          <Link href="/business" className="contact-cta contact-cta--primary">
            楽曲制作を依頼する
          </Link>
          <Link href="/oracle" className="contact-cta contact-cta--ghost">
            今日の御籤を引く
          </Link>
        </div>
      </section>
    </main>
  );
}
