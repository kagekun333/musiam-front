// src/app/works/page.tsx — 作品カタログ index (307作品の内部リンクハブ / SEO)
// 既存の exhibition.tsx には触れず、新規ルートで軽量な一覧を提供する。
import type { Metadata } from "next";
import Link from "next/link";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import { dedupeWorks } from "@/lib/dedupeWorks";
import { siteUrl } from "@/lib/site-url";
import WorksCatalog, { type CatalogItem } from "./WorksCatalog";

export const metadata: Metadata = {
  title: "展示 — 作品カタログ | 伯爵 MUSIAM",
  description:
    "伯爵MUSIAMのオリジナル音楽・本のすべて。307作品を種別・キーワードで探せる展示室。",
  alternates: { canonical: `${siteUrl()}/works` },
  openGraph: {
    title: "作品カタログ | 伯爵 MUSIAM",
    description: "伯爵MUSIAMのオリジナル音楽・本のすべて。307作品を種別・キーワードで探せます。",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "作品カタログ | 伯爵 MUSIAM",
    description: "伯爵MUSIAMのオリジナル音楽・本のすべて。307作品を種別・キーワードで探せます。",
  },
};

function typeKey(type?: string): CatalogItem["type"] {
  const t = String(type || "").toLowerCase();
  if (t.includes("music")) return "music";
  if (t.includes("book")) return "book";
  return "other";
}

export default async function WorksIndexPage() {
  const all = dedupeWorks(await loadMergedWorksServer());
  const items: CatalogItem[] = all
    .filter((w) => w.id != null && w.title)
    .map((w) => ({
      id: String(w.id),
      title: String(w.title),
      cover: w.cover ?? "",
      type: typeKey(w.type),
      tags: [...(w.moodTags ?? []), ...(w.tags ?? [])].slice(0, 12),
    }));

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

      <WorksCatalog items={items} />
    </main>
  );
}
