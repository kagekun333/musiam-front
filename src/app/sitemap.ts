import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://hakusyaku.xyz";
  const now = new Date();

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/oracle/omikuji`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/exhibition`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
  ];
}
