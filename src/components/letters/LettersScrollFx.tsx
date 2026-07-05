"use client";
// src/components/letters/LettersScrollFx.tsx
// /letters 配下だけの体験改善（見た目を描画しない副作用コンポーネント）。
//
// 1) スクロールバーの可視化:
//    globals.css がサイト全体でスクロールバーを隠しているため、手紙のような
//    長文ページでは「あとどれくらいあるか」が分かりにくい。/letters にいる間だけ
//    html/body に .letters-scrollbar を付け、letters.css の上書きで表示する。
//
// 2) 一覧のスクロール位置を記憶:
//    手紙を開いて「← 手紙の一覧へ」やブラウザの「戻る」ボタンで戻ると、
//    常に一覧の先頭へ戻ってしまう現象を防ぐ。離脱前のスクロール位置を
//    sessionStorage に保存し、一覧に戻ってきたら復元する。
//
//    ブラウザの「戻る」（popstate）は、ブラウザ自身の自動スクロール復元
//    （history.scrollRestoration = "auto"、既定値）や、Next.jsのルーター内部の
//    スクロール処理と、このコンポーネントの復元処理が競合し、後勝ちで
//    先頭(0,0)に負けてしまうことがある。対策として:
//      a) このセクションに滞在中は history.scrollRestoration を "manual" にし、
//         ブラウザ自身の自動復元を止めて、常にこちらの実装だけが scrollY を書き換える。
//      b) 復元は "pathname" の変化(popstateでもLink遷移でも発火)に加えて、
//         実際の popstate イベントでも二重に試みる。
//      c) 復元タイミングは二重rAFで1フレーム以上遅らせ、直後に走る他の
//         スクロール処理（Next側の既定のトップスクロール等）より後に実行されるようにする。
import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const LIST_SCROLL_KEY = "letters:list-scroll-y";
const SCROLLBAR_CLASSES = ["letters-scrollbar"];

// SSR中はuseLayoutEffectが警告を出すため、クライアントでのみlayout版を使う定石。
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function readSavedY(): number {
  try {
    const saved = sessionStorage.getItem(LIST_SCROLL_KEY);
    const y = saved ? Number(saved) : 0;
    return Number.isFinite(y) && y > 0 ? y : 0;
  } catch {
    return 0; // no-op: プライベートブラウジング等でsessionStorageが使えない場合
  }
}

function restoreScroll() {
  const y = readSavedY();
  if (!y) return;
  // 直後に走る可能性のある他のスクロール処理(Next側の既定のトップスクロール等)に
  // 上書きされないよう、1フレーム以上遅らせてから復元する。
  // さらに、Next側の処理がハイドレーション完了後など「もっと後」に走るケースにも
  // 備え、少し時間を空けて複数回念押しする（既に正しい位置ならno-op同然の軽い処理）。
  const apply = () => window.scrollTo(0, y);
  requestAnimationFrame(() => {
    requestAnimationFrame(apply);
  });
  setTimeout(apply, 60);
  setTimeout(apply, 200);
}

export default function LettersScrollFx() {
  const pathname = usePathname();
  const isListPage = pathname === "/letters";
  const isListPageRef = useRef(isListPage);
  isListPageRef.current = isListPage;

  useEffect(() => {
    document.documentElement.classList.add(...SCROLLBAR_CLASSES);
    document.body.classList.add(...SCROLLBAR_CLASSES);
    return () => {
      document.documentElement.classList.remove(...SCROLLBAR_CLASSES);
      document.body.classList.remove(...SCROLLBAR_CLASSES);
    };
  }, []);

  // /letters配下に滞在している間だけ、ブラウザ自身の自動スクロール復元を止める。
  // これをしないと、ブラウザの「戻る」時にブラウザ側とこの実装が競合し、
  // どちらが最後に勝つかが不安定になる。
  useEffect(() => {
    if (typeof window === "undefined" || !("scrollRestoration" in window.history)) return;
    const prev = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => {
      window.history.scrollRestoration = prev;
    };
  }, []);

  // ブラウザの「戻る/進む」(popstate)でも復元を試みる。pathnameの変化に伴う
  // 下のeffectと合わせて二重に発火させることで、タイミングの取りこぼしを防ぐ。
  //
  // 注意: popstate発火時点では、まだReactが新しいpathnameで再描画していないため
  // isListPageRef（Reactのレンダー結果に依存する値）は直前のページの値のままで
  // 古い(stale)。popstateはブラウザが既にURLを書き換えた後に発火するので、
  // window.location.pathname を直接読めば遷移先を正しく判定できる。
  useEffect(() => {
    const onPopState = () => {
      if (window.location.pathname === "/letters") restoreScroll();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (!isListPage) return;

    restoreScroll();

    let raf = 0;
    const persist = () => {
      raf = 0;
      try {
        sessionStorage.setItem(LIST_SCROLL_KEY, String(window.scrollY));
      } catch {
        /* no-op */
      }
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(persist);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [isListPage]);

  return null;
}
