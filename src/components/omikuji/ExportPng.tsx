"use client";
import React, { useRef, useState } from "react";
import { toPng } from "html-to-image";
import OmikujiCard, { OmikujiEntry } from "./OmikujiCard";

export default function ExportPng({
  entry,
  lang = "ja",
  filenameBase,
}: {
  entry: OmikujiEntry;
  lang?: "ja" | "en";
  filenameBase?: string; // 例: "omikuji"
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const base = filenameBase ?? "omikuji";

  async function save(scale = 1) {
    if (!ref.current || busy) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(ref.current, {
        pixelRatio: scale,        // 1=1200x630, 2=2400x1260
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${base}_${entry.id}_${lang}${scale > 1 ? `@${scale}x` : ""}.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* 操作用ボタン */}
      <div className="flex gap-8">
        <button
          onClick={() => save(1)}
          className="rounded-md border px-4 py-2 text-sm"
          disabled={busy}
          aria-busy={busy}
        >
          PNG保存 1200×630
        </button>
        <button
          onClick={() => save(2)}
          className="rounded-md border px-4 py-2 text-sm"
          disabled={busy}
          aria-busy={busy}
        >
          PNG保存 2400×1260（2x）
        </button>
      </div>

      {/* 画面外で実寸レンダ（display:none はNG。オフスクリーン配置） */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          left: -10000,
          top: 0,
          width: 1200,
          height: 630,
          pointerEvents: "none",
          zIndex: -1,
          background: "transparent",
        }}
      >
        <div ref={ref} style={{ width: 1200, height: 630 }}>
          <OmikujiCard
            entry={entry}
            lang={lang}
            // 出力は必ず固定サイズ＆overflow hidden
            className="w-[1200px] h-[630px] min-h-[630px] overflow-hidden"
          />
        </div>
      </div>
    </>
  );
}
