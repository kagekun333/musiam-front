"use client";
// src/components/broadcast/BroadcastBar.tsx
// 放送（F1）: 全ページ下部に常駐する「今、領内に流れている一曲」バー。
// - /api/now-playing から時間バケットの一曲を取得。バケットが変わると自動で移ろう。
// - 音声の自動再生はしない（試聴音源が無いため）。一click で配信へ（聴く摩擦ゼロ）。
// - 折りたたみ/再開はローカル保存。reduced-motion を尊重。
// - 既存レイアウトを壊さないよう fixed・pointer-events 最小で重ねる。

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { track as metric } from "@/lib/metrics";
import "./broadcast-bar.css";

type NowTrack = {
  id: string;
  title: string;
  cover: string;
  href: string;
  spotify?: string;
  appleMusic?: string;
  moodTags: string[];
};
type NowPlaying = {
  ok: boolean;
  bucket: number;
  nextInSec: number;
  realm: string;
  now: NowTrack | null;
  next: NowTrack | null;
};

const STORAGE_KEY = "musiam:broadcast:collapsed";

export default function BroadcastBar() {
  const [data, setData] = useState<NowPlaying | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 折りたたみ状態を復元（SSR不一致を避けるため mount 後に反映）。
  useEffect(() => {
    setMounted(true);
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* no-op */
    }
  }, []);

  const fetchNow = useCallback(async () => {
    try {
      const r = await fetch("/api/now-playing", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as NowPlaying;
      setData(j);
      // 次のバケット境界 +1s で再取得（放送が移ろう）。
      if (timerRef.current) clearTimeout(timerRef.current);
      const wait = Math.min(Math.max(j.nextInSec, 5), 600) * 1000 + 1000;
      timerRef.current = setTimeout(fetchNow, wait);
    } catch {
      // 失敗時は無音で消える（ページを汚さない）。30秒後に再試行。
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(fetchNow, 30_000);
    }
  }, []);

  useEffect(() => {
    fetchNow();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchNow]);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* no-op */
      }
      metric("broadcast_toggle", { collapsed: next });
      return next;
    });
  }, []);

  if (!mounted || !data?.now) return null;
  const t = data.now;
  const listenHref = t.spotify || t.appleMusic || t.href;

  if (collapsed) {
    return (
      <button
        type="button"
        className="rnv-broadcast-fab"
        onClick={toggle}
        aria-label="放送をひらく（今、領内に流れている一曲）"
        title="放送をひらく"
      >
        <span className="rnv-broadcast-fab__pulse" aria-hidden="true" />
        <span className="rnv-broadcast-fab__glyph rnv-rune" aria-hidden="true">♪</span>
      </button>
    );
  }

  return (
    <aside className="rnv-broadcast" aria-label="放送：今、領内に流れている一曲" role="complementary">
      <div className="rnv-broadcast__inner">
        <a
          href={listenHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rnv-broadcast__cover rnv-breathe"
          onClick={() => metric("broadcast_listen", { id: t.id, via: "cover" })}
          aria-label={`${t.title} を聴く`}
        >
          <Image src={t.cover} alt="" fill sizes="56px" className="rnv-broadcast__img" />
          <span className="rnv-broadcast__eq" aria-hidden="true">
            <i /><i /><i />
          </span>
        </a>

        <div className="rnv-broadcast__meta">
          <span className="rnv-broadcast__label rnv-rune">NOW BROADCASTING · 今、領内に流れている一曲</span>
          <a
            href={listenHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rnv-broadcast__title rnv-sovereign"
            onClick={() => metric("broadcast_listen", { id: t.id, via: "title" })}
          >
            {t.title}
          </a>
          {t.moodTags.length > 0 && (
            <span className="rnv-broadcast__realm">{data.realm}</span>
          )}
        </div>

        <a
          href={listenHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rnv-broadcast__listen"
          onClick={() => metric("broadcast_listen", { id: t.id, via: "button" })}
        >
          聴く
        </a>

        <button
          type="button"
          className="rnv-broadcast__close"
          onClick={toggle}
          aria-label="放送を閉じる"
          title="放送を閉じる"
        >
          ×
        </button>
      </div>
    </aside>
  );
}
