"use client";
// src/components/realm/RealmHome.tsx
// 没入アトラス・ホーム（リノベv2 / R1入領ゲート + R2地図）。
// 羊皮紙の天球図を実コンポーネント化。入領クリックで音声解錠＋地図展開、ドラッグで巡る、
// 地方ノードにホバーで代表作カバーが「星のように咲く」。SEO二層（下部に索引リンク）＋a11y。
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { track as metric } from "@/lib/metrics";
import { unlockAudio, playEnterSfx } from "@/lib/realm/audio";
import { setRegionAmbient, setMuted, isMuted } from "@/lib/realm/ambient";
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
// 左上（題字ゾーン x<430,y<210）と中心（玉座）を避けて配置し、重なりを防ぐ。
const POS: Record<string, { x: number; y: number }> = {
  shrine: { x: 715, y: 150 },
  highland: { x: 1000, y: 250 },
  coast: { x: 1060, y: 450 },
  market: { x: 1000, y: 640 },
  library: { x: 740, y: 678 },
  alley: { x: 470, y: 660 },
  reverie: { x: 560, y: 530 },
  dawn: { x: 250, y: 545 },
  skyfield: { x: 200, y: 380 },
  citadel: { x: 300, y: 245 },
  frontier: { x: 130, y: 665 },
};
const THRONE = { x: 660, y: 392 };
const WORLD = { w: 1300, h: 820 };

// 施設（機能の部屋）— 国の全機能を地図の縁から入れる。領地ノードと別レイヤー。
type Facility = { id: string; ja: string; sub: string; href: string; glyph: string; x: number; y: number };
const FACILITIES: Facility[] = [
  { id: "showcase", ja: "国の意匠", sub: "ショーケース", href: "/showcase", glyph: "❖", x: 1190, y: 150 },
  { id: "shop", ja: "交易所", sub: "ショップ", href: "/shop", glyph: "⚖", x: 1210, y: 360 },
  { id: "letters", ja: "伯爵の手紙", sub: "書簡・年代記", href: "/letters", glyph: "✉", x: 1210, y: 580 },
  { id: "atelier", ja: "弟子入り", sub: "講座", href: "/atelier", glyph: "✎", x: 95, y: 200 },
  { id: "business", ja: "工房依頼", sub: "法人・楽曲制作", href: "/business", glyph: "⚒", x: 95, y: 470 },
];

// 近道メニュー（モバイル＆SEO用・常時テキストで提示）。
const QUICKLINKS: { id: string; ja: string; href: string }[] = [
  { id: "chat", ja: "伯爵と話す", href: "/chat" },
  { id: "works", ja: "展示（全作品）", href: "/works" },
  { id: "letters", ja: "伯爵の手紙〈書簡・年代記〉", href: "/letters" },
  { id: "shop", ja: "交易所〈ショップ〉", href: "/shop" },
  { id: "business", ja: "工房依頼〈法人・楽曲制作〉", href: "/business" },
  { id: "atelier", ja: "弟子入り〈講座〉", href: "/atelier" },
];

export default function RealmHome({ regions, counts }: { regions: Region[]; counts: Counts }) {
  const [entered, setEntered] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);
  const [tf, setTf] = useState({ x: 0, y: 0, s: 1 });
  const drag = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const viewRef = useRef<HTMLDivElement | null>(null);

  const shownRef = useRef<Region[]>([]);

  const visitRegion = useCallback((id: string) => {
    setHover(id);
    setRegionAmbient(id); // 地方を移ると環境音がクロスフェード（音源があれば）
  }, []);

  const toggleMute = useCallback(() => {
    setMutedState((m) => {
      const next = !m;
      setMuted(next);
      metric("realm_mute", { muted: next });
      return next;
    });
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("realm:entered") === "1") setEntered(true);
    } catch {
      /* no-op */
    }
    setMutedState(isMuted());
  }, []);

  const enter = useCallback(() => {
    setEntered(true);
    try {
      sessionStorage.setItem("realm:entered", "1");
    } catch {
      /* no-op */
    }
    unlockAudio(); // ブラウザ自動再生制限の解錠
    playEnterSfx(); // 入領の効果音（任意・無ければ静か）
    // 入領したら最初の地方の環境音を始める（音源があれば。無ければ静寂）
    const first = shownRef.current[0];
    if (first) setRegionAmbient(first.id);
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
    const lim = 380 * tf.s;
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
  shownRef.current = shown;

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
            <div className="rlm-gate-actions">
              <Link
                href="/chat"
                className="rlm-gate-btn rlm-gate-btn-primary rnv-display"
                onClick={() => metric("realm_gate", { choice: "chat" })}
                autoFocus
              >
                伯爵と話す
              </Link>
              <button
                type="button"
                className="rlm-gate-btn rlm-gate-btn-ghost rnv-display"
                onClick={() => { metric("realm_gate", { choice: "roam" }); enter(); }}
              >
                国を巡る
              </button>
            </div>
            <p className="rlm-gate-note">「話す」は館主・伯爵との対話へ。「巡る」で地図がひらきます。</p>
          </div>
        </div>
      )}

      {/* 地図ビューポート */}
      <div
        className={`rlm-view ${entered ? "is-entered" : ""}`}
        ref={viewRef}
        aria-hidden={!entered}
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

          {/* 玉座ラベル（伯爵との対話へ） */}
          <Link href="/chat" className="rlm-throne-label rnv-display" style={{ left: THRONE.x, top: THRONE.y + 30 }} onClick={() => metric("realm_node", { id: "throne" })}>
            伯爵と話す
          </Link>

          {/* 地方ノード */}
          {shown.map((r) => {
            const p = POS[r.id];
            const isHover = hover === r.id;
            return (
              <Link
                key={r.id}
                href={`/realm/${r.id}`}
                className={`rlm-node ${r.accent} ${isHover ? "is-hover" : ""}`}
                style={{ left: p.x, top: p.y }}
                onMouseEnter={() => visitRegion(r.id)}
                onMouseLeave={() => setHover((h) => (h === r.id ? null : h))}
                onFocus={() => visitRegion(r.id)}
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

          {/* 施設（機能の部屋）— 国の縁に建つ */}
          {FACILITIES.map((f) => (
            <Link
              key={f.id}
              href={f.href}
              className="rlm-facility"
              style={{ left: f.x, top: f.y }}
              onClick={() => metric("realm_facility", { id: f.id })}
              aria-label={`${f.ja}（${f.sub}）へ`}
            >
              <span className="rlm-facility-ring" aria-hidden="true">{f.glyph}</span>
              <span className="rlm-facility-name rnv-display">{f.ja}</span>
              <span className="rlm-facility-sub rnv-rune" aria-hidden="true">{f.sub}</span>
            </Link>
          ))}
        </div>

        {/* 題字オーバーレイ */}
        <div className="rlm-head">
          <p className="rlm-kicker rnv-rune">ATLAS COELESTIS · 領土</p>
          <h1 className="rlm-title rnv-display rnv-gold-text">伯爵 MVSIAM</h1>
          <p className="rlm-sub">作品でできた国を、歩いて・聴いて・発見する</p>
        </div>

        <p className="rlm-hint rnv-rune" aria-hidden="true">— DRAG TO ROAM · 地図を掴んで巡れ —</p>

        {/* 放送コントロール（環境音 / R3） */}
        {entered && (
          <button
            type="button"
            className="rlm-mute rnv-rune"
            onClick={toggleMute}
            aria-pressed={muted}
            aria-label={muted ? "放送をオンにする" : "放送をミュート"}
            title={muted ? "放送オン" : "放送ミュート"}
          >
            {muted ? "♪ OFF" : "♪ ON"}
          </button>
        )}
      </div>

      {/* SEO二層・アクセシビリティ: 索引リンク（テキスト） */}
      <nav className="rlm-index" aria-label="館の入口と索引">
        {/* 主要な入口（モバイルでも迷わず辿り着ける近道） */}
        <h2 className="rlm-index-title rnv-display">主要な入口</h2>
        <ul className="rlm-quicklinks">
          {QUICKLINKS.map((q) => (
            <li key={q.id}>
              <Link href={q.href} onClick={() => metric("home_quicklink", { id: q.id })}>
                {q.ja}
              </Link>
            </li>
          ))}
        </ul>

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
