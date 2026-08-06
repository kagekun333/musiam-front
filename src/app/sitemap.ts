// src/app/sitemap.ts — App Router metadata 規約 (/sitemap.xml を自動生成)
// 静的ルート + 307作品の個別ページを検索エンジンに通知する。
import type { MetadataRoute } from "next";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import { getLetters } from "@/lib/letters";
import { siteUrl } from "@/lib/site-url";
import { ATLAS_REGIONS, FRONTIER_REGION } from "@/lib/atlas/regions";
import { METAL_PRINT_VIP_EDITIONS } from "@/lib/metal-print-vip";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    // 占い撤退（2026-06）: /oracle/omikuji はサイトマップから除外（ルートは "/" へリダイレクト）。
    { url: `${base}/works`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/chat`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/business`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/office-art`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/office-art/tax-guide`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/office-art/size-guide`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    // 英語圏クラスタ (2026-08-06): 税制訴求に依存せず育てられるため、国内ベンダー確定を待たずに展開する。
    { url: `${base}/en/office-art`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${base}/en/office-art/size-guide`, lastModified: now, changeFrequency: "monthly", priority: 0.75 },
    { url: `${base}/shop`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/showcase`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/atelier`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/letters`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/vip-metal-print`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
  ];

  const metalPrintRoutes: MetadataRoute.Sitemap = METAL_PRINT_VIP_EDITIONS.map((edition) => ({
    url: `${base}/metal-print/${edition.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));
  const englishMetalPrintRoutes: MetadataRoute.Sitemap = METAL_PRINT_VIP_EDITIONS.map((edition) => ({
    url: `${base}/en/metal-print/${edition.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  // 地方ページ（没入ホームの各地方）
  const regionRoutes: MetadataRoute.Sitemap = [...ATLAS_REGIONS, FRONTIER_REGION].map((r) => ({
    url: `${base}/realm/${r.id}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  let letterRoutes: MetadataRoute.Sitemap = [];
  try {
    const letters = await getLetters();
    letterRoutes = letters.map((l) => ({
      url: `${base}/letters/${l.slug}`,
      lastModified: l.date ? new Date(l.date) : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    /* fail-silent */
  }

  let workRoutes: MetadataRoute.Sitemap = [];
  try {
    const works = await loadMergedWorksServer();
    workRoutes = works
      .filter((w) => w.id != null && w.title)
      .map((w) => ({
        url: `${base}/works/${encodeURIComponent(String(w.id))}`,
        lastModified: w.releasedAt ? new Date(w.releasedAt) : now,
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }));
  } catch {
    // works 読み込み失敗時は静的ルートのみ (fail-silent)
  }

  return [...staticRoutes, ...metalPrintRoutes, ...englishMetalPrintRoutes, ...regionRoutes, ...letterRoutes, ...workRoutes];
}
