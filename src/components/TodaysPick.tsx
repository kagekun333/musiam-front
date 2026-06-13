// src/components/TodaysPick.tsx
"use client";

import { useEffect, useState } from "react";
import "./todays-pick.css";

type PickResult = {
  ok: boolean;
  ymd: string;
  music: unknown | null;
  book: unknown | null;
  countWord: string;
};

export default function TodaysPick() {
  const [data, setData] = useState<PickResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/todays-pick?lang=ja", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as PickResult;
        if (alive) setData(j);
      } catch (e) {
        const err = e as Error;
        if (alive) setError(err?.message ?? "fetch failed");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    // 失敗時は無音で消える（ホームを汚さない）
    return null;
  }

  return (
    <section className="todays-wrap" aria-label="今日の一筆">
      <div className={`todays-panel${data ? "" : " is-loading"}`}>
        <div className="todays-inline">
          <h2 className="todays-title">
            <span className="todays-title-ja">今日の一筆</span>
            <span className="todays-title-en" aria-hidden="true">Today&apos;s Line</span>
          </h2>
          <p className="todays-countword">{data?.countWord ?? "\u00a0"}</p>
        </div>
      </div>
    </section>
  );
}
