"use client";

import Starfield from "./Starfield";

/**
 * GlobalBackground - 全ページ共通の宇宙背景レイヤー
 *
 * - position: fixed で画面全体に固定
 * - pointer-events: none でクリック透過
 * - z-index: 0 で最背面
 * - Starfield（星空Canvas + 流れ星）を含む
 */
export default function GlobalBackground() {
  return (
    <>
      {/* 背景固定レイヤー */}
      <div
        className="global-bg-layer"
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        {/* 宇宙背景グラデーション */}
        <div className="cosmic-gradient" />

        {/* 装飾ぼかし */}
        <div className="cosmic-orn cosmic-orn--1" />
        <div className="cosmic-orn cosmic-orn--2" />

        {/* 星空Canvas（流れ星含む） */}
        <Starfield />
      </div>
    </>
  );
}
