"use client";
// /works カタログのフィルタ・検索UI (クライアント)
// exhibition.tsx には触れず、新規ルート上で軽量な一覧を提供する。
import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { track } from "@/lib/metrics";
import "./works-catalog.css";

export type CatalogItem = {
  id: string;
  title: string;
  cover: string;
  type: "music" | "book" | "other";
  tags: string[];
};

type Filter = "all" | "music" | "book";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "すべて" },
  { key: "music", label: "音楽" },
  { key: "book", label: "本" },
];

export default function WorksCatalog({ items }: { items: CatalogItem[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(
    () => ({
      all: items.length,
      music: items.filter((w) => w.type === "music").length,
      book: items.filter((w) => w.type === "book").length,
    }),
    [items]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((w) => {
      if (filter !== "all" && w.type !== filter) return false;
      if (!q) return true;
      if (w.title.toLowerCase().includes(q)) return true;
      return w.tags.some((t) => t.toLowerCase().includes(q));
    });
  }, [items, filter, query]);

  return (
    <div className="catalog">
      <div className="catalog-controls">
        <div className="catalog-filters" role="tablist" aria-label="種別で絞り込み">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              className={filter === f.key ? "catalog-chip catalog-chip--on" : "catalog-chip"}
              onClick={() => {
                setFilter(f.key);
                track("works_filter", { filter: f.key });
              }}
            >
              {f.label}
              <span className="catalog-chip-count">{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <input
          type="search"
          className="catalog-search"
          placeholder="作品名・タグで検索"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="作品を検索"
        />
      </div>

      <p className="catalog-count" aria-live="polite">
        {visible.length} 作品
      </p>

      {visible.length === 0 ? (
        <p className="catalog-empty">該当する作品が見つかりませんでした。</p>
      ) : (
        <ul className="catalog-grid">
          {visible.map((w) => (
            <li key={w.id}>
              <Link
                href={`/works/${encodeURIComponent(w.id)}`}
                className="catalog-card"
                onClick={() => track("works_card_click", { workId: w.id })}
              >
                <div className="catalog-cover">
                  {w.cover ? (
                    <Image
                      src={w.cover}
                      alt={`${w.title} カバー`}
                      fill
                      sizes="(max-width:640px) 45vw, 200px"
                      style={{ objectFit: "cover" }}
                      loading="lazy"
                    />
                  ) : (
                    <span className="catalog-cover-fallback">
                      {w.type === "music" ? "♪" : "✦"}
                    </span>
                  )}
                  <span className="catalog-type-badge">
                    {w.type === "music" ? "Music" : w.type === "book" ? "Book" : "Work"}
                  </span>
                  <span className="catalog-hover-hint">
                    {w.type === "music" ? "▶ 試聴・聴く" : w.type === "book" ? "読む" : "見る"}
                  </span>
                </div>
                <div className="catalog-card-title">{w.title}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
