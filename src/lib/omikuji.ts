import type { OmikujiItem, Lang } from "../types/omikuji";
// JSON import を使います（tsconfig の resolveJsonModule が true であること）
import data from "../data/omikuji/abi.json";

const ITEMS: OmikujiItem[] = data as unknown as OmikujiItem[];
export const OMIKUJI_COUNT = ITEMS.length;

export function getById(id: number): OmikujiItem | undefined {
  return ITEMS.find((x) => x.id === id);
}

export function getViewText(
  item: OmikujiItem,
  lang: Lang
): { header: string; lines: string[] } {
  if (lang === "ja")
    return { header: item.header_ja, lines: item.lines.map((l) => l.ja) };
  if (lang === "en")
    return { header: item.header_en, lines: item.lines.map((l) => l.en) };
  // origは原文、見出しはjaで統一
  return { header: item.header_ja, lines: item.lines.map((l) => l.orig) };
}

export function normalizeLang(v: any): Lang {
  return v === "en" || v === "orig" ? v : "ja";
}
