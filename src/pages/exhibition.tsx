"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { track } from "@/lib/metrics";

/** ===================== 基本ユーティリティ ===================== **/

// ローカルのカバー画像用：相対を /works/covers/... に寄せる
// ※外部絶対URL(http/https)はそのまま通す
function normalizeCover(src?: string) {
  if (!src) return src;
  let s = String(src).replace(/\\/g, "/").trim();

  // プロトコル壊れ矯正（https:/ → https:// 等）
  s = s.replace(/^https:\/(?!\/)/i, "https://").replace(/^http:\/(?!\/)/i, "http://");

  // 絶対URLはそのまま返す（先頭に "/" を付けない）
  if (/^https?:\/\//i.test(s)) return s;

  // /public プレフィクス除去
  s = s.replace(/^\/?public\//, "/");

  // 既にカバー階層
  if (s.startsWith("/works/covers/")) return s;
  if (s.startsWith("works/covers/")) return "/" + s;

  // ファイル名っぽい場合は covers 直下
  if (!s.startsWith("/")) s = "/works/covers/" + s;
  return s;
}

// URLを安全に正規化（https:/ → https://、絶対URLには先頭スラ付けない）
function sanitizeUrl(u?: string): string | undefined {
  if (!u) return u;
  let s = u.trim();
  // "https:/" → "https://"、"http:/" → "http://"
  s = s.replace(/^https:\/(?!\/)/i, "https://");
  s = s.replace(/^http:\/(?!\/)/i, "http://");
  // 既に絶対URLならそのまま返す
  if (/^https?:\/\//i.test(s)) return s;
  // 相対パスだけ "/" を補う
  if (!s.startsWith("/")) s = "/" + s;
  return s;
}

// aタグなど全リンク用：絶対URLはそのまま、相対なら "/" を補う
// かつ "https:/" / "http:/" の壊れを確実に矯正
const H = (u?: string) => {
  if (!u) return undefined;
  let s = u
    .trim()
    .replace(/^https:\/(?!\/)/i, "https://")
    .replace(/^http:\/(?!\/)/i, "http://");
  if (/^https?:\/\//i.test(s)) return s;
  if (!s.startsWith("/")) s = "/" + s;
  return s;
};

// タグ配列/文字列 → {key:value} に
function parseTags(tags?: string[] | string) {
  const out: Record<string, string> = {};
  const arr = Array.isArray(tags) ? tags : (tags ? String(tags).split(/[;,]\s*/) : []);
  for (const t of arr) {
    const m = String(t).match(/^([^:]+):\s*(.+)$/);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

// （拡張用）0円の判定
function isZeroPrice(v?: string) {
  if (!v) return false;
  const s = v.toLowerCase().replace(/\s/g, "");
  return /^¥?0(?:円)?$/.test(s) || s === "0" || s === "free" || s === "gratis";
}

// Amazon画像を高解像度へ（必ず normalize 後に通す）
function hiResIfAmazon(url?: string) {
  if (!url) return url;
  if (!/^https?:\/\//i.test(url)) return url;
  const m = url.match(/^https:\/\/m\.media\.amazon\.com\/images\/I\/([^._]+)\./);
  return m ? `https://m.media-amazon.com/images/I/${m[1]}._SL1600_.jpg` : url;
}

/** ===================== Spotify補完 ===================== **/

function inferSpotifyUrl(w: Work): string | undefined {
  // 1) 既に listen が Spotify → それを優先
  if (w.links?.listen && /(?:open\.spotify\.com|^spotify:)/i.test(w.links.listen)) {
    return w.links.listen;
  }
  // 2) cover から ID 抽出
  const id = (w.cover || "").match(/spotify_([A-Za-z0-9]+)\.jpg$/)?.[1];
  // 3) タグで種別ヒント
  const lower = (w.tags || []).map((t) => t.toLowerCase());
  let kind: "track" | "album" | "playlist" = "track";
  if (lower.some((t) => /playlist/.test(t))) kind = "playlist";
  else if (lower.some((t) => /\b(ep|lp|album)\b/.test(t))) kind = "album";
  else if (lower.some((t) => /\b(single|track)\b/.test(t))) kind = "track";
  if (!id) return undefined;
  return `https://open.spotify.com/${kind}/${id}`;
}

/** ===================== 型 & サニタイズ ===================== **/

type Work = {
  id: string;
  title: string;
  type: "music" | "video" | "art" | "book" | "article";
  cover: string;
  tags?: string[];
  links?: Partial<Record<"listen" | "watch" | "read" | "nft", string>>;
  releasedAt?: string; // "YYYY-MM-DD"
  weight?: number;
  previewUrl?: string;
};

type WorksDoc = { items: Work[] };

// works.json の1件を丸ごと正規化（初回レンダー前に潰す）
function sanitizeWork(w: Work): Work {
  // cover は「https:/ → https://」矯正 → その後に covers パスへ正規化
const cover = sanitizeUrl(normalizeCover(w.cover)) || w.cover;

  // preview と各リンクは sanitizeUrl でOK（絶対URLはそのまま、相対なら "/" 付与）
  const previewUrl = sanitizeUrl(w.previewUrl);

  const linksIn = w.links || {};
  const links = {
    listen: sanitizeUrl(linksIn.listen),
    watch: sanitizeUrl(linksIn.watch),
    read: sanitizeUrl(linksIn.read),
    nft: sanitizeUrl(linksIn.nft),
  };
  const compactLinks = Object.fromEntries(Object.entries(links).filter(([, v]) => !!v));

  return {
    ...w,
    cover,
    previewUrl,
    ...(Object.keys(compactLinks).length ? { links: compactLinks as Work["links"] } : { links: undefined }),
  };
}

/** ===================== アスペクト ===================== **/

const aspectByType: Record<Work["type"], string> = {
  music: "1 / 1",
  video: "16 / 9",
  art: "4 / 3",
  book: "5 / 8",
  article: "16 / 9",
};

function tagAspectOverride(tags?: string[]): string | null {
  if (!tags?.length) return null;
  const lower = tags.map((t) => t.toLowerCase());

  // ゆらぎ吸収
  if (lower.some((t) => t === "art1.1" || t === "art-1.1" || t === "art11")) return "1 / 1.1";

  // aspect:W:H / aspect:W×H
  for (const t of lower) {
    const m = t.match(/^aspect:(\d+(?:\.\d+)?)[x:](\d+(?:\.\d+)?)$/);
    if (m) {
      const w = Number(m[1]);
      const h = Number(m[2]);
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return `${w} / ${h}`;
    }
  }
  if (lower.includes("square")) return "1 / 1";
  if (lower.includes("portrait")) return "2 / 3";
  if (lower.includes("landscape")) return "16 / 9";
  return null;
}

function getAspectForWork(w: Work): string {
  return tagAspectOverride(w.tags) ?? (aspectByType[w.type] ?? "4 / 3");
}

/** ===================== ページ本体 ===================== **/

export default function ExhibitionPage() {
  const [all, setAll] = useState<Work[]>([]);
  const [typeF, setTypeF] = useState<string>("all");
  const [tagF, setTagF] = useState<string>("all");
  const [sortKey, setSortKey] = useState<"releasedAt" | "weight">("releasedAt");
  const [wowTracked, setWowTracked] = useState(false);
  const wowTimerRef = useRef<number | null>(null);

  // 読み込み（投入前に全件サニタイズ）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/works/works.json", { cache: "no-store" });
        const json: WorksDoc = await res.json();
        if (!cancelled) {
          const raw = Array.isArray(json?.items) ? json.items : [];
          const cleaned = raw.map(sanitizeWork);
          setAll(cleaned);
        }
      } catch {
        if (!cancelled) setAll([]);
      }
    })();
    return () => {
      cancelled = true;
      if (wowTimerRef.current) window.clearTimeout(wowTimerRef.current);
    };
  }, []);

  // タグ一覧
  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const w of all) (w.tags || []).forEach((t) => s.add(t));
    return ["all", ...Array.from(s).sort()];
  }, [all]);

  // WOW（previewあり最初 / なければ先頭）
  const wow = useMemo(() => {
    return all.find((w) => !!w.previewUrl) || all[0];
  }, [all]);

  // ビュー（フィルタ & ソート）
  const view = useMemo(() => {
    let v = [...all];
    if (typeF !== "all") v = v.filter((w) => w.type === (typeF as Work["type"]));
    if (tagF !== "all") v = v.filter((w) => (w.tags || []).includes(tagF));
    v.sort((a, b) => {
      if (sortKey === "releasedAt") {
        const ad = a.releasedAt ? Date.parse(a.releasedAt) : 0;
        const bd = b.releasedAt ? Date.parse(b.releasedAt) : 0;
        return bd - ad;
      }
      return (b.weight ?? 0) - (a.weight ?? 0);
    });
    return v;
  }, [all, typeF, tagF, sortKey]);

  // WOW計測（onPlay or 10秒後のどちらか一度だけ）
  useEffect(() => {
    if (!wow || wowTracked) return;
    wowTimerRef.current = window.setTimeout(() => {
      track("wow_play", { id: wow.id });
      setWowTracked(true);
    }, 10_000);
    return () => {
      if (wowTimerRef.current) window.clearTimeout(wowTimerRef.current);
    };
  }, [wow, wowTracked]);

  // 最終保険：描画後に /https:/ → https:// を一括矯正（他コンポーネントからの素imgにも効く）
  useEffect(() => {
    const fix = () => {
      document.querySelectorAll("img, video").forEach((el) => {
        const attr = "src";
        const raw = (el as HTMLImageElement).getAttribute(attr) || "";
        if (!raw) return;
        if (/^\/https:\/(?!\/)/i.test(raw) || /^https:\/(?!\/)/i.test(raw)) {
          const fixed = raw
            .replace(/^\/https:\/(?!\/)/i, "https://")
            .replace(/^https:\/(?!\/)/i, "https://")
            .replace(/^\/http:\/(?!\/)/i, "http://")
            .replace(/^http:\/(?!\/)/i, "http://");
          (el as HTMLImageElement).setAttribute(attr, fixed);
        }
      });
    };
    const id = requestAnimationFrame(fix);
    return () => cancelAnimationFrame(id);
  }, [view]);

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Exhibition</h1>
      <p style={{ opacity: 0.7, marginBottom: 24 }}>WOW preview + filter/sort + grid</p>

      {/* WOW */}
      {wow && (
        <section style={{ marginBottom: 24 }}>
          <div
            style={{
              position: "relative",
              borderRadius: 12,
              overflow: "hidden",
              background: "#111",
            }}
          >
            {wow.previewUrl ? (
              <video
                src={H(wow.previewUrl)}
                autoPlay
                muted
                loop
                playsInline
                style={{
                  width: "100%",
                  display: "block",
                  maxHeight: 480,
                  objectFit: "cover",
                }}
                onPlay={() => {
                  if (!wowTracked) {
                    track("wow_play", { id: wow.id });
                    setWowTracked(true);
                  }
                }}
              />
            ) : (
              // 画像フォールバック：タイプ/タグに応じた比率で表示
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: getAspectForWork(wow),
                  background: "#111",
                }}
              >
                <img
                  src={hiResIfAmazon(wow.cover) ?? ""}
                  alt={wow.title}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>
            )}

            {/* キャプション */}
            <div
              style={{
                position: "absolute",
                left: 12,
                bottom: 12,
                padding: "8px 12px",
                background: "rgba(0,0,0,.55)",
                color: "#fff",
                borderRadius: 8,
              }}
            >
              <div style={{ fontWeight: 700 }}>{wow.title}</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>
                {wow.type}
                {wow.releasedAt ? ` • ${wow.releasedAt}` : ""}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Controls */}
      <section style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <label>
          Type:&nbsp;
          <select value={typeF} onChange={(e) => setTypeF(e.target.value)}>
            {["all", "music", "video", "art", "book", "article"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tag:&nbsp;
          <select value={tagF} onChange={(e) => setTagF(e.target.value)}>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort:&nbsp;
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as any)}>
            <option value="releasedAt">releasedAt desc</option>
            <option value="weight">weight desc</option>
          </select>
        </label>
      </section>

      {/* Grid */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {view.map((w) => {
          const listenHref = H(w.links?.listen);
          const watchHref = H(w.links?.watch);
          const readHref = H(w.links?.read);
          const nftHref = H(w.links?.nft);

          return (
            <article key={w.id} style={{ border: "1px solid #222", borderRadius: 12, overflow: "hidden" }}>
              {/* メディア（比率ボックス） */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: getAspectForWork(w),
                  background: "#111",
                }}
              >
                <img
                  src={hiResIfAmazon(w.cover) ?? ""}
                  alt={w.title}
                  loading="lazy"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </div>

              {/* ボタン行 */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: 12 }}>
                {listenHref && (
                  <a href={listenHref} target="_blank" rel="noreferrer">
                    {/spotify\.com/i.test(listenHref) ? "Spotify" : "Listen"}
                  </a>
                )}
                {watchHref && (
                  <a href={watchHref} target="_blank" rel="noreferrer">
                    Watch
                  </a>
                )}
                {readHref && (
                  <a href={readHref} target="_blank" rel="noreferrer">
                    Read
                  </a>
                )}
                {nftHref && (
                  <a href={nftHref} target="_blank" rel="noreferrer">
                    NFT
                  </a>
                )}

                {/* Amazon（read が無い & ASIN があるときだけ） */}
                {(() => {
                  const meta = parseTags(w.tags);
                  const asin = meta?.ASIN || meta?.asin;
                  const amazonUrl = !readHref && asin ? `https://www.amazon.co.jp/dp/${asin}` : undefined;
                  return amazonUrl ? (
                    <a href={amazonUrl} target="_blank" rel="noreferrer">
                      Amazon
                    </a>
                  ) : null;
                })()}

                {/* Spotify（music かつ listen 未設定のとき補完） */}
                {w.type === "music" && !listenHref && (() => {
                  const sp = inferSpotifyUrl(w);
                  return sp ? (
                    <a href={sp} target="_blank" rel="noreferrer">
                      Spotify
                    </a>
                  ) : null;
                })()}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
