"use client";
import { useMemo, useState } from "react";
import type { GateItem, GatesManifest } from "@/types/gates";
import GateCard from "@/components/GateCard";
import gatesData from "@/../public/gates/manifest.json";

type SortKey = GatesManifest["defaultSort"];

export default function GatesGrid() {
  const allItems = (gatesData as GatesManifest).items as GateItem[];

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>((gatesData as GatesManifest).defaultSort || "order");
  const [tag, setTag] = useState<string>("");

  const tags = useMemo(() => {
    const s = new Set<string>();
    for (const it of allItems) (it.tags || []).forEach((t) => s.add(t));
    return Array.from(s).sort((a, b) => a.localeCompare(b, "ja"));
  }, [allItems]);

  const filtered = useMemo(() => {
    let arr = allItems.slice();

    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      arr = arr.filter((it) =>
        [it.title, it.description, ...(it.tags || [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle)
      );
    }

    if (tag) {
      arr = arr.filter((it) => (it.tags || []).includes(tag));
    }

    arr.sort((a, b) => {
      if (sort === "order") return (a.order ?? 0) - (b.order ?? 0);
      if (sort === "title") return a.title.localeCompare(b.title, "ja");
      if (sort === "createdAt" || sort === "updatedAt") {
        return new Date(b[sort] ?? 0).getTime() - new Date(a[sort] ?? 0).getTime();
      }
      return 0;
    });

    return arr;
  }, [allItems, q, sort, tag]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="検索：タイトル/説明/タグ"
          className="flex-1 min-w-[220px] rounded-xl border px-3 py-2"
        />
        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          className="rounded-xl border px-3 py-2"
        >
          <option value="">タグ（すべて）</option>
          {tags.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-xl border px-3 py-2"
        >
          <option value="order">並び順</option>
          <option value="title">タイトル</option>
          <option value="createdAt">作成日(新→旧)</option>
          <option value="updatedAt">更新日(新→旧)</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
        {filtered.map((item) => (
          <GateCard key={`${item.title}-${item.file}`} item={item} />
        ))}
      </div>
    </div>
  );
}
