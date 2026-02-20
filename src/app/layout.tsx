import type { Metadata } from "next";
import "./globals.css";
import { Inter, Noto_Serif_JP } from "next/font/google";
import GlobalBackground from "@/components/GlobalBackground";
import Nav from "@/components/Nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const notoSerif = Noto_Serif_JP({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "伯爵 MUSIAM",
  description: "伯爵MUSIAMは、占い・展示・対話の3つの門からなる神秘の館です。今日の運命を御籤で読み解き、音楽や物語の世界へ。",
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
      </body>
    </html>
  );
}


