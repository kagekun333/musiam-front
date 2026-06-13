// src/lib/site-url.ts
// 本番URLの一元化。Vercel本番では NEXT_PUBLIC_SITE_URL を https://www.hakusyaku.xyz に設定。
export function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && !env.includes("localhost")) return env.replace(/\/$/, "");
  return "https://www.hakusyaku.xyz";
}
