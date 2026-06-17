// src/app/oracle/omikuji/page.tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { siteUrl } from "@/lib/site-url";
import Client from "./Client";

export const revalidate = 0; // 常に最新（静的生成に依存しない）

export const metadata: Metadata = {
  title: "伯爵御籤 — 今日の運勢を占う | 伯爵 MUSIAM",
  description:
    "伯爵MUSIAMの御籤で今日の運勢を読み解く。出た運勢に合わせて、館の作品から「今日の一曲」もお届けします。日本語・English対応、無料。",
  alternates: { canonical: `${siteUrl()}/oracle/omikuji` },
  openGraph: {
    title: "伯爵御籤 — 今日の運勢を占う | 伯爵 MUSIAM",
    description:
      "御籤で今日の運勢を占い、運勢に合う一曲を館の作品からお届け。日本語・English対応、無料。",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "伯爵御籤 — 今日の運勢を占う | 伯爵 MUSIAM",
    description:
      "御籤で今日の運勢を占い、運勢に合う一曲を館の作品からお届け。日本語・English対応、無料。",
  },
};

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-6xl p-6 opacity-60">Loading…</main>
      }
    >
      <Client />
    </Suspense>
  );
}
