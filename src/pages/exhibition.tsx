"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { track } from "@/lib/metrics";

/* ================================================================
   0. ユーティリティ（既存ロジック維持）
   ================================================================ */

function normalizeCover(src?: string) {
  if (!src) return src;
  let s = String(src).replace(/\\/g, "/").trim();
  s = s.replace(/^https:\/(?!\/)/i, "https://").replace(/^http:\/(?!\/)/i, "http://");
  if (/^https?:\/\//i.test(s)) return s;
  s = s.replace(/^\/?public\//, "/");
  if (s.startsWith("/works/covers/")) return s;
  if (s.startsWith("works/covers/")) return "/" + s;
  if (!s.startsWith("/")) s = "/works/covers/" + s;
  return s;
}

function sanitizeUrl(u?: string): string | undefined {
  if (!u) return u;
  let s = u.trim();
  s = s.replace(/^https:\/(?!\/)/i, "https://");
  s = s.replace(/^http:\/(?!\/)/i, "http://");
  if (/^https?:\/\//i.test(s)) return s;
  if (!s.startsWith("/")) s = "/" + s;
  return s;
}

function parseTags(tags?: string[] | string) {
  const out: Record<string, string> = {};
  const arr = Array.isArray(tags) ? tags : tags ? String(tags).split(/[;,]\s*/) : [];
  for (const t of arr) {
    const m = String(t).match(/^([^:]+):\s*(.+)$/);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

function hiResIfAmazon(url?: string) {
  if (!url) return url;
  if (!/^https?:\/\//i.test(url)) return url;
  const m = url.match(/^https:\/\/m\.media[.-]amazon\.com\/images\/I\/([^._]+)\./);
  return m ? `https://m.media-amazon.com/images/I/${m[1]}._SL1600_.jpg` : url;
}

function inferSpotifyUrl(w: Work): string | undefined {
  if (w.links?.listen && /(?:open\.spotify\.com|^spotify:)/i.test(w.links.listen)) {
    return w.links.listen;
  }
  const id = (w.cover || "").match(/spotify_([A-Za-z0-9]+)\.jpg$/)?.[1];
  const lower = (w.tags || []).map((t) => t.toLowerCase());
  let kind: "track" | "album" | "playlist" = "track";
  if (lower.some((t) => /playlist/.test(t))) kind = "playlist";
  else if (lower.some((t) => /\b(ep|lp|album)\b/.test(t))) kind = "album";
  else if (lower.some((t) => /\b(single|track)\b/.test(t))) kind = "track";
  if (!id) return undefined;
  return `https://open.spotify.com/${kind}/${id}`;
}

/** Amazon短縮URL（ASINから） */
function buildAmazonUrl(w: Work): string | undefined {
  if (w.href && /amazon/i.test(w.href)) return w.href;
  const meta = parseTags(w.tags);
  const asin = meta?.ASIN || meta?.asin;
  if (asin) return `https://www.amazon.co.jp/dp/${asin}`;
  return undefined;
}

/* ================================================================
   1. 型 & サニタイズ
   ================================================================ */

type Work = {
  id: string;
  title: string;
  type: "music" | "video" | "art" | "book" | "article";
  cover: string;
  tags?: string[];
  links?: Partial<Record<"listen" | "watch" | "read" | "nft" | "spotify" | "appleMusic" | "itunesBuy" | "amazonMusic", string>>;
  releasedAt?: string;
  weight?: number;
  previewUrl?: string;
  href?: string;
  description?: string;
  aspect?: string;
};

type WorksDoc = { items: Work[] };

function sanitizeWork(w: Work): Work {
  const cover = sanitizeUrl(normalizeCover(w.cover)) || w.cover;
  const previewUrl = sanitizeUrl(w.previewUrl);
  const linksIn = (w.links || {}) as Record<string, string | undefined>;
  const links = {
    listen: sanitizeUrl(linksIn.listen),
    watch: sanitizeUrl(linksIn.watch),
    read: sanitizeUrl(linksIn.read),
    nft: sanitizeUrl(linksIn.nft),
    // 音楽サービス個別リンクを保持
    spotify: sanitizeUrl(linksIn.spotify),
    appleMusic: sanitizeUrl(linksIn.appleMusic),
    itunesBuy: sanitizeUrl(linksIn.itunesBuy),
    amazonMusic: sanitizeUrl(linksIn.amazonMusic),
  };
  const compactLinks = Object.fromEntries(Object.entries(links).filter(([, v]) => !!v));
  return {
    ...w,
    cover,
    previewUrl,
    ...(Object.keys(compactLinks).length ? { links: compactLinks as Work["links"] } : { links: undefined }),
  };
}

/* ================================================================
   2. アスペクト比（bookは縦長優先、musicは1:1）
   ================================================================ */

function getAspectForWork(w: Work): string {
  // Explicit aspect from data
  if (w.aspect) {
    const map: Record<string, string> = {
      "1:1": "1 / 1",
      "2:3": "2 / 3",
      "3:4": "3 / 4",
      "4:3": "4 / 3",
      "16:9": "16 / 9",
    };
    if (map[w.aspect]) return map[w.aspect];
  }
  // Tag overrides
  if (w.tags?.length) {
    const lower = w.tags.map((t) => t.toLowerCase());
    for (const t of lower) {
      const m = t.match(/^aspect:(\d+(?:\.\d+)?)[x:](\d+(?:\.\d+)?)$/);
      if (m) {
        const ww = Number(m[1]);
        const hh = Number(m[2]);
        if (Number.isFinite(ww) && Number.isFinite(hh) && ww > 0 && hh > 0)
          return `${ww} / ${hh}`;
      }
    }
    if (lower.includes("square")) return "1 / 1";
    if (lower.includes("portrait")) return "2 / 3";
    if (lower.includes("landscape")) return "16 / 9";
  }
  // Type defaults: book=2:3 (tall), music=1:1
  switch (w.type) {
    case "book":
      return "2 / 3";
    case "music":
      return "1 / 1";
    case "video":
      return "16 / 9";
    case "art":
      return "4 / 3";
    case "article":
      return "16 / 9";
    default:
      return "4 / 3";
  }
}

/* ================================================================
   3. CTA推論（type別にPrimary CTAを決定）
   ================================================================ */

type CTA = { label: string; url: string; icon: string };

function getPrimaryCta(w: Work): CTA | null {
  if (w.type === "music") {
    // Spotify を最優先（listen キーまたは spotify キー）
    const spotify = w.links?.spotify || inferSpotifyUrl(w) || (w.links?.listen && /spotify/i.test(w.links.listen) ? w.links.listen : undefined);
    if (spotify) return { label: "Spotifyで聴く", url: spotify, icon: "spotify" };
    // Apple Music
    if (w.links?.appleMusic) return { label: "Apple Musicで聴く", url: w.links.appleMusic, icon: "appleMusic" };
    // iTunes 購入
    if (w.links?.itunesBuy) return { label: "iTunesで購入", url: w.links.itunesBuy, icon: "itunesBuy" };
    if (w.links?.listen) {
      if (/music\.apple\.com/i.test(w.links.listen))
        return { label: "Apple Musicで聴く", url: w.links.listen, icon: "appleMusic" };
      if (/itunes\.apple\.com/i.test(w.links.listen))
        return { label: "iTunesで購入", url: w.links.listen, icon: "itunesBuy" };
      return { label: "聴く", url: w.links.listen, icon: "listen" };
    }
  }
  if (w.type === "book") {
    const amazon = buildAmazonUrl(w);
    if (amazon) return { label: "Amazonで読む", url: amazon, icon: "amazon" };
    if (w.links?.read) return { label: "読む", url: w.links.read, icon: "read" };
  }
  if (w.links?.nft) return { label: "NFTを見る", url: w.links.nft, icon: "nft" };
  if (w.links?.watch) {
    if (/youtube\.com|youtu\.be/i.test(w.links.watch))
      return { label: "YouTubeで視聴", url: w.links.watch, icon: "youtube" };
    return { label: "視聴する", url: w.links.watch, icon: "watch" };
  }
  if (w.links?.listen) return { label: "聴く", url: w.links.listen, icon: "listen" };
  if (w.links?.read) return { label: "読む", url: w.links.read, icon: "read" };
  if (w.href) return { label: "見る", url: w.href, icon: "link" };
  return null;
}

function getSecondaryLinks(w: Work): { label: string; url: string; icon: string }[] {
  const links: { label: string; url: string; icon: string }[] = [];
  const seen = new Set<string>();
  const addLink = (label: string, url: string, icon: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    links.push({ label, url, icon });
  };

  const spotify = w.links?.spotify || inferSpotifyUrl(w) || (w.links?.listen && /spotify/i.test(w.links.listen || "") ? w.links.listen : undefined);
  const amazon = buildAmazonUrl(w);

  // 音楽サービスリンク（spotify → appleMusic → amazonMusic → itunesBuy の順）
  if (spotify) addLink("Spotifyで聴く", spotify, "spotify");
  if (w.links?.appleMusic) addLink("Apple Musicで聴く", w.links.appleMusic, "appleMusic");
  if (w.links?.amazonMusic) addLink("Amazon Musicで聴く", w.links.amazonMusic, "amazonMusic");
  if (w.links?.itunesBuy) addLink("iTunesで購入", w.links.itunesBuy, "itunesBuy");

  // listen キーがあって上記と重複しない場合
  if (w.links?.listen) {
    if (/music\.apple\.com/i.test(w.links.listen)) addLink("Apple Musicで聴く", w.links.listen, "appleMusic");
    else if (/itunes\.apple\.com/i.test(w.links.listen)) addLink("iTunesで購入", w.links.listen, "itunesBuy");
    else if (!/spotify/i.test(w.links.listen)) addLink("聴く", w.links.listen, "listen");
  }

  // YouTube
  if (w.links?.watch) {
    const watchLabel = /youtube\.com|youtu\.be/i.test(w.links.watch) ? "YouTubeで観る" : "視聴する";
    addLink(watchLabel, w.links.watch, "youtube");
  }

  // Amazon（本は「読む」、音楽は「購入」）
  if (amazon) {
    const amazonLabel = w.type === "book" ? "Amazonで読む" : "Amazonで購入";
    addLink(amazonLabel, amazon, "amazon");
  }
  if (w.links?.read) addLink("Amazonで読む", w.links.read, "read");
  if (w.links?.nft) addLink("NFTを見る", w.links.nft, "nft");
  if (w.href) addLink("Webサイトで見る", w.href, "link");

  return links;
}

/* ================================================================
   4. アイコンSVG
   ================================================================ */

function IconSvg({ icon, size = 18 }: { icon: string; size?: number }) {
  const s = { width: size, height: size, fill: "currentColor", flexShrink: 0 } as const;
  switch (icon) {
    case "spotify":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm5.5 17.3c-.2.3-.6.4-1 .2-2.7-1.6-6-2-10-1.1-.4.1-.7-.1-.8-.5s.1-.7.5-.8c4.3-1 8-.6 11 1.2.4.2.5.6.3 1zm1.5-3.3c-.3.4-.8.5-1.2.3-3-1.9-7.7-2.4-11.3-1.3-.4.1-.9-.1-1-.5-.1-.4.1-.9.5-1 4.1-1.3 9.2-.7 12.6 1.5.3.1.4.6.4 1zm.1-3.4c-3.7-2.2-9.7-2.4-13.2-1.3-.5.2-1.1-.1-1.2-.6-.2-.5.1-1.1.6-1.2 4-1.2 10.7-1 14.9 1.5.5.3.6.9.4 1.4-.3.4-.9.5-1.5.2z" />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M23.5 6.2c-.3-1-1-1.8-2-2.1C19.6 3.5 12 3.5 12 3.5s-7.6 0-9.5.6c-1 .3-1.7 1.1-2 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8c.3 1 1 1.8 2 2.1 1.9.6 9.5.6 9.5.6s7.6 0 9.5-.6c1-.3 1.7-1.1 2-2.1.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.6V8.4l6.3 3.6-6.3 3.6z" />
        </svg>
      );
    case "amazon":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M.045 18.02c.072-.116.187-.124.348-.064 3.09 1.637 6.429 2.457 10.017 2.457 2.395 0 4.897-.477 7.411-1.397.217-.08.406.019.5.154.094.134.07.313-.07.422-2.69 2.26-5.897 3.408-9.523 3.408C5.502 23 2.544 21.741.045 18.02zm19.17-2.368c-.247-.31-.96-.459-1.784-.382-.826.077-1.552.307-1.842.602-.107.11-.084.244.058.353.597.333 1.295.564 2.1.564.785 0 1.48-.213 1.693-.564.153-.252.106-.42-.225-.573zm-2.215 2.42c.45-.55.683-1.288.683-2.04 0-2.497-1.853-4.5-4.147-4.5-2.293 0-4.146 2.003-4.146 4.5s1.853 4.5 4.146 4.5c1.16 0 2.21-.487 2.96-1.268l.504 1.308z" />
        </svg>
      );
    case "amazonMusic":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M12 3C6.48 3 2 7.48 2 13c0 3.18 1.49 6.01 3.82 7.85.15.12.35.08.46-.07l.79-1.13c.11-.16.07-.38-.09-.49C5.01 17.7 4 15.46 4 13c0-4.41 3.59-8 8-8s8 3.59 8 8c0 2.46-1.01 4.7-2.98 6.16-.16.11-.2.33-.09.49l.79 1.13c.11.15.31.19.46.07C20.51 19.01 22 16.18 22 13c0-5.52-4.48-10-10-10zm0 5c-1.1 0-2 .9-2 2v5l3.5 2 .75-1.23-2.25-1.27V10c0-.55-.45-1-1-1z"/>
        </svg>
      );
    case "appleMusic":
    case "itunesBuy":
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" style={s}>
          <path d="M14 3v2H5v14h14v-9h2v10a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1h10zm7 0v6h-2V6.41l-7.3 7.3-1.4-1.42L17.58 5H15V3h6z" />
        </svg>
      );
  }
}

/* ================================================================
   5. TypeBadge（控えめ）
   ================================================================ */

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    music: { bg: "rgba(30,215,96,0.12)", fg: "#1ed760" },
    book: { bg: "rgba(255,153,0,0.12)", fg: "#ff9900" },
    video: { bg: "rgba(255,0,0,0.12)", fg: "#ff4444" },
    art: { bg: "rgba(147,51,234,0.12)", fg: "#a855f7" },
    article: { bg: "rgba(59,130,246,0.12)", fg: "#3b82f6" },
    nft: { bg: "rgba(147,51,234,0.12)", fg: "#9333ea" },
  };
  const c = colors[type] || { bg: "rgba(255,255,255,0.08)", fg: "#999" };
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 10,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        padding: "2px 7px",
        borderRadius: 4,
        background: c.bg,
        color: c.fg,
        lineHeight: 1.5,
      }}
    >
      {type}
    </span>
  );
}

/* ================================================================
   6. Masonry Card
   ================================================================ */

function MasonryCard({
  work,
  onClick,
}: {
  work: Work;
  onClick: () => void;
}) {
  const aspect = getAspectForWork(work);
  const isBook = work.type === "book";
  const coverUrl = hiResIfAmazon(work.cover) ?? "";

  return (
    <article
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        breakInside: "avoid",
        marginBottom: 16,
        borderRadius: 12,
        overflow: "hidden",
        background: "#111",
        border: "1px solid rgba(255,255,255,0.06)",
        cursor: "pointer",
        transition: "transform 0.25s cubic-bezier(.4,0,.2,1), box-shadow 0.25s cubic-bezier(.4,0,.2,1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.35)";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.20)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
      }}
    >
      {/* Image container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: aspect,
          background: isBook
            ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
            : "#0a0a0a",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={coverUrl}
          alt={work.title}
          loading="lazy"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: isBook ? "contain" : "cover",
            objectPosition: "center",
            transition: "transform 0.4s cubic-bezier(.4,0,.2,1)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.03)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {/* Info strip – minimal */}
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <TypeBadge type={work.type} />
        </div>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.35,
            margin: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            color: "#e5e7eb",
            letterSpacing: "-0.01em",
          }}
        >
          {work.title}
        </h3>
      </div>
    </article>
  );
}

/* ================================================================
   7. Detail Modal
   ================================================================ */

function DetailModal({
  work,
  onClose,
  onPrev,
  onNext,
  onTagClick,
}: {
  work: Work;
  onClose: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  onTagClick: (tag: string) => void;
}) {
  const aspect = getAspectForWork(work);
  const isBook = work.type === "book";
  const coverUrl = hiResIfAmazon(work.cover) ?? "";
  const primary = getPrimaryCta(work);
  // primaryと同じURLはsecondaryから除外（重複表示を防ぐ）
  const secondaries = getSecondaryLinks(work).filter(
    (s) => !primary || s.url !== primary.url
  );
  const displayTags = (work.tags || []).filter(
    (t) => !/^(ASIN|asin|price|aspect):/i.test(t) && !/^(square|portrait|landscape)$/i.test(t)
  );

  // Close on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && onPrev) onPrev();
      if (e.key === "ArrowRight" && onNext) onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, onPrev, onNext]);

  // Prevent body scroll
  useEffect(() => {
    const orig = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = orig;
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.82)",
          backdropFilter: "blur(8px)",
        }}
        onClick={onClose}
      />

      {/* Nav arrows */}
      {onPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrev();
          }}
          aria-label="Previous"
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10001,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "50%",
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            cursor: "pointer",
            fontSize: 20,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
        >
          ‹
        </button>
      )}
      {onNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          aria-label="Next"
          style={{
            position: "absolute",
            right: 12,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10001,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "50%",
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            cursor: "pointer",
            fontSize: 20,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
        >
          ›
        </button>
      )}

      {/* Modal card */}
      <div
        style={{
          position: "relative",
          zIndex: 10000,
          background: "#111",
          borderRadius: 16,
          overflow: "hidden",
          maxWidth: 680,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 10,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "50%",
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            cursor: "pointer",
            fontSize: 18,
            lineHeight: 1,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.7)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.5)")}
        >
          ×
        </button>

        {/* Image – large */}
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: isBook ? "3 / 4" : aspect,
            maxHeight: 480,
            background: isBook
              ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
              : "#0a0a0a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <img
            src={coverUrl}
            alt={work.title}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
          />
        </div>

        {/* Content */}
        <div style={{ padding: "20px 24px 24px" }}>
          {/* Type + date */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <TypeBadge type={work.type} />
            {work.releasedAt && (
              <span style={{ fontSize: 12, color: "#888", fontWeight: 400 }}>
                {work.releasedAt}
              </span>
            )}
          </div>

          {/* Title */}
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1.3,
              margin: "0 0 12px",
              color: "#f0f0f0",
              letterSpacing: "-0.02em",
            }}
          >
            {work.title}
          </h2>

          {/* Description */}
          {work.description && (
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#aaa", margin: "0 0 16px" }}>
              {work.description}
            </p>
          )}

          {/* Tags */}
          {displayTags.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
              {displayTags.map((tag, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onTagClick(tag);
                    onClose();
                  }}
                  style={{
                    fontSize: 11,
                    padding: "3px 9px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 4,
                    color: "#bbb",
                    cursor: "pointer",
                    transition: "background 0.15s, color 0.15s",
                    lineHeight: 1.5,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.color = "#bbb";
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Primary CTA */}
          {primary && (
            <a
              href={primary.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => track("exhibit_cta_click", { id: work.id, type: primary.icon })}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 24px",
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 10,
                textDecoration: "none",
                transition: "opacity 0.2s, transform 0.15s",
                background:
                  primary.icon === "spotify"
                    ? "#1ed760"
                    : primary.icon === "amazon"
                      ? "#ff9900"
                      : primary.icon === "amazonMusic"
                        ? "#29a8e0"
                        : primary.icon === "youtube"
                          ? "#ff0000"
                          : primary.icon === "appleMusic"
                            ? "#fc3c44"
                            : primary.icon === "itunesBuy"
                              ? "#a259ff"
                              : primary.icon === "nft"
                                ? "#9333ea"
                                : "#3b82f6",
                color: primary.icon === "spotify" || primary.icon === "amazon" ? "#000" : "#fff",
                marginBottom: 16,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.9";
                e.currentTarget.style.transform = "scale(1.01)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <IconSvg icon={primary.icon} size={18} />
              {primary.label}
            </a>
          )}

          {/* Secondary links – service name labels */}
          {secondaries.length > 0 && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {secondaries.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => track("exhibit_link_click", { id: work.id, type: link.icon })}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#bbb",
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 500,
                    transition: "background 0.2s, color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.14)";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.color = "#bbb";
                  }}
                >
                  <IconSvg icon={link.icon} size={16} />
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   8. Control Bar
   ================================================================ */

const controlInputStyle: React.CSSProperties = {
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 500,
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  background: "rgba(255,255,255,0.05)",
  color: "#e5e7eb",
  outline: "none",
  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
  appearance: "none" as const,
  WebkitAppearance: "none" as const,
  minHeight: 44,
  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
};

function ControlBar({
  searchQuery,
  setSearchQuery,
  typeF,
  setTypeF,
  tagF,
  setTagF,
  sortKey,
  setSortKey,
  types,
  tags,
  resultCount,
}: {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  typeF: string;
  setTypeF: (v: string) => void;
  tagF: string;
  setTagF: (v: string) => void;
  sortKey: string;
  setSortKey: (v: string) => void;
  types: string[];
  tags: string[];
  resultCount: number;
}) {
  // Helper to determine if a filter is active (not "all")
  const isTypeActive = typeF !== "all";
  const isTagActive = tagF !== "all";

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
        marginBottom: 32,
        padding: "16px 20px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 14,
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      }}
    >
      {/* Search */}
      <div style={{ flex: "1 1 240px", position: "relative" }}>
        <span
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 14,
            color: searchQuery ? "#999" : "#666",
            pointerEvents: "none",
            transition: "color 0.2s",
          }}
        >
          <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: "currentColor" }}>
            <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Search title or tags…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            ...controlInputStyle,
            width: "100%",
            paddingLeft: 42,
            background: searchQuery ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.05)",
            borderColor: searchQuery ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.12)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
            e.currentTarget.style.background = "rgba(255,255,255,0.09)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,255,255,0.06)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = searchQuery
              ? "rgba(255,255,255,0.2)"
              : "rgba(255,255,255,0.12)";
            e.currentTarget.style.background = searchQuery
              ? "rgba(255,255,255,0.08)"
              : "rgba(255,255,255,0.05)";
            e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.1)";
          }}
          onMouseEnter={(e) => {
            if (document.activeElement !== e.currentTarget) {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
            }
          }}
          onMouseLeave={(e) => {
            if (document.activeElement !== e.currentTarget) {
              e.currentTarget.style.borderColor = searchQuery
                ? "rgba(255,255,255,0.2)"
                : "rgba(255,255,255,0.12)";
            }
          }}
        />
      </div>

      {/* Type filter */}
      <select
        value={typeF}
        onChange={(e) => setTypeF(e.target.value)}
        style={{
          ...controlInputStyle,
          cursor: "pointer",
          minWidth: 110,
          background: isTypeActive ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.05)",
          borderColor: isTypeActive ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.12)",
          color: isTypeActive ? "#93c5fd" : "#e5e7eb",
          fontWeight: isTypeActive ? 600 : 500,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = isTypeActive
            ? "rgba(59,130,246,0.4)"
            : "rgba(255,255,255,0.2)";
          e.currentTarget.style.background = isTypeActive
            ? "rgba(59,130,246,0.16)"
            : "rgba(255,255,255,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = isTypeActive
            ? "rgba(59,130,246,0.3)"
            : "rgba(255,255,255,0.12)";
          e.currentTarget.style.background = isTypeActive
            ? "rgba(59,130,246,0.12)"
            : "rgba(255,255,255,0.05)";
        }}
      >
        {types.map((t) => (
          <option key={t} value={t} style={{ background: "#1a1a1a" }}>
            {t === "all" ? "All Types" : t.charAt(0).toUpperCase() + t.slice(1)}
          </option>
        ))}
      </select>

      {/* Tag filter */}
      <select
        value={tagF}
        onChange={(e) => setTagF(e.target.value)}
        style={{
          ...controlInputStyle,
          cursor: "pointer",
          minWidth: 110,
          maxWidth: 180,
          background: isTagActive ? "rgba(168,85,247,0.12)" : "rgba(255,255,255,0.05)",
          borderColor: isTagActive ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.12)",
          color: isTagActive ? "#c4b5fd" : "#e5e7eb",
          fontWeight: isTagActive ? 600 : 500,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = isTagActive
            ? "rgba(168,85,247,0.4)"
            : "rgba(255,255,255,0.2)";
          e.currentTarget.style.background = isTagActive
            ? "rgba(168,85,247,0.16)"
            : "rgba(255,255,255,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = isTagActive
            ? "rgba(168,85,247,0.3)"
            : "rgba(255,255,255,0.12)";
          e.currentTarget.style.background = isTagActive
            ? "rgba(168,85,247,0.12)"
            : "rgba(255,255,255,0.05)";
        }}
      >
        {tags.map((t) => (
          <option key={t} value={t} style={{ background: "#1a1a1a" }}>
            {t === "all" ? "All Tags" : t}
          </option>
        ))}
      </select>

      {/* Sort */}
      <select
        value={sortKey}
        onChange={(e) => setSortKey(e.target.value)}
        style={{
          ...controlInputStyle,
          cursor: "pointer",
          minWidth: 130,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
          e.currentTarget.style.background = "rgba(255,255,255,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        }}
      >
        <option value="releasedAt-desc" style={{ background: "#1a1a1a" }}>
          Newest
        </option>
        <option value="releasedAt-asc" style={{ background: "#1a1a1a" }}>
          Oldest
        </option>
        <option value="random" style={{ background: "#1a1a1a" }}>
          Random
        </option>
      </select>

      {/* Count */}
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "#888",
          marginLeft: "auto",
          whiteSpace: "nowrap",
          padding: "0 4px",
        }}
      >
        {resultCount} {resultCount === 1 ? "work" : "works"}
      </span>
    </div>
  );
}

/* ================================================================
   9. ページ本体
   ================================================================ */

const PAGE_SIZE = 36;

export default function ExhibitionPage() {
  const [all, setAll] = useState<Work[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeF, setTypeF] = useState("all");
  const [tagF, setTagF] = useState("all");
  const [sortKey, setSortKey] = useState("releasedAt-desc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [modalWork, setModalWork] = useState<Work | null>(null);

  /* ---------- データ読み込み ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/works/works.json", { cache: "no-store" });
        const json: WorksDoc = await res.json();
        if (!cancelled) {
          const raw = Array.isArray(json?.items) ? json.items : [];
          setAll(raw.map(sanitizeWork));
        }
      } catch {
        if (!cancelled) setAll([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- URL修正（最終保険） ---------- */
  useEffect(() => {
    const fix = () => {
      document.querySelectorAll("img, video").forEach((el) => {
        const raw = (el as HTMLImageElement).getAttribute("src") || "";
        if (!raw) return;
        if (/^\/https:\/(?!\/)/i.test(raw) || /^https:\/(?!\/)/i.test(raw)) {
          const fixed = raw
            .replace(/^\/https:\/(?!\/)/i, "https://")
            .replace(/^https:\/(?!\/)/i, "https://")
            .replace(/^\/http:\/(?!\/)/i, "http://")
            .replace(/^http:\/(?!\/)/i, "http://");
          (el as HTMLImageElement).setAttribute("src", fixed);
        }
      });
    };
    const id = requestAnimationFrame(fix);
    return () => cancelAnimationFrame(id);
  }, [all, visibleCount]);

  /* ---------- フィルタ用リスト ---------- */
  const typeList = useMemo(() => {
    const s = new Set<string>();
    for (const w of all) s.add(w.type);
    return ["all", ...Array.from(s).sort()];
  }, [all]);

  const displayTagList = useMemo(() => {
    const s = new Set<string>();
    for (const w of all) {
      (w.tags || []).forEach((t) => {
        // Hide internal tags
        if (!/^(ASIN|asin|price|aspect):/i.test(t) && !/^(square|portrait|landscape)$/i.test(t)) {
          s.add(t);
        }
      });
    }
    return ["all", ...Array.from(s).sort()];
  }, [all]);

  /* ---------- ビュー（検索 + フィルタ + ソート） ---------- */
  const filtered = useMemo(() => {
    let v = [...all];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      v = v.filter((w) => {
        const titleMatch = w.title.toLowerCase().includes(q);
        const tagsMatch = (w.tags || []).some((t) => t.toLowerCase().includes(q));
        return titleMatch || tagsMatch;
      });
    }
    if (typeF !== "all") v = v.filter((w) => w.type === typeF);
    if (tagF !== "all") v = v.filter((w) => (w.tags || []).includes(tagF));

    if (sortKey === "releasedAt-desc") {
      v.sort((a, b) => {
        const ad = a.releasedAt ? Date.parse(a.releasedAt) : 0;
        const bd = b.releasedAt ? Date.parse(b.releasedAt) : 0;
        return bd - ad;
      });
    } else if (sortKey === "releasedAt-asc") {
      v.sort((a, b) => {
        const ad = a.releasedAt ? Date.parse(a.releasedAt) : 0;
        const bd = b.releasedAt ? Date.parse(b.releasedAt) : 0;
        return ad - bd;
      });
    } else if (sortKey === "random") {
      v.sort(() => Math.random() - 0.5);
    }
    return v;
  }, [all, searchQuery, typeF, tagF, sortKey]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, typeF, tagF, sortKey]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  /* ---------- モーダルナビ ---------- */
  const modalIndex = modalWork ? filtered.findIndex((w) => w.id === modalWork.id) : -1;

  const openModal = useCallback(
    (w: Work) => {
      setModalWork(w);
      track("exhibit_modal_open", { id: w.id, type: w.type });
    },
    []
  );

  const goPrev = useCallback(() => {
    if (modalIndex > 0) setModalWork(filtered[modalIndex - 1]);
  }, [modalIndex, filtered]);

  const goNext = useCallback(() => {
    if (modalIndex < filtered.length - 1) setModalWork(filtered[modalIndex + 1]);
  }, [modalIndex, filtered]);

  const handleTagClick = useCallback((tag: string) => {
    setTagF(tag);
    setSearchQuery("");
    setTypeF("all");
  }, []);

  /* ---------- レンダリング ---------- */
  return (
    <main
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "48px 20px 80px",
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
        color: "#e5e7eb",
        minHeight: "100vh",
      }}
    >
      {/* ===== Header ===== */}
      <header
        style={{
          marginBottom: 36,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: 42,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            margin: "0 0 8px",
            color: "#f5f5f5",
          }}
        >
          Exhibition
        </h1>
        <p
          style={{
            fontSize: 15,
            color: "#666",
            fontWeight: 400,
            margin: 0,
            letterSpacing: "0.02em",
          }}
        >
          A curated collection of creative works
        </p>
        <p
          style={{
            fontSize: 12,
            color: "#555",
            fontWeight: 400,
            margin: "6px 0 0",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {all.length} works
        </p>
      </header>

      {/* ===== Controls ===== */}
      <ControlBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        typeF={typeF}
        setTypeF={setTypeF}
        tagF={tagF}
        setTagF={setTagF}
        sortKey={sortKey}
        setSortKey={setSortKey}
        types={typeList}
        tags={displayTagList}
        resultCount={filtered.length}
      />

      {/* ===== Masonry Grid (CSS columns) ===== */}
      {visible.length > 0 ? (
        <section
          style={{
            columnCount: 1,
            columnGap: 16,
          }}
        >
          <style>{`
            @media (min-width: 520px) {
              .masonry-grid { column-count: 2 !important; }
            }
            @media (min-width: 820px) {
              .masonry-grid { column-count: 3 !important; }
            }
            @media (min-width: 1120px) {
              .masonry-grid { column-count: 4 !important; }
            }
          `}</style>
          <div className="masonry-grid" style={{ columnCount: 1, columnGap: 16 }}>
            {visible.map((w) => (
              <MasonryCard key={w.id} work={w} onClick={() => openModal(w)} />
            ))}
          </div>
        </section>
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
          }}
        >
          <p style={{ fontSize: 16, color: "#666", marginBottom: 8 }}>No works found</p>
          <p style={{ fontSize: 13, color: "#555" }}>Try adjusting your search or filters</p>
        </div>
      )}

      {/* ===== Load More ===== */}
      {hasMore && (
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <button
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            style={{
              padding: "12px 36px",
              fontSize: 14,
              fontWeight: 500,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10,
              color: "#ccc",
              cursor: "pointer",
              transition: "background 0.2s, border-color 0.2s, color 0.2s",
              letterSpacing: "0.02em",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
              e.currentTarget.style.color = "#ccc";
            }}
          >
            Load more ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {/* ===== Detail Modal ===== */}
      {modalWork && (
        <DetailModal
          work={modalWork}
          onClose={() => setModalWork(null)}
          onPrev={modalIndex > 0 ? goPrev : null}
          onNext={modalIndex < filtered.length - 1 ? goNext : null}
          onTagClick={handleTagClick}
        />
      )}
    </main>
  );
}
