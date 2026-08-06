"use client";
// src/components/broadcast/BroadcastBar.tsx
// 放送（F1）: 全ページ下部に常駐する「今のおすすめ曲」バー。
// - /api/now-playing から時間バケットの一曲を取得。バケットが変わると自動で移ろう。
// - 自動再生はしない(ブラウザの自動再生ポリシー・ユーザー操作尊重のため)が、
//   「聴く」を押すとSpotify公式埋め込みプレイヤーを展開する。公式IFrame APIの
//   playback_updateを購読し、実際に音声が流れている間だけ「再生中」と表示する。
//   Spotifyリンクが無い作品は、
//   従来通り配信ページへの直接リンクにフォールバックする。
// - 折りたたみ/再開はローカル保存。reduced-motion を尊重。
// - 既存レイアウトを壊さないよう fixed・pointer-events 最小で重ねる。

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { track as metric } from "@/lib/metrics";
import { getSpotifyEmbedUrl } from "@/lib/work-links";
import "./broadcast-bar.css";

type SpotifyPlaybackEvent = {
  data: {
    isPaused: boolean;
    isBuffering: boolean;
  };
};

type SpotifyEmbedController = {
  addListener: (
    event: "playback_update" | "ready",
    callback: (event: SpotifyPlaybackEvent) => void,
  ) => void;
  destroy: () => void;
};

type SpotifyIframeApi = {
  createController: (
    element: HTMLElement,
    options: { uri: string; width: string; height: number },
    callback: (controller: SpotifyEmbedController) => void,
  ) => void;
};

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
  }
}

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
const SPOTIFY_IFRAME_API_SRC = "https://open.spotify.com/embed/iframe-api/v1";
let spotifyIframeApiPromise: Promise<SpotifyIframeApi> | null = null;

function getSpotifyUri(url?: string): string | null {
  const match = String(url || "").match(
    /open\.spotify\.com\/(track|album|episode|show|playlist)\/([A-Za-z0-9]+)/i,
  );
  return match ? `spotify:${match[1].toLowerCase()}:${match[2]}` : null;
}

function loadSpotifyIframeApi(): Promise<SpotifyIframeApi> {
  if (spotifyIframeApiPromise) return spotifyIframeApiPromise;

  spotifyIframeApiPromise = new Promise((resolve, reject) => {
    const previousReady = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (api) => {
      previousReady?.(api);
      resolve(api);
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SPOTIFY_IFRAME_API_SRC}"]`,
    );
    if (existing) return;

    const script = document.createElement("script");
    script.src = SPOTIFY_IFRAME_API_SRC;
    script.async = true;
    script.onerror = () => {
      spotifyIframeApiPromise = null;
      reject(new Error("Spotify IFrame API could not be loaded"));
    };
    document.body.appendChild(script);
  });

  return spotifyIframeApiPromise;
}

function SpotifyInlinePlayer({
  uri,
  title,
  onPlayingChange,
}: {
  uri: string;
  title: string;
  onPlayingChange: (playing: boolean) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let disposed = false;
    let controller: SpotifyEmbedController | null = null;

    loadSpotifyIframeApi()
      .then((api) => {
        if (disposed || !hostRef.current) return;
        api.createController(
          hostRef.current,
          { uri, width: "100%", height: 80 },
          (createdController) => {
            if (disposed) {
              createdController.destroy();
              return;
            }
            controller = createdController;
            createdController.addListener("playback_update", (event) => {
              onPlayingChange(!event.data.isPaused && !event.data.isBuffering);
            });
          },
        );
      })
      .catch(() => onPlayingChange(false));

    return () => {
      disposed = true;
      onPlayingChange(false);
      controller?.destroy();
    };
  }, [onPlayingChange, uri]);

  return <div ref={hostRef} title={`${title} のSpotifyプレイヤー`} />;
}

export default function BroadcastBar() {
  const [data, setData] = useState<NowPlaying | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [playerOpenFor, setPlayerOpenFor] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlePlayingChange = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

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
  const embedUrl = getSpotifyEmbedUrl(t.spotify);
  const spotifyUri = getSpotifyUri(t.spotify);
  const isPlayerOpen = playerOpenFor === t.id;

  const openInlinePlayer = () => {
    metric("broadcast_listen", { id: t.id, via: "inline_player" });
    setPlayerOpenFor(t.id);
  };

  if (collapsed) {
    return (
      <button
        type="button"
        className="rnv-broadcast-fab"
        onClick={toggle}
        aria-label="今のおすすめ曲をひらく"
        title="放送をひらく"
      >
        <span className="rnv-broadcast-fab__pulse" aria-hidden="true" />
        <span className="rnv-broadcast-fab__glyph rnv-rune" aria-hidden="true">♪</span>
      </button>
    );
  }

  return (
    <aside className="rnv-broadcast" aria-label="今のおすすめ曲" role="complementary">
      {isPlayerOpen && spotifyUri && (
        <div className="rnv-broadcast__player">
          <SpotifyInlinePlayer
            uri={spotifyUri}
            title={t.title}
            onPlayingChange={handlePlayingChange}
          />
        </div>
      )}
      <div className="rnv-broadcast__inner">
        {embedUrl ? (
          <button
            type="button"
            className="rnv-broadcast__cover rnv-breathe"
            onClick={() => (isPlayerOpen ? setPlayerOpenFor(null) : openInlinePlayer())}
            aria-label={isPlayerOpen ? `${t.title} のプレイヤーを閉じる` : `${t.title} のプレイヤーを開く`}
          >
            <Image src={t.cover} alt="" fill sizes="56px" className="rnv-broadcast__img" />
            <span className={`rnv-broadcast__eq${isPlaying ? " is-playing" : ""}`} aria-hidden="true">
              <i /><i /><i />
            </span>
          </button>
        ) : (
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
        )}

        <div className="rnv-broadcast__meta">
          <span className="rnv-broadcast__label rnv-rune">
            {isPlaying
              ? "NOW PLAYING · この場で再生中"
              : isPlayerOpen
                ? "PLAYER READY · ▶を押すと再生"
                : "NOW FEATURED · 今のおすすめ曲"}
          </span>
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

        {embedUrl ? (
          <button
            type="button"
            className="rnv-broadcast__listen"
            onClick={() => (isPlayerOpen ? setPlayerOpenFor(null) : openInlinePlayer())}
          >
            {isPlayerOpen ? "閉じる" : "聴く"}
          </button>
        ) : (
          <a
            href={listenHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rnv-broadcast__listen"
            onClick={() => metric("broadcast_listen", { id: t.id, via: "button" })}
          >
            聴く
          </a>
        )}

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
