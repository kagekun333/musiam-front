"use client";
// src/app/realm/[region]/RegionGallery.tsx
// 地方の作品ギャラリー。音楽地方はジャンルの小部屋（フィルタ）を出す。媒体別テンプレを保持。
// 訪問時に地方の環境音へ連動（解錠済みなら鳴る・無ければ静寂）。
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { track as metric } from "@/lib/metrics";
import { setRegionAmbient } from "@/lib/realm/ambient";

type Medium = "music" | "book" | "film" | "other";
type RegionWork = { id: string; title: string; cover: string; href: string; medium: Medium; genres: string[] };

export default function RegionGallery({
  regionId,
  medium,
  works,
  cta,
  glyph,
}: {
  regionId: string;
  medium: Medium;
  works: RegionWork[];
  cta: string;
  glyph: string;
}) {
  const [genre, setGenre] = useState<string>("__all");

  useEffect(() => {
    // 解錠済みなら地方の環境音を流す（未解錠/ファイル無しは静か）
    setRegionAmbient(regionId);
  }, [regionId]);

  // 音楽地方のみジャンルの小部屋を出す
  const genres = useMemo(() => {
    if (medium !== "music") return [];
    const c = new Map<string, number>();
    for (const w of works) for (const g of w.genres) c.set(g, (c.get(g) || 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g).slice(0, 10);
  }, [works, medium]);

  const filtered = genre === "__all" ? works : works.filter((w) => w.genres.includes(genre));

  return (
    <>
      {genres.length > 1 && (
        <div className="rgn-genres" role="tablist" aria-label="ジャンルの小部屋">
          <button type="button" className={`rgn-chip ${genre === "__all" ? "is-on" : ""}`} onClick={() => setGenre("__all")}>
            すべて
          </button>
          {genres.map((g) => (
            <button
              key={g}
              type="button"
              className={`rgn-chip ${genre === g ? "is-on" : ""}`}
              onClick={() => {
                setGenre(g);
                metric("realm_genre", { region: regionId, genre: g });
              }}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      <ul className={`rgn-grid rgn-grid--${medium}`} role="list">
        {filtered.map((w) => (
          <li key={w.id}>
            <Link href={w.href} className="rgn-card">
              <span className="rgn-card-cover">
                <Image src={w.cover} alt={w.title} fill sizes="(max-width:640px) 40vw, 220px" className="rgn-card-img" />
                <span className="rgn-card-cta rnv-rune" aria-hidden="true">{glyph} {cta}</span>
              </span>
              <span className="rgn-card-title">{w.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
