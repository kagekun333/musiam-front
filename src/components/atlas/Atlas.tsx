"use client";
// src/components/atlas/Atlas.tsx
// アトラス（F2）: トップの「地図/探索の入口」。350作品＝国土を地方ごとに巡る。
// - /api/atlas を1回取得。地方カード（記号＋等高線）を並べ、選ぶと名所/最新/巡る入口を開く。
// - 作品リンクは内部 /works/[id]（領内に留める）。/works 索引への導線も残す（SEO資産）。
// - 既存トップを壊さず“被せる”追加セクション。失敗時は無音で消える。

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { track as metric } from "@/lib/metrics";
import "./atlas.css";

type Landmark = { id: string; title: string; cover: string; href: string };
type Region = {
  id: string;
  ja: string;
  en: string;
  glyph: string;
  blurb: string;
  accent: "amber" | "slate";
  count: number;
  landmark: Landmark | null;
  newest: Landmark | null;
  sample: Landmark[];
};
type AtlasData = { ok: boolean; totalWorks: number; totalRegions: number; regions: Region[] };

export default function Atlas() {
  const [data, setData] = useState<AtlasData | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/atlas", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as AtlasData;
        if (alive) setData(j);
      } catch {
        /* 失敗時は無音で消える */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!data?.regions?.length) return null;

  const open = data.regions.find((r) => r.id === openId) || null;

  const select = (id: string) => {
    setOpenId((cur) => {
      const next = cur === id ? null : id;
      if (next) metric("atlas_region_open", { region: next });
      return next;
    });
  };

  return (
    <section className="rnv-atlas" aria-label="領土アトラス — 作品の国を巡る">
      <header className="rnv-atlas__head">
        <p className="rnv-atlas__kicker rnv-rune">ATLAS · 領土</p>
        <h2 className="rnv-atlas__title rnv-realm-title">作品でできた国を、巡る</h2>
        <p className="rnv-atlas__lede">
          {data.totalWorks}の作品が{data.totalRegions}の地方をかたちづくる。気になる土地から歩きはじめてください。
        </p>
      </header>

      <ul className="rnv-atlas__grid" role="list">
        {data.regions.map((r) => {
          const isOpen = r.id === openId;
          return (
            <li key={r.id}>
              <button
                type="button"
                className={`rnv-atlas__region rnv-contours rnv-breathe ${isOpen ? "is-open" : ""}`}
                data-accent={r.accent}
                aria-expanded={isOpen}
                onClick={() => select(r.id)}
              >
                <span className={`rnv-mark ${r.accent === "slate" ? "rnv-mark--new" : ""} rnv-atlas__glyph`} aria-hidden="true">
                  {r.glyph}
                </span>
                <span className="rnv-atlas__names">
                  <span className="rnv-atlas__ja rnv-realm-title">{r.ja}</span>
                  <span className="rnv-atlas__en rnv-rune">{r.en}</span>
                </span>
                <span className="rnv-atlas__count rnv-rune">{r.count}</span>
                <span className="rnv-atlas__blurb">{r.blurb}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {open && (
        <div className="rnv-atlas__detail rnv-panel" role="region" aria-label={`${open.ja} の見どころ`}>
          <div className="rnv-atlas__detail-head">
            <span className="rnv-atlas__detail-glyph rnv-mark" aria-hidden="true" data-accent={open.accent}>
              {open.glyph}
            </span>
            <div>
              <h3 className="rnv-atlas__detail-title rnv-realm-title">{open.ja}</h3>
              <p className="rnv-atlas__detail-blurb">{open.blurb}</p>
            </div>
            <Link href="/works" className="rnv-atlas__index" onClick={() => metric("atlas_to_works", { region: open.id })}>
              全作品の索引へ
            </Link>
          </div>

          <div className="rnv-atlas__features">
            {open.landmark && (
              <AtlasCard label="名所（代表作）" item={open.landmark} regionId={open.id} kind="landmark" />
            )}
            {open.newest && open.newest.id !== open.landmark?.id && (
              <AtlasCard label="最近ひらかれた土地" item={open.newest} regionId={open.id} kind="newest" />
            )}
          </div>

          {open.sample.length > 0 && (
            <ul className="rnv-atlas__sample" role="list">
              {open.sample.map((s) => (
                <li key={s.id}>
                  <Link
                    href={s.href}
                    className="rnv-atlas__sample-item rnv-breathe"
                    onClick={() => metric("atlas_work_open", { region: open.id, id: s.id })}
                  >
                    <span className="rnv-atlas__sample-cover">
                      <Image src={s.cover} alt="" fill sizes="84px" className="rnv-atlas__sample-img" />
                    </span>
                    <span className="rnv-atlas__sample-title">{s.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function AtlasCard({
  label,
  item,
  regionId,
  kind,
}: {
  label: string;
  item: Landmark;
  regionId: string;
  kind: string;
}) {
  return (
    <Link
      href={item.href}
      className="rnv-atlas__feature rnv-breathe"
      onClick={() => metric("atlas_work_open", { region: regionId, id: item.id, kind })}
    >
      <span className="rnv-atlas__feature-cover">
        <Image src={item.cover} alt="" fill sizes="120px" className="rnv-atlas__feature-img" />
      </span>
      <span className="rnv-atlas__feature-meta">
        <span className="rnv-atlas__feature-label rnv-rune">{label}</span>
        <span className="rnv-atlas__feature-title rnv-sovereign">{item.title}</span>
      </span>
    </Link>
  );
}
