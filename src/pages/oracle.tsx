import { useState } from "react";
import type { GatesManifest, GateItem } from "@/types/gates";
import gatesData from "@/../public/gates/manifest.json";
import GateCard from "@/components/GateCard";

function pickRandom(items: GateItem[], n: number): GateItem[] {
  const shuffled = items.slice().sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export default function OraclePage() {
  const allItems = (gatesData as GatesManifest).items as GateItem[];
  const [selection, setSelection] = useState<GateItem[]>(() => pickRandom(allItems, 3));

  return (
    <main className="container mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold">占いの門</h1>
        <p className="text-gray-600 mt-2">
          今日のあなたにおすすめの作品がこちらです。
        </p>
        <button
          onClick={() => setSelection(pickRandom(allItems, 3))}
          className="mt-4 inline-flex rounded-xl border px-4 py-2 hover:shadow transition"
        >
          もう一度占う
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {selection.map((item) => (
          <GateCard key={item.title + item.file} item={item} />
        ))}
      </div>
    </main>
  );
}
