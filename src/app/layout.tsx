// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Inter, Noto_Serif_JP } from "next/font/google";
import React from "react";
import { Analytics } from "@vercel/analytics/react";
import PostHogInit from "@/components/analytics/PostHogInit";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const notoSerif = Noto_Serif_JP({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://hakusyaku.xyz"),
  title: { default: "伯爵 MUSIAM", template: "%s｜伯爵 MUSIAM" },
  description: "三つの門で、アート・AI・意識を起動する。",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://hakusyaku.xyz/",
    siteName: "伯爵 MUSIAM",
    title: "伯爵 MUSIAM",
    description: "三つの門で、アート・AI・意識を起動する。",
    images: [{ url: "/og-musiam.jpg", width: 1200, height: 630, alt: "伯爵 MUSIAM" }],
    locale: "ja_JP",
  },
  icons: { icon: "/favicon.ico" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: "https://hakusyaku.xyz/",
    name: "伯爵 MUSIAM",
    alternateName: ["伯爵MUSIAM", "Hakusyaku MUSIAM", "MUSIAM"],
    inLanguage: "ja",
  };
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "伯爵 MUSIAM",
    url: "https://hakusyaku.xyz/",
    logo: "https://hakusyaku.xyz/brand/abi-seal.png",
    sameAs: [
      "https://x.com/CountABI",
      "https://www.youtube.com/@CountABI",
      "https://github.com/kagekun333",
    ],
  };

  return (
    <html lang="ja">
      <body className={`${inter.variable} ${notoSerif.variable} bg-zinc-100 text-zinc-900 antialiased`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }} />

        <PostHogInit />
        {/* ← ここで “包む”。children を Providers でラップ */}
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
