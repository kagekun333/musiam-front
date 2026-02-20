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
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    // Silently ignore localStorage errors
  }
  return next;
}

/** 作品データ（public/works/works.json を読む） */
type WorkItem = {
  id: string;
  stableKey?: string;  // 🆕 安定キー（重複ID対策）
  title: string;
  type?: string;
  cover?: string;      // 例: /works/covers/xxx.webp
  href?: string;       // 外部/内部どちらでもOK
  primaryHref?: string; // 🆕 優先リンク
  salesHref?: string;  // 🆕 購入リンク
  previewUrl?: string; // 任意：別プレビュー
};

/** レコメンド型（凶は固定、通常は作品ベース） */
type FixedReco = { kind: "fixed"; titleJa: string; titleEn: string; noteJa: string; noteEn: string; href?: string };
type WorksReco = { kind: "works"; noteJa: string; noteEn: string; works: WorkItem[] };
type Reco = FixedReco | WorksReco;

/** URLからサービス名を含むリンクラベルを返す（防御的: href未設定でも動作） */
function serviceLinkLabel(href: string, type: string | undefined, lang: "ja" | "en"): string {
  const h = href ?? "";
  if (/spotify\.com/i.test(h))        return lang === "ja" ? "Spotifyで聴く"       : "Listen on Spotify";
  if (/music\.apple\.com/i.test(h))   return lang === "ja" ? "Apple Musicで聴く"   : "Listen on Apple Music";
  if (/itunes\.apple\.com/i.test(h))  return lang === "ja" ? "iTunesで聴く"        : "Listen on iTunes";
  if (/youtube\.com|youtu\.be/i.test(h)) return lang === "ja" ? "YouTubeで観る"    : "Watch on YouTube";
  if (/amazon\.co\.jp|amazon\.com/i.test(h)) return lang === "ja" ? "Amazonで購入" : "Buy on Amazon";
  // サービス不明時はコンテンツタイプで判定
  if (type?.toLowerCase() === "music") return lang === "ja" ? "聴く"  : "Listen";
  return lang === "ja" ? "見る" : "View";
}

/** 購入リンクのサービス名ラベル */
function saleLinkLabel(href: string, lang: "ja" | "en"): string {
  const h = href ?? "";
  if (/amazon\.co\.jp|amazon\.com/i.test(h))  return lang === "ja" ? "Amazonで購入"  : "Buy on Amazon";
  if (/itunes\.apple\.com/i.test(h))           return lang === "ja" ? "iTunesで購入"  : "Buy on iTunes";
  if (/music\.apple\.com/i.test(h))            return lang === "ja" ? "Apple Musicで購入" : "Buy on Apple Music";
  return lang === "ja" ? "購入" : "Buy";
}

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
  const [copied, setCopied] = useState(false);

  // フェーズ管理（準備 → 儀式 → 結果）
  const [phase, setPhase] = useState<"prepare" | "ritual" | "result">("prepare");

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

          // ID重複検出
          const idCounts = new Map<string, number>();
          raw.forEach((w: any) => {
            const id = String(w?.id ?? "");
            idCounts.set(id, (idCounts.get(id) || 0) + 1);
          });

          const list: WorkItem[] = raw.map((w: any, idx: number) => {
            const id = String(w.id ?? w.slug ?? `work_${idx}`);
            const isDuplicate = (idCounts.get(id) || 0) > 1;
            const stableKey = isDuplicate ? `${id}__${idx}` : id;

            const title = String(w.title ?? w.titleJa ?? w.titleEn ?? "Untitled");
            const type = w.type ?? w.kind ?? "";
            const cover = w.cover
              ? (String(w.cover).startsWith("http") || String(w.cover).startsWith("/")
                  ? String(w.cover)
                  : "/" + String(w.cover))
              : (w.slug ? `/works/covers/${w.slug}.webp` : undefined);

            // リンク正規化
            const links = w?.links ?? {};
            const primaryHref = w?.primaryHref ?? links?.listen ?? w?.href ?? links?.spotify ?? undefined;
            const salesHref = w?.salesHref ?? links?.itunesBuy ?? undefined;
            const href = primaryHref || w?.href || w?.url || w?.link || undefined;

            return {
              id,
              stableKey,
              title,
              type,
              cover,
              href,
              primaryHref,
              salesHref,
              previewUrl: w?.previewUrl,
            };
          });

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

  // ?id= がある場合は即表示（シェア互換）：儀式スキップして結果へ
  useEffect(() => {
    if (!all) return;
    if (idQuery) {
      const found = all.find((x) => String(x.id) === idQuery) ?? all[0];
      setEntry(found);
      setDrawn(true);
      setPhase("result"); // 直接結果表示
      requestAnimationFrame(() => setAnimIn(true));
    } else {
      setEntry(null);
      setDrawn(false);
      setAnimIn(false);
      setPhase("prepare");
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

  /** 「一枚引く」：準備 → 儀式 → 結果 の3フェーズ */
  const draw = () => {
    const pick = drawRandom();
    if (!pick) return;

    // Phase 1: 準備完了 → 儀式へ
    setPhase("ritual");
    setEntry(pick);
    setDrawn(true);

    // prefers-reduced-motion 対応（短縮 or 無効化）
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ritualDuration = prefersReducedMotion ? 600 : 1800; // 0.6s or 1.8s

    // Phase 2: 儀式演出（タイマー）
    setTimeout(() => {
      // Phase 3: 結果表示
      setPhase("result");
      setAnimIn(false);
      pushIdToUrl(pick.id);
      requestAnimationFrame(() => setAnimIn(true));

      const idx = rankIndex(pick.rank_en);
      setDay(writeDayState({ draws: 1, lastRankIdx: idx }));

      // 凶以外のみ、作品からランダム抽出を固定（初回表示用）
      // 音楽と本を分離して、それぞれ3つずつ抽出
      if (works && works.length > 0 && pick.rank_en.toLowerCase() !== "bad luck") {
        const musicList = works.filter((w) => w.type?.toLowerCase() === "music" || w.type?.toLowerCase() === "音楽");
        const bookList = works.filter((w) => w.type?.toLowerCase() === "book" || w.type?.toLowerCase() === "本");
        const picked = [
          ...sampleArray(musicList, 3),
          ...sampleArray(bookList, 3),
        ];
        setPickedWorks(picked);
      } else {
        setPickedWorks(null);
      }
    }, ritualDuration);
  };

  /** 「もう一度引く（おすすめしない）」：下げ抽選＋おすすめは消す */
  const drawAgain = () => {
    const base = day ?? readDayState();
    const lastIdx = base.lastRankIdx ?? (entry ? rankIndex(entry.rank_en) : 2);
    const pick = drawLower(lastIdx);
    if (!pick) return;

    // 儀式フェーズへ
    setPhase("ritual");
    setEntry(pick);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ritualDuration = prefersReducedMotion ? 600 : 1800;

    setTimeout(() => {
      setPhase("result");
      setDrawn(true);
      setAnimIn(false);
      pushIdToUrl(pick.id);
      requestAnimationFrame(() => setAnimIn(true));
      const nextIdx = Math.max(lastIdx, rankIndex(pick.rank_en));
      setDay(writeDayState({ draws: (base.draws ?? 0) + 1, lastRankIdx: nextIdx }));

      // 2回目以降は"おすすめしない"のでクリア
      setPickedWorks(null);
    }, ritualDuration);
  };

  const handleCopyShare = () => {
    if (!entry) return;
    const u = new URL(window.location.href);
    u.searchParams.set("lang", lang);
    u.searchParams.set("id", String(entry.id));
    navigator.clipboard.writeText(u.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
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

  /** 音楽と本を分離 */
  const { musicWorks, bookWorks } = useMemo(() => {
    if (!pickedWorks || pickedWorks.length === 0) {
      return { musicWorks: [], bookWorks: [] };
    }
    const music = pickedWorks.filter((w) => w.type?.toLowerCase() === "music" || w.type?.toLowerCase() === "音楽").slice(0, 3);
    const books = pickedWorks.filter((w) => w.type?.toLowerCase() === "book" || w.type?.toLowerCase() === "本").slice(0, 3);
    return { musicWorks: music, bookWorks: books };
  }, [pickedWorks]);

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
        noteEn: "A few works that vibe with today's draw. Pick what intrigues you.",
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
            className={`rounded-md px-3 py-1 text-sm ring-1 ${lang==="ja"?"bg-white/10 text-white ring-white/30":"ring-white/20 text-gray-300"}`}
          >日本語</button>
          <button
            onClick={() => switchLang("en")}
            className={`rounded-md px-3 py-1 text-sm ring-1 ${lang==="en"?"bg-white/10 text-white ring-white/30":"ring-white/20 text-gray-300"}`}
          >English</button>
        </div>
      </div>

      {/* ローディング */}
      {!all && (
        <div className="flex items-center gap-3 py-16 opacity-70">
          <div
            className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white"
            style={{ animation: "spin 1s linear infinite" }}
          />
          <span className="text-sm">{lang === "ja" ? "読み込み中…" : "Loading…"}</span>
        </div>
      )}

      {/* Phase 1: 準備（まだ引いてない時） */}
      {all && phase === "prepare" && !drawn && (
        <section className="grid place-items-center py-16">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 backdrop-blur-sm p-10 text-center shadow-sm">
            <div className="mb-3 font-serif text-xl">
              {lang === "ja" ? "本日の御籤を引く" : "Draw today's Omikuji"}
            </div>
            <p className="mb-2 text-sm opacity-70">
              {lang === "ja" ? "心を静めて、運命の扉を開きましょう。" : "Quiet your mind and open the door to destiny."}
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

      {/* Phase 2: 儀式（演出中） */}
      {phase === "ritual" && entry && (
        <section className="grid place-items-center py-24">
          <div className="text-center">
            <div
              className="mx-auto mb-6 h-16 w-16 rounded-full border-4 border-white/20 border-t-white motion-reduce:border-t-white/50"
              style={{
                animation: "spin 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite",
              }}
            />
            <div className="font-serif text-xl opacity-70">
              {lang === "ja" ? "運命を読み解いています…" : "Reading your destiny…"}
            </div>
          </div>
        </section>
      )}

      {/* Phase 3: 結果（啓示） */}
      {phase === "result" && entry && drawn && (
        <div className={`transition-opacity duration-700 ease-out ${animIn ? "opacity-100" : "opacity-0"}`}>
          {/* ステータス */}
          <div className="mb-3 text-sm opacity-70">
            {lang === "ja"
              ? `本日 ${drawsToday} 回目 / 現在のランク：${lastRankText}`
              : `Today ${drawsToday} draw(s) / Current rank: ${lastRankText}`}
          </div>

          {/* おみくじカード（原文/訳文/解釈） */}
          <div className="mb-6">
            <OmikujiCard entry={entry} lang={lang} />
          </div>

          {/* 何度も引いた人へのメッセージ（2回目以降で表示） */}
          {drawsToday >= 2 && (
            <div className="mt-5 rounded-lg border border-white/10 bg-zinc-900/60 backdrop-blur-sm p-4 text-sm">
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
            <section className="mt-6 rounded-xl border bg-zinc-900/60 backdrop-blur-sm p-5" style={{ borderColor: `${accent}66` }}>
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
  className="inline-flex items-center gap-2 rounded-md border border-white/20 px-3 py-1.5 text-sm hover:bg-white/5"
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

          {/* レコメンド（通常：作品グリッド - 上段=音楽3、下段=本3） */}
          {recommendation && recommendation.kind === "works" && (musicWorks.length > 0 || bookWorks.length > 0) && (
            <section className="mt-6 rounded-xl border bg-zinc-900/60 p-5 shadow-sm backdrop-blur-sm" style={{ borderColor: `${accent}33` }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent }} />
                <span className="font-serif text-base font-medium text-gray-100">
                  {lang === "ja" ? `${entry.rank_ja} を引いたあなたへのおすすめ` : `Recommended for your draw (${entry.rank_en})`}
                </span>
              </div>
              <div className="text-sm text-gray-400 mb-4">
                {lang === "ja" ? recommendation.noteJa : recommendation.noteEn}
              </div>

              {/* 上段: 音楽 3枚 (正方形 1:1) */}
              {musicWorks.length > 0 && (
                <div className="mb-5">
                  <h3 className="mb-2.5 text-xs font-medium uppercase tracking-wider text-gray-400">
                    {lang === "ja" ? "音楽" : "Music"}
                  </h3>
                  <div className="grid grid-cols-1 min-[480px]:grid-cols-2 min-[720px]:grid-cols-3 gap-3">
                    {musicWorks.map((w) => (
                      <div key={w.id} className="group min-w-0 rounded-lg border border-white/10 overflow-hidden bg-zinc-800/60 hover:bg-zinc-800/80 transition">
                        {w.cover ? (
                          <div className="relative aspect-square overflow-hidden bg-zinc-800/80">
                            <Image
                              src={w.cover}
                              alt={w.title}
                              fill
                              sizes="(min-width: 800px) 33vw, (min-width: 500px) 50vw, 100vw"
                              className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-[1.05]"
                            />
                          </div>
                        ) : (
                          <div className="aspect-square grid place-items-center text-xs text-gray-500 bg-zinc-800/80">No Image</div>
                        )}
                        <div className="p-2.5 min-h-[72px] flex flex-col">
                          <div className="flex-1 line-clamp-2 text-sm font-medium text-gray-100 mb-1.5">{w.title}</div>
                          <div className="flex gap-2 items-center flex-wrap">
                            {(w.primaryHref || w.href || w.previewUrl) && (
                              <Link
                                href={w.primaryHref || w.href || w.previewUrl!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border border-white/20 px-2.5 py-1 text-xs font-medium text-gray-300 hover:bg-white/5 transition w-fit"
                              >
                                {serviceLinkLabel(w.primaryHref || w.href || w.previewUrl || "", w.type, lang)}
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                                  <path d="M7 17L17 7M17 7H9M17 7v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                              </Link>
                            )}
                            {w.salesHref && (
                              <Link
                                href={w.salesHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-gray-400 hover:text-gray-200 underline underline-offset-2 transition"
                              >
                                {saleLinkLabel(w.salesHref || "", lang)}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 下段: 本 3枚 (縦長 aspect-[5/8]) */}
              {bookWorks.length > 0 && (
                <div>
                  <h3 className="mb-2.5 text-xs font-medium uppercase tracking-wider text-gray-400">
                    {lang === "ja" ? "本" : "Books"}
                  </h3>
                  <div className="grid grid-cols-1 min-[480px]:grid-cols-2 min-[720px]:grid-cols-3 gap-3">
                    {bookWorks.map((w) => (
                      <div key={w.id} className="group min-w-0 rounded-lg border border-white/10 overflow-hidden bg-zinc-800/60 hover:bg-zinc-800/80 transition">
                        {w.cover ? (
                          <div className="relative aspect-[5/8] overflow-hidden bg-zinc-800/80">
                            <Image
                              src={w.cover}
                              alt={w.title}
                              fill
                              sizes="(min-width: 800px) 33vw, (min-width: 500px) 50vw, 100vw"
                              className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-[1.05]"
                            />
                          </div>
                        ) : (
                          <div className="aspect-[5/8] grid place-items-center text-xs text-gray-500 bg-zinc-800/80">No Image</div>
                        )}
                        <div className="p-2.5 min-h-[72px] flex flex-col">
                          <div className="flex-1 line-clamp-2 text-sm font-medium text-gray-100 mb-1.5">{w.title}</div>
                          <div className="flex gap-2 items-center flex-wrap">
                            {(w.primaryHref || w.href || w.previewUrl) && (
                              <Link
                                href={w.primaryHref || w.href || w.previewUrl!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border border-white/20 px-2.5 py-1 text-xs font-medium text-gray-300 hover:bg-white/5 transition w-fit"
                              >
                                {serviceLinkLabel(w.primaryHref || w.href || w.previewUrl || "", w.type, lang)}
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                                  <path d="M7 17L17 7M17 7H9M17 7v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                              </Link>
                            )}
                            {w.salesHref && (
                              <Link
                                href={w.salesHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-gray-400 hover:text-gray-200 underline underline-offset-2 transition"
                              >
                                {saleLinkLabel(w.salesHref || "", lang)}
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 操作列 */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleCopyShare}
              className="relative rounded-md ring-1 ring-white/20 px-4 py-2 text-sm transition-colors"
            >
              {copied
                ? (lang === "ja" ? "✓ コピーしました" : "✓ Copied!")
                : (lang === "ja" ? "シェア用URLコピー" : "Copy share URL")}
            </button>
            <button onClick={drawAgain} className="rounded-md ring-1 ring-white/20 px-4 py-2 text-sm opacity-70">
              {lang === "ja" ? "もう一度引く（おすすめしない）" : "Draw again (not recommended)"}
            </button>

            {/* クロスリンク：他ページへの自然な回遊 */}
            <Link
              href="/"
              className="rounded-md ring-1 ring-white/20 px-4 py-2 text-sm"
            >
              {lang === "ja" ? "ホームへ" : "Home"}
            </Link>
            <Link
              href="/exhibition"
              className="rounded-md ring-1 ring-white/20 px-4 py-2 text-sm"
            >
              {lang === "ja" ? "展示を見る" : "Browse Exhibition"}
            </Link>
            <Link
              href="/chat"
              className="rounded-md ring-1 ring-white/20 px-4 py-2 text-sm"
            >
              {lang === "ja" ? "伯爵に相談する" : "Ask the Count"}
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
