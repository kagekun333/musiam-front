import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter, Noto_Serif_JP } from "next/font/google";
import GlobalBackground from "@/components/GlobalBackground";
import Nav from "@/components/Nav";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import AnalyticsInit from "@/components/AnalyticsInit";
import { organizationJsonLd, webSiteJsonLd } from "@/lib/entity";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const notoSerif = Noto_Serif_JP({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
    { media: "(prefers-color-scheme: light)", color: "#0a0a0f" },
  ],
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  viewportFit: "cover",
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes("localhost")
    ? process.env.NEXT_PUBLIC_SITE_URL
    : "https://www.hakusyaku.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "伯爵 MUSIAM",
  description: "伯爵MUSIAMは、占い・展示・対話の3つの門からなる神秘の館です。今日の運命を御籤で読み解き、音楽や物語の世界へ。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MUSIAM",
    startupImage: [
      {
        url: "/icons/icon-512x512.png",
        media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  openGraph: {
    title: "伯爵 MUSIAM",
    description: "占い・展示・対話の3つの門からなる神秘の館。今日の運命を御籤で読み解こう。",
    type: "website",
    images: [{ url: "/brand/og-default.jpg", width: 1200, height: 630, alt: "伯爵 MUSIAM" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "伯爵 MUSIAM",
    description: "占い・展示・対話の3つの門からなる神秘の館。今日の運命を御籤で読み解こう。",
    images: ["/brand/og-default.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        {/* AI認知: 全ページ共通の実体定義 (Organization / WebSite) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd()) }}
        />
      </head>
      <body className={`${inter.variable} ${notoSerif.variable} antialiased`}>
        {process.env.NODE_ENV !== "production" && (
          // 開発時のみ: 古いService Workerが_next/staticの旧チャンクを
          // Cache Firstで配信してReactを壊すため、Reactに依存せず
          // SW解除+キャッシュ全削除+1回だけ再読込する自己修復スクリプト。
          <script
            dangerouslySetInnerHTML={{
              __html: `
(function(){
  if(!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.getRegistrations().then(function(rs){
    var had = rs.length > 0;
    Promise.all(rs.map(function(r){ return r.unregister(); })).then(function(){
      if(!("caches" in window)) { if(had) location.reload(); return; }
      caches.keys().then(function(ks){
        return Promise.all(ks.map(function(k){ return caches.delete(k); }));
      }).then(function(){ if(had) location.reload(); });
    });
  });
})();`,
            }}
          />
        )}
        <GlobalBackground />
        <Nav />
        {children}
        <ServiceWorkerRegistration />
        <AnalyticsInit />
      </body>
    </html>
  );
}
