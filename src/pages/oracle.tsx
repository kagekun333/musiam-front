// src/pages/oracle.tsx
import { useEffect, useMemo, useState } from "react";

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

// 疑似乱数（seed変えると並びが変わる）
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// スコアリング：タグ一致>新しさ>重み
function scoreOf(w: Work, want: string[]) {
  const tagHit = want.filter(t => w.tags?.includes(t)).length;
  const days = Math.max(1, (Date.now() - new Date(w.releasedAt).getTime()) / 86400000);
  const fresh = 1 / days; // 新しいほど高い
  const weight = (w.weight ?? 0) / 10;
  return tagHit * 10 + fresh + weight;
}

function pickTopN(all: Work[], want: string[], n: number, seed: number) {
  const rnd = mulberry32(seed);
  const scored = all.map(w => ({ w, s: scoreOf(w, want), r: rnd() })); // rでタイブレーク
  scored.sort((a, b) => b.s - a.s || a.r - b.r);
  return scored.slice(0, n).map(x => x.w);
}

function reasonLabel(w: Work, want: string[]) {
  if (want.some(t => w.tags?.includes(t))) return "タグ一致";
  const days = Math.max(1, (Date.now() - new Date(w.releasedAt).getTime()) / 86400000);
  if (days < 30) return "新着";
  return "人気";
}

export default function OraclePage() {
  const [all, setAll] = useState<Work[]>([]);
  const [seed, setSeed] = useState<number>(() => {
    const d = new Date();
    const base = Number(`${d.getFullYear()}${d.getMonth()+1}${d.getDate()}`);
    const vc = Number(localStorage.getItem("visitCount") || 0);
    return base + vc;
  });
  const [want, setWant] = useState<string[]>([]); // まずは空でOK

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/works/works.json", { cache: "no-store" });
        const j = await r.json();
        setAll(Array.isArray(j?.items) ? (j.items as Work[]) : []);
      } catch { setAll([]); }
    })();
  }, []);

  useEffect(() => {
    const vc = Number(localStorage.getItem("visitCount") || 0) + 1;
    localStorage.setItem("visitCount", String(vc));
  }, []);

  const top3 = useMemo(() => pickTopN(all, want, 3, seed), [all, want, seed]);

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Oracle</h1>
      <p className="opacity-80 mb-4">今日のヴァイブから、あなたに刺さる3作。</p>

      <div className="flex gap-2 mb-6">
        <button
          className="px-3 py-1 border rounded"
          onClick={() => setSeed(seed + 1)}
        >
          もう一度占う（reroll）
        </button>
      </div>

      <section className="grid md:grid-cols-3 gap-4">
        {top3.map((w) => (
          <article key={w.id} className="rounded-xl overflow-hidden border p-3">
            <img src={w.cover} alt={w.title} className="rounded mb-2" />
            <div className="text-xs inline-block px-2 py-0.5 border rounded mr-2">
              {reasonLabel(w, want)}
            </div>
            <h3 className="font-semibold mb-1">{w.title}</h3>
            <div className="text-xs opacity-70 mb-2">
              {w.tags?.map((t) => `#${t}`).join(" ")}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
