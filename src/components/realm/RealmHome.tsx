"use client";
// src/components/realm/RealmHome.tsx
// 没入アトラス・ホーム（リノベv2 / R1入領ゲート + R2地図）。
// 羊皮紙の天球図を実コンポーネント化。入領クリックで音声解錠＋地図展開、ドラッグで巡る、
// 地方ノードにホバーで代表作カバーが「星のように咲く」。SEO二層（下部に索引リンク）＋a11y。
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { track as metric } from "@/lib/metrics";
import { unlockAudio } from "@/lib/realm/audio";
import "./realm-home.css";

type Landmark = { id: string; title: string; cover: string; href: string };
type Region = {
  id: string;
  ja: string;
  en: string;
  glyph: string;
  accent: "amber" | "slate";
  count: number;
  landmark: Landmark | null;
};
type Counts = { total: number; music: number; books: number; films: number };

// 世界座標（1300×820）における地方の位置。atlas/regions.ts の id と対応。
const POS: Record<string, { x: number; y: number }> = {
  shrine: { x: 645, y: 150 },
  citadel: { x: 470, y: 150 },
  highland: { x: 980, y: 235 },
  skyfield: { x: 300, y: 255 },
  dawn: { x: 205, y: 420 },
  reverie: { x: 650, y: 470 },
  coast: { x: 1010, y: 430 },
  market: { x: 1055, y: 610 },
  alley: { x: 440, y: 625 },
  library: { x: 805, y: 620 },
  frontier: { x: 195, y: 650 },
};
const THRONE = { x: 645, y: 400 };
const WORLD = { w: 1300, h: 820 };

export default function RealmHome({ regions, counts }: { regions: Region[]; counts: Counts }) {
  const [entered, setEntered] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [tf, setTf] = useState({ x: 0, y: 0, s: 1 });
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const viewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("realm:entered") === "1") setEntered(true);
    } catch {
      /* no-op */
    }
  }, []);

  const enter = useCallback(() => {
    setEntered(true);
    try {
      sessionStorage.setItem("realm:entered", "1");
    } catch {
      /* no-op */
    }
    unlockAudio(); // ブラウザ自動再生制限の解錠（環境音は R3 / ファイル受領後に有効化）
    metric("realm_enter", {});
  }, []);

  // ドラッグで地図を巡る
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("a,button")) return;
    drag.current = { x: e.clientX, y: e.clientY, tx: tf.x, ty: tf.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    const lim = 260 * tf.s;
    setTf((p) => ({
      ...p,
      x: Math.max(-lim, Math.min(lim, drag.current!.tx + dx)),
      y: Math.max(-lim, Math.min(lim, drag.current!.ty + dy)),
    }));
  };
  const onUp = (e: React.PointerEvent) => {
    drag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }
  };

  const shown = regions.filter((r) => POS[r.id] && r.landmark);

  return (
    <main className="rlm" aria-label="伯爵MUSIAM 領土天球図">
      {/* 入領ゲート */}
      {!entered && (
        <div className="rlm-gate" role="dialog" aria-label="入領">
          <div className="rlm-gate-inner">
            <svg className="rlm-gate-seal" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="42" fill="#7e2330" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="#5c161f" strokeWidth="3" />
              <circle cx="50" cy="50" r="33" fill="none" stroke="#9a3744" strokeWidth="1" opacity=".7" />
              <text x="50" y="59" fontFamily="var(--rnv-font-display)" fontWeight="700" fontSize="30" textAnchor="middle" fill="#9a3744">M</text>
            </svg>
            <p className="rlm-gate-kicker rnv-rune">ATLAS COELESTIS · 領土天球図</p>
            <h1 className="rlm-gate-title rnv-display rnv-gold-text">伯爵 MVSIAM</h1>
            <p className="rlm-gate-sub">{counts.total}の作品でできた、ひとつの国。</p>
            <button type="button" className="rlm-gate-btn rnv-display" onClick={enter}>
              国に入る
            </button>
            <p className="rlm-gate-note">クリックで地図がひらき、放送がはじまります</p>
          </div>
        </div>
      )}

      {/* 地図ビューポート */}
      <div
        className={`rlm-view ${entered ? "is-entered" : ""}`}
        ref={viewRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <div
          className="rlm-world"
          style={{ width: WORLD.w, height: WORLD.h, transform: `translate(calc(-50% + ${tf.x}px), calc(-50% + ${tf.y}px)) scale(${tf.s})` }}
        >
          {/* 羊皮紙テクスチャ */}
          <div className="rlm-parch" aria-hidden="true">
            <svg className="rlm-tex fiber" preserveAspectRatio="none"><defs><filter id="rlmFiber"><feTurbulence type="fractalNoise" baseFrequency="0.86" numOctaves="2" seed="8" stitchTiles="stitch" /><feColorMatrix type="matrix" values="0 0 0 0 0.30  0 0 0 0 0.22  0 0 0 0 0.11  0 0 0 0.62 0" /></filter></defs><rect width="100%" height="100%" filter="url(#rlmFiber)" /></svg>
            <svg className="rlm-tex blot" preserveAspectRatio="none"><defs><filter id="rlmBlot"><feTurbulence type="fractalNoise" baseFrequency="0.011 0.015" numOctaves="5" seed="3" /><feColorMatrix type="matrix" values="0 0 0 0 0.33  0 0 0 0 0.23  0 0 0 0 0.10  0 0 0 0.78 -0.34" /></filter></defs><rect width="100%" height="100%" filter="url(#rlmBlot)" /></svg>
          </div>

          {/* 座標網＋星座線＋玉座 */}
          <svg className="rlm-lines" viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} aria-hidden="true">
            <defs>
              <radialGradient id="rlmGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#ffe9a8" stopOpacity=".55" /><stop offset="100%" stopColor="#ffe9a8" stopOpacity="0" /></radialGradient>
              <linearGradient id="rlmGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#e9cd80" /><stop offset="50%" stopColor="#b78b34" /><stop offset="100%" stopColor="#e9cd80" /></linearGradient>
            </defs>
            <g stroke="#46527a" strokeWidth="0.7" fill="none" opacity="0.18">
              <ellipse cx={THRONE.x} cy={THRONE.y} rx="560" ry="330" />
              <ellipse cx={THRONE.x} cy={THRONE.y} rx="400" ry="240" />
              <ellipse cx={THRONE.x} cy={THRONE.y} rx="240" ry="150" />
            </g>
            <g stroke="url(#rlmGold)" strokeWidth="1.2" fill="none" opacity="0.5" strokeLinecap="round">
              {shown.map((r) => {
                const p = POS[r.id];
                return <line key={r.id} x1={THRONE.x} y1={THRONE.y} x2={p.x} y2={p.y} />;
              })}
            </g>
            <circle className="rlm-throne-glow" cx={THRONE.x} cy={THRONE.y} r="40" fill="url(#rlmGlow)" />
            <circle cx={THRONE.x} cy={THRONE.y} r="9" fill="#ffe9a8" />
            <circle className="rlm-throne-ring" cx={THRONE.x} cy={THRONE.y} r="17" fill="none" stroke="#7fc6d6" strokeWidth="1" opacity="0.6" />
          </svg>

          {/* 玉座ラベル（工房） */}
          <Link href="/chat" className="rlm-throne-label rnv-display" style={{ left: THRONE.x, top: THRONE.y + 30 }} onClick={() => metric("realm_node", { id: "throne" })}>
            工房
          </Link>

          {/* 地方ノード */}
          {shown.map((r) => {
            const p = POS[r.id];
            const isHover = hover === r.id;
            return (
              <Link
                key={r.id}
                href={r.landmark!.href}
                className={`rlm-node ${r.accent} ${isHover ? "is-hover" : ""}`}
                style={{ left: p.x, top: p.y }}
                onMouseEnter={() => setHover(r.id)}
                onMouseLeave={() => setHover((h) => (h === r.id ? null : h))}
                onFocus={() => setHover(r.id)}
                onBlur={() => setHover((h) => (h === r.id ? null : h))}
                onClick={() => metric("realm_node", { id: r.id })}
                aria-label={`${r.ja}（${r.count}作品）を巡る`}
              >
                <span className="rlm-node-ring" aria-hidden="true">{r.glyph}</span>
                <span className="rlm-node-name rnv-display">{r.ja}</span>
                <span className="rlm-node-count rnv-rune">{r.count}</span>
                {/* ホバーで代表作カバーが咲く */}
                {r.landmark?.cover && (
                  <span className="rlm-bloom" aria-hidden={!isHover}>
                    <Image src={r.landmark.cover} alt="" width={92} height={92} className="rlm-bloom-img" />
                    <span className="rlm-bloom-title">{r.landmark.title}</span>
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* 題字オーバーレイ */}
        <div className="rlm-head">
          <p className="rlm-kicker rnv-rune">ATLAS COELESTIS · 領土</p>
          <h1 className="rlm-title rnv-display rnv-gold-text">伯爵 MVSIAM</h1>
          <p className="rlm-sub">作品でできた国を、歩いて・聴いて・発見する</p>
        </div>

        <p className="rlm-hint rnv-rune" aria-hidden="true">— DRAG TO ROAM · 地図を掴んで巡れ —</p>
      </div>

      {/* SEO二層・アクセシビリティ: 索引リンク（テキスト） */}
      <nav className="rlm-index" aria-label="地方の索引">
        <h2 className="rlm-index-title rnv-display">領土の索引</h2>
        <p className="rlm-index-lead">
          {counts.total}の作品（楽曲{counts.music}・書籍{counts.books}
          {counts.films ? `・映像${counts.films}` : ""}）が{shown.length}の地方をかたちづくる。
        </p>
        <ul className="rlm-index-list">
          {shown.map((r) => (
            <li key={r.id}>
              <Link href={r.landmark!.href}>
                {r.ja}（{r.en}）— {r.count}作品
              </Link>
            </li>
          ))}
        </ul>
        <p className="rlm-index-foot">
          <Link href="/works">全作品の索引（展示）へ</Link> · <Link href="/classic">クラシック表示</Link>
        </p>
      </nav>
    </main>
  );
}
