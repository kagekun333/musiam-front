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
//    手紙を開いて「← 手紙の一覧へ」で戻ると、Next.js的には新規ナビゲーションになり
//    常に一覧の先頭へ戻ってしまう（ブラウザの「戻る」とは挙動が違う）。
//    離脱前のスクロール位置を sessionStorage に保存し、一覧に戻ってきたら復元する。
import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

const LIST_SCROLL_KEY = "letters:list-scroll-y";
const SCROLLBAR_CLASSES = ["letters-scrollbar"];

// SSR中はuseLayoutEffectが警告を出すため、クライアントでのみlayout版を使う定石。
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function LettersScrollFx() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.classList.add(...SCROLLBAR_CLASSES);
    document.body.classList.add(...SCROLLBAR_CLASSES);
    return () => {
      document.documentElement.classList.remove(...SCROLLBAR_CLASSES);
      document.body.classList.remove(...SCROLLBAR_CLASSES);
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (pathname !== "/letters") return;

    try {
      const saved = sessionStorage.getItem(LIST_SCROLL_KEY);
      const y = saved ? Number(saved) : 0;
      if (Number.isFinite(y) && y > 0) window.scrollTo(0, y);
    } catch {
      /* no-op: プライベートブラウジング等でsessionStorageが使えない場合 */
    }

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
  }, [pathname]);

  return null;
}
