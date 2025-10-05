// src/lib/omikujiPoem.ts
export type PoemMap = Record<number, string[]>;

type AnyItem = {
  id: number | string;
  poem?: string[] | { hanbun?: string[] } | string | null;
};

/** どのスキーマでも四句（最大4行）に正規化 */
export function extractPoemLines(item: AnyItem | undefined | null): string[] {
  if (!item) return [];
  const p: any = item.poem;

  if (Array.isArray(p)) return p.filter(Boolean).slice(0, 4);
  if (p && Array.isArray(p.hanbun)) return p.hanbun.filter(Boolean).slice(0, 4);
  if (typeof p === "string") {
    return p.split(/\r?\n/).map(s => s.trim()).filter(Boolean).slice(0, 4);
  }
  return [];
}

/** JA/EN の配列から id→四句 のマップ */
export function buildPoemMaps(jaArr: AnyItem[], enArr: AnyItem[]) {
  const poemJa: PoemMap = {};
  const poemEn: PoemMap = {};
  for (const it of jaArr || []) poemJa[Number(it.id)] = extractPoemLines(it);
  for (const it of enArr || []) poemEn[Number(it.id)] = extractPoemLines(it);
  return { poemJa, poemEn };
}
