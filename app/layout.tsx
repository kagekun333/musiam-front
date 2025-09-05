import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@/components/Analytics";

export const metadata: Metadata = {
  title: "MUSIAM",
  description: "音×意識のミュージアム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-white text-black">
        <nav className="flex gap-6 p-4 border-b sticky top-0 bg-white/80 backdrop-blur">
          <a href="/" className="hover:underline">Home</a>
          <a href="/about" className="hover:underline">About</a>
          <a href="/events" className="hover:underline">Events</a>
          <a href="/rooms" className="hover:underline">Rooms</a>
        </nav>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
