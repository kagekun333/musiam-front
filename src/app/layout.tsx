import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter, Noto_Serif_JP } from "next/font/google";
import GlobalBackground from "@/components/GlobalBackground";
import Nav from "@/components/Nav";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

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

export const metadata: Metadata = {
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
  },
  twitter: {
    card: "summary",
    title: "伯爵 MUSIAM",
    description: "占い・展示・対話の3つの門からなる神秘の館。今日の運命を御籤で読み解こう。",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${inter.variable} ${notoSerif.variable} antialiased`}>
        <GlobalBackground />
        <Nav />
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
