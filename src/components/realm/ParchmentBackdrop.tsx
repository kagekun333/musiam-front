// src/components/realm/ParchmentBackdrop.tsx
// 再利用する羊皮紙の下地（固定背景＋紙繊維/染み＋焼け）。施設ページを没入世界へ統一するため使う。
// 使い方: ページ先頭に <ParchmentBackdrop /> を置き、本文コンテナに position:relative; z-index:1 を付ける。
import "./parchment-backdrop.css";

export default function ParchmentBackdrop() {
  return (
    <div className="rnv-pb" aria-hidden="true">
      <svg className="rnv-pb-tex fiber" preserveAspectRatio="none">
        <defs>
          <filter id="pbFiber">
            <feTurbulence type="fractalNoise" baseFrequency="0.86" numOctaves="2" seed="8" stitchTiles="stitch" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.30  0 0 0 0 0.22  0 0 0 0 0.11  0 0 0 0.6 0" />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#pbFiber)" />
      </svg>
      <svg className="rnv-pb-tex blot" preserveAspectRatio="none">
        <defs>
          <filter id="pbBlot">
            <feTurbulence type="fractalNoise" baseFrequency="0.011 0.015" numOctaves="5" seed="3" />
            <feColorMatrix type="matrix" values="0 0 0 0 0.33  0 0 0 0 0.23  0 0 0 0 0.10  0 0 0 0.7 -0.32" />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#pbBlot)" />
      </svg>
    </div>
  );
}
