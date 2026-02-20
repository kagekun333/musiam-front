import type { Metadata } from "next";
import "./globals.css";
import { Inter, Noto_Serif_JP } from "next/font/google";
import GlobalBackground from "@/components/GlobalBackground";
import Nav from "@/components/Nav";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const notoSerif = Noto_Serif_JP({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "伯爵 MUSIAM",
  description: "伯爵御籤 — 和紙×麻の葉×ランク色",
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


