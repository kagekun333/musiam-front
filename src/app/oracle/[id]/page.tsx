// src/app/oracle/[id]/page.tsx（完全版）
import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import ResultClient from "./result-client";

// ファイルIOを使うので node ランタイムを明示（edgeを避ける）
export const runtime = "nodejs";

type Omikuji = {
  id?: number | string;
  number?: number | string;
  rankJa?: string;
  header?: string;
  lines?: string[];
  advice?: string;
};

async function loadEntry(id: number): Promise<Omikuji | null> {
  try {
    const p = path.join(process.cwd(), "dist", "omikuji.beforefinal.json");
    const raw = await fs.readFile(p, "utf8");
    const arr = JSON.parse(raw) as Omikuji[];
    return arr.find((x) => String(x.id ?? x.number) === String(id)) ?? null;
  } catch {
    return null;
  }
}

// ★ Next15：params は Promise になり得る → await が必要
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isFinite(n) || n < 1 || n > 100) return notFound();

  const entry = await loadEntry(n);
  if (!entry) return notFound();

  return <ResultClient id={n} entry={entry} />;
}

// （任意）結果ページのメタデータも params を await して生成
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const n = Number(id);
  const entry = Number.isFinite(n) ? await loadEntry(n) : null;

  const title = entry?.header ? `Oracle #${n}｜${entry.header}` : `Oracle #${id}`;
  const description = entry?.advice ?? "伯爵MUSIAMの観音百籤・結果ページ";
  const ogImage = "/brand/abi-seal.png"; // 動的OGPは後続タスクで

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      url: `https://hakusyaku.xyz/oracle/${id}`,
      type: "article",
    },
    alternates: { canonical: `/oracle/${id}` },
  };
}
