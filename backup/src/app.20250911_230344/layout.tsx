// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Analytics } from "@/lib/analytics";  // ← 正しい方だけ残す

export const metadata: Metadata = {
  title: "MUSIAM",
  description: "音×意識のミュージアム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-white text-black">
        <nav className="flex gap-6 p-4 border-b sticky top-0 bg-white/80 backdrop-blur">
          <Link href="/" className="hover:underline">Home</Link>
          <Link href="/about" className="hover:underline">About</Link>
          <Link href="/events" className="hover:underline">Events</Link>
          <Link href="/rooms" className="hover:underline">Rooms</Link>
        </nav>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
