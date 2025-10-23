// src/app/oracle/[id]/result-client.tsx
"use client";

import React, { useMemo, useCallback } from "react";
import Link from "next/link";

type LangText = string | { orig?: string; ja?: string; en?: string } | null | undefined;
type Omikuji = {
  id?: number | string;
  number?: number | string;
  rankJa?: LangText;
  rank?: LangText;
  header?: LangText;
  lines?: LangText[];   // ← 文字列 or {ja/en/orig} の配列も許容
  advice?: LangText;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ""; // 例: http://localhost:3000 or https://hakusyaku.xyz

// 任意の形を“表示用の文字列”に正規化
function asText(value: LangText, pref: "ja" | "en" = "ja"): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  const o = value as Record<string, unknown>;
  const t =
    (typeof o[pref] === "string" ? (o[pref] as string) : undefined) ??
    (typeof o.ja === "string" ? (o.ja as string) : undefined) ??
    (typeof o.en === "string" ? (o.en as string) : undefined) ??
    (typeof o.orig === "string" ? (o.orig as string) : undefined);
  return t ?? "";
}
function listAsText(list?: LangText[], pref: "ja" | "en" = "ja"): string[] {
  if (!Array.isArray(list)) return [];
  return list.map((v) => asText(v, pref)).filter(Boolean);
}

export default function ResultClient({ id, entry }: { id: number; entry: Omikuji | null }) {
  const pageUrl = SITE_URL ? `${SITE_URL}/oracle/${id}` : "";

  const rank   = useMemo(() => asText(entry?.rankJa ?? entry?.rank, "ja"), [entry]);
  const header = useMemo(() => asText(entry?.header, "ja"), [entry]);
  const lines  = useMemo(() => listAsText(entry?.lines, "ja"), [entry]);
  const advice = useMemo(() => asText(entry?.advice, "ja"), [entry]);

  // SSR/CSRで不変の共有URL（hydrationずれ防止）
  const shareHref = useMemo(() => {
    const u = new URL("https://twitter.com/intent/tweet");
    u.searchParams.set("text", `御籤 #${id}`);
    if (pageUrl) u.searchParams.set("url", pageUrl);
    u.searchParams.set("hashtags", "MUSIAM,Omikuji");
    return u.toString();
  }, [id, pageUrl]);

  const onCopy = useCallback(async () => {
    try {
      const text = pageUrl || `/oracle/${id}`; // env未設定でも相対でコピー可
      await navigator.clipboard?.writeText(text);
      alert("リンクをコピーしました");
    } catch {
      alert("コピーに失敗しました");
    }
  }, [id, pageUrl]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">
        御籤 #{id}
        {rank ? `（${rank}）` : ""}
      </h1>

      {(header || lines.length || advice) && (
        <section className="mt-4 space-y-3">
          {header && <p className="text-lg">{header}</p>}
          {lines.length > 0 && (
            <ul className="list-disc pl-5 space-y-1">
              {lines.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          )}
          {advice && <p className="text-sm opacity-80 whitespace-pre-line">{advice}</p>}
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <button className="rounded-lg border px-4 py-2" onClick={onCopy} aria-label="リンクをコピー">
          リンクをコピー
        </button>
        <a
          className="rounded-lg border px-4 py-2"
          href={shareHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Xで共有"
        >
          Xで共有
        </a>
        <Link className="rounded-lg border px-4 py-2" href="/oracle/omikuji">
          もう一度引く
        </Link>
      </div>
    </main>
  );
}
