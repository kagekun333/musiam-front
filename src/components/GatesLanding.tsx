"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">展示の門（Exhibition Gates）</h1>
        <Link
          href="/gates"
          className="rounded-xl bg-black px-4 py-2 text-white hover:opacity-90"
        >
          全ての展示を見る
        </Link>
      </div>

      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((g) => (
          <li key={g.file} className="rounded-2xl border p-4">
            <div className="relative mb-3 aspect-square overflow-hidden rounded-xl">
              <Image
                src={`/gates/${g.file}`}
                alt={g.title}
                fill
                sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 33vw"
                className="object-cover"
                priority={false}
              />
            </div>
            <h3 className="text-lg font-semibold">{g.title}</h3>
            {g.description && (
              <p className="mt-1 text-sm text-gray-600">{g.description}</p>
            )}
            {g.tags?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {g.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-gray-100 px-2 py-1 text-xs"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
