// src/app/sitemap.ts — App Router metadata 規約 (/sitemap.xml を自動生成)
// 静的ルート + 307作品の個別ページを検索エンジンに通知する。
import type { MetadataRoute } from "next";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import { siteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/oracle/omikuji`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/exhibition`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/chat`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/business`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];

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

  return [...staticRoutes, ...workRoutes];
}
