// src/pages/exhibition.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/metrics";

type Work = {
  id: string;
  title: string;
  type: "music" | "video" | "art" | "book" | "article";
  cover: string;
  tags: string[];
  links?: Partial<Record<"listen" | "watch" | "read" | "nft", string>>;
  releasedAt: string;
  weight?: number;
  previewUrl?: string;
};

export default function ExhibitionPage() {
  const [items, setItems] = useState<Work[]>([]);
  const wow = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/works/works.json", { cache: "no-store" });
        const j = await r.json();
        setItems(Array.isArray(j?.items) ? (j.items as Work[]) : []);
      } catch {
        setItems([]);
      }
    })();
  }, []);

  // 新着優先 → weight
  const sorted = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      const ad = new Date(a.releasedAt).getTime();
      const bd = new Date(b.releasedAt).getTime();
      if (bd !== ad) return bd - ad;
      return (b.weight ?? 0) - (a.weight ?? 0);
    });
    return arr;
  }, [items]);

  const featured = sorted.find((w) => w.previewUrl) ?? sorted[0];

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Exhibition</h1>

      {/* WOW（自動再生＋計測） */}
      {featured && (
        <section className="mb-8 rounded-xl overflow-hidden border">
          {featured.previewUrl?.match(/\.(mp4|webm|mov|m4v)$/i) ? (
            <video
              src={featured.previewUrl!}
              muted
              autoPlay
              loop
              playsInline
              onPlay={() => {
                if (!wow.current) { track("wow_play", { id: featured.id }); wow.current = true; }
              }}
              className="w-full h-auto"
            />
          ) : featured.previewUrl?.match(/\.(mp3|wav|ogg)$/i) ? (
            <audio
              src={featured.previewUrl!}
              autoPlay
              loop
              onPlay={() => {
                if (!wow.current) { track("wow_play", { id: featured.id }); wow.current = true; }
              }}
              className="w-full"
            />
          ) : (
            <img src={featured.cover} alt={featured.title} className="w-full h-auto" />
          )}
          <div className="p-3 text-sm opacity-80">{featured.title}</div>
        </section>
      )}

      {/* 一覧（最小） */}
      <section className="grid md:grid-cols-3 gap-4">
        {sorted.map((w) => (
          <article key={w.id} className="rounded-xl overflow-hidden border">
            <img src={w.cover} alt={w.title} className="w-full h-auto" />
            <div className="p-3">
              <h3 className="font-semibold">{w.title}</h3>
              {w.tags?.length ? (
                <div className="text-xs opacity-70 mt-1">
                  {w.tags.map((t) => `#${t}`).join(" ")}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2 mt-2">
                {w.links?.listen && <a className="px-3 py-1 border rounded" target="_blank" href={w.links.listen}>Listen</a>}
                {w.links?.watch  && <a className="px-3 py-1 border rounded" target="_blank" href={w.links.watch}>Watch</a>}
                {w.links?.read   && <a className="px-3 py-1 border rounded" target="_blank" href={w.links.read}>Read</a>}
                {w.links?.nft    && <a className="px-3 py-1 border rounded" target="_blank" href={w.links.nft}>NFT</a>}
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
