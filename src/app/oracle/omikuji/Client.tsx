// src/app/oracle/omikuji/Client.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import OmikujiCard, { OmikujiEntry } from "@/components/omikuji/OmikujiCard";

/** ランク序列（上→下） */
const RANK_ORDER = [
  "Great Luck",
  "Good Luck",
  "Small Luck",
  "Mixed Luck",
  "Later Luck",
  "Slight Later Luck",
  "Bad Luck",
] as const;

function rankIndex(rankEn: string): number {
  const i = RANK_ORDER.findIndex((r) => r.toLowerCase() === rankEn.toLowerCase());
  return i >= 0 ? i : 1;
}

/** ランク→アクセントカラー（カードと近似） */
function rankAccent(rankEn: string): string {
  const k = rankEn.toLowerCase();
  switch (k) {
    case "great luck": return "#D8B65C";
    case "good luck": return "#6FAF7A";
    case "small luck": return "#79A7D1";
    case "mixed luck": return "#9AA4B2";
    case "later luck": return "#B9A2C8";
    case "slight later luck": return "#CABBA6";
    case "bad luck": return "#A7A7A7";
    default: return "#9CA3AF";
  }
}

/** ローカル日次状態 */
type DayState = { ymd: string; draws: number; lastRankIdx: number | null };
const LS_KEY = "omikuji_day_state";
function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function readDayState(): DayState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ymd: todayYMD(), draws: 0, lastRankIdx: null };
    const parsed: DayState = JSON.parse(raw);
    if (parsed.ymd !== todayYMD()) return { ymd: todayYMD(), draws: 0, lastRankIdx: null };
    return parsed;
  } catch {
    return { ymd: todayYMD(), draws: 0, lastRankIdx: null };
  }
}
function writeDayState(patch: Partial<DayState>) {
  const base = readDayState();
  const next = { ...base, ...patch };
  try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
  return next;
}

/** 作品データ（public/works/works.json を読む） */
type WorkItem = {
  id: string;
  title: string;
  type?: string;
  cover?: string;      // 例: /works/covers/xxx.webp
  href?: string;       // 外部/内部どちらでもOK
  previewUrl?: string; // 任意：別プレビュー
};

/** レコメンド型（凶は固定、通常は作品ベース） */
type FixedReco = { kind: "fixed"; titleJa: string; titleEn: string; noteJa: string; noteEn: string; href?: string };
type WorksReco = { kind: "works"; noteJa: string; noteEn: string; works: WorkItem[] };
type Reco = FixedReco | WorksReco;

/** 配列から重複なしランダム抽出 */
function sampleArray<T>(arr: T[], n: number): T[] {
  if (n <= 0) return [];
  if (arr.length <= n) return [...arr];
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

export default function Client() {
  const sp = useSearchParams();
  const router = useRouter();

  // クエリ
  const langParam = sp?.get("lang");
  const lang = (langParam === "en" ? "en" : "ja") as "ja" | "en";
  const idQuery: string | null = sp?.get("id") ?? null;

  // 状態
  const [all, setAll] = useState<OmikujiEntry[] | null>(null);
  const [entry, setEntry] = useState<OmikujiEntry | null>(null);
  const [drawn, setDrawn] = useState(false);
  const [animIn, setAnimIn] = useState(false);
  const [day, setDay] = useState<DayState | null>(null);

  // 作品一覧（おすすめ用）
  const [works, setWorks] = useState<WorkItem[] | null>(null);
  const [pickedWorks, setPickedWorks] = useState<WorkItem[] | null>(null);

  // 初期ロード（おみくじ＆作品）
  useEffect(() => {
    let alive = true;

    // 御籤データ：パス揺れに対応（/omikuji/abi.json or /oracle/omikuji/abi.json）
    async function loadOmikuji() {
      const paths = ["/omikuji/abi.json", "/oracle/omikuji/abi.json"];
      let ok = false;
      for (const p of paths) {
        try {
          const r = await fetch(p, { cache: "no-store" });
          if (!r.ok) continue;
          const d = await r.json();
          if (!alive) return;
          const list = Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : [];
          setAll(list);
          ok = true;
          break;
        } catch { /* 次へ */ }
      }
      if (!ok && alive) setAll([]); // 失敗してもUIは壊さない
    }

    // 作品データ：本命 /works/works.json → 予備 /works.json
    async function loadWorks() {
      const candidates = ["/works/works.json", "/works.json"];
      for (const p of candidates) {
        try {
          const r = await fetch(p, { cache: "no-store" });
          if (!r.ok) continue;
          const d = await r.json();
          const raw: any[] = Array.isArray(d) ? d : Array.isArray(d?.items) ? d.items : [];
          const list: WorkItem[] = raw
            .map((w: any) => ([
              String(w.title ?? w.titleJa ?? w.titleEn ?? "Untitled"),
              String(w.id ?? w.slug ?? Math.random()),
              w.type ?? w.kind ?? "",
              w.href ?? w.url ?? w.link ?? undefined,
              w.cover
                ? (String(w.cover).startsWith("http") || String(w.cover).startsWith("/") ? String(w.cover) : "/" + String(w.cover))
                : (w.slug ? `/works/covers/${w.slug}.webp` : undefined),
              w.previewUrl ?? undefined
            ]))
            .map(([title, id, type, href, cover, previewUrl]) => ({ title, id, type, href, cover, previewUrl }));
          if (alive) setWorks(list);
          return;
        } catch { /* 次へ */ }
      }
      if (alive) setWorks([]); // 失敗でもUIは壊さない
    }

    loadOmikuji();
    loadWorks();
    setDay(readDayState());

    return () => { alive = false; };
  }, []);

  // ?id= がある場合は即表示（シェア互換）
  useEffect(() => {
    if (!all) return;
    if (idQuery) {
      const found = all.find((x) => String(x.id) === idQuery) ?? all[0];
      setEntry(found);
      setDrawn(true);
      requestAnimationFrame(() => setAnimIn(true));
    } else {
      setEntry(null);
      setDrawn(false);
      setAnimIn(false);
    }
  }, [all, idQuery]);

  /** ランダム抽選（上限なし） */
  const drawRandom = () => {
    if (!all || all.length === 0) return null;
    return all[Math.floor(Math.random() * all.length)];
  };

  /** 下降抽選：前回より下位のみから選ぶ（なければ最下位） */
  const drawLower = (currentRankIdx: number) => {
    if (!all || all.length === 0) return null;
    const targetIdx = Math.min(currentRankIdx + 1, RANK_ORDER.length - 1);
    const candidates = all.filter((e) => rankIndex(e.rank_en) >= targetIdx);
    if (candidates.length === 0) {
      const worstIdx = Math.max(...all.map((e) => rankIndex(e.rank_en)));
      const worsts = all.filter((e) => rankIndex(e.rank_en) === worstIdx);
      return worsts[Math.floor(Math.random() * worsts.length)];
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  };

  /** URL更新（lang/id を刻む） */
  const pushIdToUrl = (id: number) => {
    const search = new URLSearchParams(Array.from(sp?.entries?.() ?? []));
    search.set("lang", lang);
    search.set("id", String(id));
    router.replace(`/oracle/omikuji?${search.toString()}`, { scroll: false });
  };

  /** 「一枚引く」：初回はランダム、状態記録＋おすすめ確定 */
  const draw = () => {
    const pick = drawRandom();
    if (!pick) return;
    setEntry(pick);
    setDrawn(true);
    setAnimIn(false);
    pushIdToUrl(pick.id);
    requestAnimationFrame(() => setAnimIn(true));

    const idx = rankIndex(pick.rank_en);
    setDay(writeDayState({ draws: 1, lastRankIdx: idx }));

    // 凶以外のみ、作品からランダム抽出を固定（初回表示用）
    if (works && works.length > 0 && pick.rank_en.toLowerCase() !== "bad luck") {
      setPickedWorks(sampleArray(works, 6)); // 6=3列×2段
    } else {
      setPickedWorks(null);
    }
  };

  /** 「もう一度引く（おすすめしない）」：下げ抽選＋おすすめは消す */
  const drawAgain = () => {
    const base = day ?? readDayState();
    const lastIdx = base.lastRankIdx ?? (entry ? rankIndex(entry.rank_en) : 2);
    const pick = drawLower(lastIdx);
    if (!pick) return;
    setEntry(pick);
    setDrawn(true);
    setAnimIn(false);
    pushIdToUrl(pick.id);
    requestAnimationFrame(() => setAnimIn(true));
    const nextIdx = Math.max(lastIdx, rankIndex(pick.rank_en));
    setDay(writeDayState({ draws: (base.draws ?? 0) + 1, lastRankIdx: nextIdx }));

    // 2回目以降は“おすすめしない”のでクリア
    setPickedWorks(null);
  };

  const handleCopyShare = () => {
    if (!entry) return;
    const u = new URL(window.location.href);
    u.searchParams.set("lang", lang);
    u.searchParams.set("id", String(entry.id));
    navigator.clipboard.writeText(u.toString());
    alert(lang === "ja" ? "シェア用URLをコピーしました" : "Copied shareable URL");
  };

  const switchLang = (to: "ja" | "en") => {
    const search = new URLSearchParams(Array.from(sp?.entries?.() ?? []));
    search.set("lang", to);
    if (entry) search.set("id", String(entry.id)); else search.delete("id");
    router.push(`/oracle/omikuji?${search.toString()}`);
  };

  const drawsToday = day?.draws ?? 0;
  const lastRankText = useMemo(() => {
    if (!entry) return null;
    const idx = rankIndex(entry.rank_en);
    const labelJa = ["大吉","吉","小吉","半吉","末吉","末小吉","凶"][idx] ?? entry.rank_ja;
    return lang === "ja" ? labelJa : RANK_ORDER[idx];
  }, [entry, lang]);

  /** レコメンド構築（凶は固定、通常はpickedWorks。初回のみ表示） */
  const recommendation: Reco | null = useMemo(() => {
    if (!entry) return null;
    const rank = entry.rank_en.toLowerCase();

    if (rank === "bad luck") {
      return {
        kind: "fixed",
        titleJa: "星海の眠り — ヒーリング音楽",
        titleEn: "Starsea Slumber — Healing Ambient",
        noteJa: "今日はゆっくり休んでください。",
        noteEn: "Please take it slow and rest today.",
        href: "https://open.spotify.com/album/79CuhhEhb0GtBzgkk7fwsY",
      };
    }

    if (pickedWorks && pickedWorks.length > 0 && drawsToday <= 1) {
      return {
        kind: "works",
        noteJa: "今日の御籤に寄り添う作品たち。気になったものからどうぞ。",
        noteEn: "A few works that vibe with today’s draw. Pick what intrigues you.",
        works: pickedWorks,
      };
    }
    return null;
  }, [entry, pickedWorks, drawsToday]);

  const accent = entry ? rankAccent(entry.rank_en) : "#9CA3AF";

  return (
    <main className="mx-auto max-w-6xl p-6">
      {/* ヘッダー */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-serif text-2xl">
          {lang === "ja" ? "伯爵御籤 — 日本語" : "Count’s Omikuji — English"}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => switchLang("ja")}
            className={`rounded-md px-3 py-1 text-sm ring-1 ${lang==="ja"?"bg-zinc-900 text-white ring-zinc-900":"ring-zinc-300"}`}
          >日本語</button>
          <button
            onClick={() => switchLang("en")}
            className={`rounded-md px-3 py-1 text-sm ring-1 ${lang==="en"?"bg-zinc-900 text-white ring-zinc-900":"ring-zinc-300"}`}
          >English</button>
        </div>
      </div>

      {/* ローディング */}
      {!all && <div className="opacity-60">Loading…</div>}

      {/* まだ引いてない時：CTA（1日1回の記載あり） */}
      {all && !drawn && (
        <section className="grid place-items-center py-16">
          <div className="rounded-2xl border border-zinc-300 bg-white/70 p-10 text-center shadow-sm">
            <div className="mb-3 font-serif text-xl">
              {lang === "ja" ? "本日の御籤を引く" : "Draw today’s Omikuji"}
            </div>
            <p className="mb-2 text-sm opacity-70">
              {lang === "ja" ? "クリックすると一枚の御籤が現れます。" : "Click to reveal one card."}
            </p>
            <p className="text-xs opacity-60">
              {lang === "ja" ? "※ 本日は1回まで" : "※ One draw per day"}
            </p>
            <button
              onClick={draw}
              className="mt-6 min-w-32 rounded-xl bg-zinc-900 px-6 py-3 text-white shadow transition hover:opacity-90 active:scale-[0.99]"
            >
              {lang === "ja" ? "一枚引く" : "Draw One"}
            </button>
          </div>
        </section>
      )}

      {/* 引いた後：カード & 戒め & レコメンド & 操作 */}
      {entry && drawn && (
        <>
          {/* ステータス */}
          <div className="mb-3 text-sm opacity-70">
            {lang === "ja"
              ? `本日 ${drawsToday} 回目 / 現在のランク：${lastRankText}`
              : `Today ${drawsToday} draw(s) / Current rank: ${lastRankText}`}
          </div>

          {/* カード */}
          <div className={`transition duration-400 ease-out will-change-transform ${animIn ? "opacity-100 translate-x-0" : "opacity-0 translate-x-3"}`}>
            <OmikujiCard entry={entry} lang={lang} />
          </div>

          {/* 何度も引いた人へのメッセージ（2回目以降で表示） */}
          {drawsToday >= 2 && (
            <div className="mt-5 rounded-lg border border-zinc-300 bg-white/70 p-4 text-sm">
              {lang === "ja" ? (
                <>
                  おみくじは最初の一枚こそが神の導きであり、何度も引くものではありません。<br />
                  明日またお試しください。
                </>
              ) : (
                <>
                  The first draw is the true guidance; omikuji isn’t meant to be drawn repeatedly.<br />
                  Please try again tomorrow.
                </>
              )}
            </div>
          )}

          {/* レコメンド（凶：固定） */}
          {recommendation && recommendation.kind === "fixed" && (
            <section className="mt-6 rounded-xl border bg-white/70 p-5" style={{ borderColor: `${accent}66` }}>
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
                <span className="font-serif text-[15px]">
                  {lang === "ja" ? `${entry.rank_ja} を引いたあなたには、これがおすすめ` : `Because you drew ${entry.rank_en}, this is recommended`}
                </span>
              </div>
              <div className="mb-2 text-[15px] font-medium">
                {lang === "ja" ? recommendation.titleJa : recommendation.titleEn}
              </div>
              <div className="text-sm opacity-70">
                {lang === "ja" ? recommendation.noteJa : recommendation.noteEn}
              </div>
              {recommendation.href && (
                <div className="mt-3">
                  <Link
  href={recommendation.href}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
>

                    {lang === "ja" ? "作品を見る" : "View the work"}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M7 17L17 7M17 7H9M17 7v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </Link>
                </div>
              )}
            </section>
          )}

          {/* レコメンド（通常：作品グリッド） */}
          {recommendation && recommendation.kind === "works" && (
            <section className="mt-6 rounded-xl border bg-white/70 p-5" style={{ borderColor: `${accent}66` }}>
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
                <span className="font-serif text-[15px]">
                  {lang === "ja" ? `${entry.rank_ja} を引いたあなたへのおすすめ` : `Recommended for your draw (${entry.rank_en})`}
                </span>
              </div>
              <div className="text-sm opacity-70 mb-3">
                {lang === "ja" ? recommendation.noteJa : recommendation.noteEn}
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {recommendation.works.map((w) => (
                  <div key={w.id} className="group rounded-lg border border-zinc-200 overflow-hidden bg-white/80 hover:shadow-sm transition">
                    {w.cover ? (
                      <div className="relative aspect-[3/4] overflow-hidden bg-zinc-100">
                        <Image
                          src={w.cover}
                          alt={w.title}
                          fill
                          sizes="(min-width: 1024px) 16vw, (min-width: 640px) 30vw, 45vw"
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[3/4] grid place-items-center text-xs opacity-50">No Image</div>
                    )}
                    <div className="p-2">
                      <div className="line-clamp-2 text-[13px] font-medium">{w.title}</div>
                      {(w.href || w.previewUrl) && (
                        <div className="mt-2">
                          <Link
  href={w.href || w.previewUrl!}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50"
>

                            {lang === "ja" ? "作品を見る" : "Open"}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path d="M7 17L17 7M17 7H9M17 7v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 操作列 */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={handleCopyShare} className="rounded-md ring-1 ring-zinc-300 px-4 py-2">
              {lang === "ja" ? "シェア用URLコピー" : "Copy share URL"}
            </button>
            <button onClick={drawAgain} className="rounded-md ring-1 ring-zinc-300 px-4 py-2">
              {lang === "ja" ? "もう一度引く（おすすめしない）" : "Draw again (not recommended)"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
