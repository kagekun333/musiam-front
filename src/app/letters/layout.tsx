// src/app/letters/layout.tsx — /letters 配下 (一覧・個別記事) 共通レイアウト
// スクロールバーの可視化とスクロール位置の記憶(LettersScrollFx)をこの区間だけ有効にする。
import type { ReactNode } from "react";
import LettersScrollFx from "@/components/letters/LettersScrollFx";
import "./letters-scrollbar.css";

export default function LettersLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <LettersScrollFx />
      {children}
    </>
  );
}
