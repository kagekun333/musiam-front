"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type GateItem = {
  file: string;
  title: string;
  description?: string;
  tags?: string[];
  order?: number;
  links?: Record<string, string>;
};
type GatesManifest = { items: GateItem[] };

export default function GatesLanding() {
  const [items, setItems] = useState<GateItem[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/gates/manifest.json", { cache: "no-store" });
        const data: GatesManifest = await res.json();
        if (!alive) return;
        const sorted = [...(data.items ?? [])].sort(
          (a, b) => (b.order ?? 0) - (a.order ?? 0)
        );
        setItems(sorted);
      } catch (e) {
        console.error("Failed to load gates manifest", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-6 pt-16 pb-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide">
          3 GATES
        </h1>
        {/* 右上の「全ての展示を見る」は撤去 */}
      </div>

      {/* Cards */}
      <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((g) => (
          <li
            key={g.file}
            className="rounded-3xl border border-white/10 bg-black/20 backdrop-blur-sm p-4 shadow-lg transition-transform hover:scale-[1.01]"
          >
            <div className="relative mb-4 aspect-square overflow-hidden rounded-2xl">
              <Image
                src={`/gates/${g.file}`}
                alt={g.title}
                fill
                sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 33vw"
                className="object-cover"
                priority={false}
              />
            </div>

            <h3 className="text-lg md:text-xl font-semibold">{g.title}</h3>

            {g.description && (
              <p className="mt-1 text-sm text-white/70">{g.description}</p>
            )}

            {g.tags?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {g.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/80"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  );
}
