// src/app/works/page.tsx — Live Runtime Catalog を使う作品カタログ index。
// Apple release overlay を含む最新公開作品を表示し、表示層だけ provider identity で重複を畳む。
import type { Metadata } from "next";
import Link from "next/link";
import { loadLiveMergedWorksServer } from "@/lib/loadLiveMergedWorksServer";
import { dedupeWorks } from "@/lib/dedupeWorks";
import { siteUrl } from "@/lib/site-url";
import WorksCatalog, { type CatalogItem } from "./WorksCatalog";
import "./works-page.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "展示 — 作品カタログ | 伯爵 MUSIAM",
  description:
    "伯爵MUSIAMのオリジナル音楽・本を、最新の公開カタログから種別・キーワードで探せる展示室。",
  alternates: { canonical: `${siteUrl()}/works` },
  openGraph: {
    title: "作品カタログ | 伯爵 MUSIAM",
    description: "伯爵MUSIAMのオリジナル音楽・本を最新の公開カタログから探せます。",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "作品カタログ | 伯爵 MUSIAM",
    description: "伯爵MUSIAMのオリジナル音楽・本を最新の公開カタログから探せます。",
  },
};

function typeKey(type?: string): CatalogItem["type"] {
  const t = String(type || "").toLowerCase();
  if (t.includes("music")) return "music";
  if (t.includes("book")) return "book";
  return "other";
}

export default async function WorksIndexPage() {
  const all = dedupeWorks(await loadLiveMergedWorksServer());
  const items: CatalogItem[] = all
    .filter((w) => w.id != null && w.title)
    .map((w) => ({
      id: String(w.id),
      title: String(w.title),
      cover: w.cover ?? "",
      type: typeKey(w.type),
      tags: [...(w.moodTags ?? []), ...(w.tags ?? [])].slice(0, 12),
      releasedAt: String(w.releasedAt ?? ""),
    }))
    // 新しいリリース順（releasedAt 降順）。日付なしは末尾。
    .sort((a, b) => (b.releasedAt || "").localeCompare(a.releasedAt || ""));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "作品カタログ | 伯爵 MUSIAM",
    url: `${siteUrl()}/works`,
    numberOfItems: items.length,
  };

  return (
    <main className="page-content">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="hero hero--tight" style={{ paddingBottom: "0.5rem" }}>
        <nav className="text-sm opacity-60" aria-label="パンくず" style={{ marginBottom: "0.5rem" }}>
          <Link href="/">ホーム</Link> / <span>作品カタログ</span>
        </nav>
        <h1 className="wordmark" aria-label="展示">
          <span className="wordmark-jp" style={{ fontSize: "1.8rem" }}>展示</span>
        </h1>
        <p className="hero-sub">
          全{items.length}作品。気になる一作から、聴いて・読んでみてください。
        </p>
      </section>

      <aside className="works-collector-preview" aria-label="全作品対応の受注生産メタルプリント相談">
        <div>
          <p>THE ENTIRE CATALOG · MADE TO ORDER</p>
          <h2>全{items.length}作品から、あなたの空間に残す一点を。</h2>
          <span>すべての作品を受注生産メタルプリントの相談対象として公開。伯爵が仕事場・家・ホテル・ウェルネス空間に合う作品を見立てます。</span>
        </div>
        <Link href="/chat?intent=metal-print&utm_source=works_index&utm_medium=owned&utm_campaign=all_catalog_metal&utm_content=all_works">
          全作品から伯爵に選んでもらう
        </Link>
        <small>一問から。購入義務なし。作品ごとの原画解像度・印刷適性・配送条件を確認後、正式Offerを発行します。</small>
      </aside>

      <WorksCatalog items={items} />
    </main>
  );
}
