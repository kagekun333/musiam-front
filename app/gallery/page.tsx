// app/gallery/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

type Kind = "音楽" | "本" | "空撮";
type Item = {
  id: string;
  title: string;
  kind: Kind;
  img?: string;        // 任意。無い場合はグラデ背景
  tag?: string;
  buy?: string;        // 購入リンク
  listen?: string;     // 再生リンク
  read?: string;       // 読むリンク
};

const ITEMS: Item[] = [
  {
    id: "m1",
    title: "Cosmic Sync",
    kind: "音楽",
    img: "/gallery/01.jpg",
    tag: "Trance",
    buy: "#",
    listen: "#",
  },
  {
    id: "m2",
    title: "WARLESS: Chapter I",
    kind: "音楽",
    img: "/gallery/02.jpg",
    tag: "Cinematic",
    buy: "#",
    listen: "#",
  },
  {
    id: "b1",
    title: "アインシュタインおじさんのパンテイズム",
    kind: "本",
    img: "/gallery/03.jpg",
    tag: "Essay",
    buy: "#",
    read: "#",
  },
  {
    id: "p1",
    title: "Ishigaki Aerial #01",
    kind: "空撮",
    img: "/gallery/04.jpg",
    tag: "Aerial",
    buy: "#",
    read: "#",
  },
  {
    id: "p2",
    title: "BlueLoop Diagram",
    kind: "本",
    img: "/gallery/05.jpg",
    tag: "Whitepaper",
    buy: "#",
    read: "#",
  },
  {
    id: "m3",
    title: "BigBang Temple Anthem",
    kind: "音楽",
    img: "/gallery/06.jpg",
    tag: "Anthem",
    buy: "#",
    listen: "#",
  },
  {
    id: "p3",
    title: "Ryukyu Bonsai #07",
    kind: "空撮",
    img: "/gallery/07.jpg",
    tag: "Art",
    buy: "#",
    read: "#",
  },
  {
    id: "b2",
    title: "十四日目の証人",
    kind: "本",
    img: "/gallery/08.jpg",
    tag: "SF × 法廷",
    buy: "#",
    read: "#",
  },
  {
    id: "m4",
    title: "Reverse the Sun",
    kind: "音楽",
    img: "/gallery/09.jpg",
    tag: "EDM",
    buy: "#",
    listen: "#",
  },
];

export default function Gallery() {
  const [filter, setFilter] = useState<Kind | "ALL">("ALL");

  const filtered = ITEMS.filter((it) => filter === "ALL" || it.kind === filter);

  return (
    <main className="min-h-[100dvh] bg-black text-white">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14 md:py-20">
        {/* Header */}
        <header className="mb-8 sm:mb-10 md:mb-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold sm:text-4xl">🖼 展示</h1>
            <p className="mt-2 text-white/70 text-sm">
              代表作を9点だけ抜粋。買う／聴く／読む をワンクリで。
            </p>
          </div>
          {/* Filter */}
          <div className="flex flex-wrap gap-2">
            {(["ALL", "音楽", "本", "空撮"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-full text-xs border transition ${
                  filter === k
                    ? "bg-white text-black border-white"
                    : "border-white/30 text-white/85 hover:bg-white/10"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </header>

        {/* Grid */}
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((it) => (
            <li key={it.id} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 ring-1 ring-white/10 hover:ring-white/20">
              <CardMedia title={it.title} img={it.img} />
              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base sm:text-lg font-semibold">{it.title}</h3>
                  <span className="text-[10px] uppercase tracking-wider text-white/60">
                    {it.kind}
                  </span>
                </div>
                {it.tag && (
                  <div className="mt-1 text-xs text-white/60">{it.tag}</div>
                )}

                {/* CTAs */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {it.buy && (
                    <Link
                      href={it.buy}
                      className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-white/90"
                    >
                      買う →
                    </Link>
                  )}
                  {it.listen && (
                    <Link
                      href={it.listen}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
                    >
                      聴く →
                    </Link>
                  )}
                  {it.read && (
                    <Link
                      href={it.read}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/20 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
                    >
                      読む →
                    </Link>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Footer nav */}
        <div className="mt-10 text-center text-xs text-white/60">
          <Link href="/" className="hover:underline">三つの扉</Link>
          <span className="mx-2">·</span>
          <Link href="/home-legacy" className="hover:underline">旧ホーム</Link>
        </div>
      </section>
    </main>
  );
}

function CardMedia({ title, img }: { title: string; img?: string }) {
  // imgが無ければグラデ背景を表示
  return (
    <div className="relative h-52 w-full sm:h-60 md:h-64">
      {img ? (
        <img
          src={img}
          alt={title}
          className="h-full w-full object-cover"
          loading="eager"
          decoding="async"
        />
      ) : (
        <div
          aria-hidden
          className="h-full w-full bg-gradient-to-br from-indigo-900 via-fuchsia-900/70 to-cyan-900"
        />
      )}
      {/* 光のかぶり＆粒子 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-screen opacity-35"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% -20%, rgba(255,255,255,0.25), transparent 60%), url('data:image/svg+xml;utf8, %3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%228%22 height=%228%22 viewBox=%220 0 8 8%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.04%22%3E%3Ccircle cx=%221%22 cy=%221%22 r=%221%22/%3E%3C/g%3E%3C/svg%3E')",
          backgroundSize: "cover, 8px 8px",
        }}
      />
    </div>
  );
}
