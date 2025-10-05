// src/components/GatesLanding.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { track } from "@/lib/metrics"; // 既に追加済み（なければ前の手順で作成済み）

type GateItem = {
  file: string;
  title?: string;
  description?: string;
  tags?: string[];
  order?: number;
};
type GatesManifest = { items: GateItem[] };

// “正典”3門（hrefはコード側で管理：manifestは触らない）
const CANON = [
  { file: "torii.jpg",       href: "/oracle",     title: "占いの門（Oracle Gate）",    desc: "運命を読み、道をひらく。",   tags: ["torii","oracle"],      order: 30 },
  { file: "galaxy.jpg",      href: "/exhibition", title: "展示の門（Exhibition Gate）", desc: "無限の展示が、あなたを待つ。", tags: ["exhibition","cosmic"], order: 20 },
  { file: "gothic-door.jpg", href: "/chat",       title: "伯爵の門（Count’s Gate）",   desc: "館の大扉、選ばれし者を迎える。", tags: ["count","gate"],        order: 10 },
] as const;

const CANON_META: Record<string, { href: string; title: string; desc: string; tags: string[]; order: number }> =
  Object.fromEntries(CANON.map(c => [c.file, { href: c.href, title: c.title, desc: c.desc, tags: [...c.tags], order: c.order }]));

export default function GatesLanding() {
  const [items, setItems] = useState<GateItem[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/gates/manifest.json", { cache: "no-store" });
        const data: GatesManifest = await res.json().catch(() => ({ items: [] }));
        if (!alive) return;

        // manifest を“正典”にマージ（不足は正典で補完）→ いつでも3枚出る
        const byFile = new Map((data.items ?? []).map(it => [it.file, it]));
        const merged: GateItem[] = CANON.map(c => {
          const x = byFile.get(c.file);
          return {
            file: c.file,
            title: x?.title ?? CANON_META[c.file].title,
            description: x?.description ?? CANON_META[c.file].desc,
            tags: x?.tags ?? [...CANON_META[c.file].tags],  // readonly → 可変 string[] に揃える
            order: x?.order ?? CANON_META[c.file].order,
          };
        }).sort((a, b) => (b.order ?? 0) - (a.order ?? 0));

        setItems(merged);
      } catch {
        // 取得失敗でも正典だけで描画
        const fallback: GateItem[] = CANON.map(c => ({
          file: c.file,
          title: CANON_META[c.file].title,
          description: CANON_META[c.file].desc,
          tags: [...CANON_META[c.file].tags],
          order: CANON_META[c.file].order,
        }));
        setItems(fallback);
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-6 pt-16 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide">3 GATES</h1>
      </div>

      <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((g) => {
          const meta = CANON_META[g.file];
          const href = meta?.href ?? "#";
          const title = g.title ?? meta?.title ?? "";

          return (
            <li
              key={g.file}
              className="rounded-3xl border border-white/10 bg-black/20 backdrop-blur-sm p-4 shadow-lg transition-transform hover:scale-[1.01]"
            >
              <Link
                href={href}
                className="block focus:outline-none focus:ring-2 focus:ring-white/30 rounded-2xl"
                onClick={() => track("gate_click", { file: g.file, to: href })}
              >
                <div className="relative mb-4 aspect-square overflow-hidden rounded-2xl">
                  <Image
                    src={`/gates/${g.file}`}
                    alt={title}
                    fill
                    sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 33vw"
                    className="object-cover"
                    priority={false}
                  />
                </div>

                <h3 className="text-lg md:text-xl font-semibold">{title}</h3>

                {(g.description ?? meta?.desc) && (
                  <p className="mt-1 text-sm text-white/70">{g.description ?? meta?.desc}</p>
                )}

                {(g.tags?.length ?? meta?.tags?.length ?? 0) > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(g.tags ?? meta.tags).map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs text-white/80"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

