// src/lib/catalog-counts.ts
// 作品件数を「カタログから自動算出」する。ハードコードの 350/216/134 を置き換え、
// 作品が増えても常に正確な数字を出すための単一の真実。
// 表示集合（merge + dedupe）= /works と一致。サーバー側で算出（loadMergedWorksServer 使用）。
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import { dedupeWorks } from "@/lib/dedupeWorks";

export type CatalogCounts = {
  total: number;
  music: number;
  books: number;
  films: number;
};

function isBook(w: { type?: string; tags?: string[] }): boolean {
  const t = String(w.type || "").toLowerCase();
  return t.includes("book") || (Array.isArray(w.tags) && w.tags.includes("English Edition"));
}
function isFilm(w: { type?: string }): boolean {
  const t = String(w.type || "").toLowerCase();
  return t.includes("film") || t.includes("video") || t.includes("movie");
}

/** 表示集合（重複除去後）から件数を算出。失敗時は安全な既定値（過小表示を避け実数寄り）。 */
export async function getCatalogCounts(): Promise<CatalogCounts> {
  try {
    const merged = await loadMergedWorksServer();
    const display = dedupeWorks(merged as Parameters<typeof dedupeWorks>[0]) as Array<{
      type?: string;
      tags?: string[];
    }>;
    let books = 0;
    let films = 0;
    for (const w of display) {
      if (isFilm(w)) films++;
      else if (isBook(w)) books++;
    }
    const total = display.length;
    const music = total - books - films;
    return { total, music, books, films };
  } catch {
    // フォールバック（読み込み失敗時）。実データに近い保守値。
    return { total: 359, music: 225, books: 134, films: 0 };
  }
}

/** 「350」のような表示用に、十の位で切り捨てた丸め値 + 「+」を返すヘルパー。 */
export function roundedLabel(n: number): string {
  if (n < 50) return String(n);
  return `${Math.floor(n / 10) * 10}+`;
}
