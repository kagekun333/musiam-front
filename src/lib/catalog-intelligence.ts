import type { CatalogWork } from "@/lib/mergeWorksCatalog";

export type IntelligenceFacetKind =
  | "language"
  | "country"
  | "region"
  | "place"
  | "culture"
  | "theme"
  | "visual"
  | "time"
  | "search_alias";

export type IntelligenceConfidence = "high" | "medium" | "low";

export type IntelligenceFacet = {
  kind: IntelligenceFacetKind;
  value: string;
  label: string;
  aliases?: string[];
  source: {
    type: string;
    ref: string;
    confidence: IntelligenceConfidence;
  };
};

export type WorkIntelligence = {
  facets: IntelligenceFacet[];
};

export type WorkIntelligenceRecord = {
  workIds: string[];
  facets: IntelligenceFacet[];
};

export type WorkIntelligenceFile = {
  schemaVersion: number;
  records: WorkIntelligenceRecord[];
};

const WEIGHTS: Record<IntelligenceFacetKind, number> = {
  language: 32,
  country: 22,
  region: 28,
  place: 30,
  culture: 18,
  theme: 14,
  visual: 12,
  time: 12,
  search_alias: 30,
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\s\u3000]+/g, " ")
    .trim();
}

function facetKey(facet: IntelligenceFacet): string {
  return [facet.kind, normalize(facet.value), normalize(facet.label), facet.source.type, facet.source.ref].join("|");
}

function mergeFacets(...groups: (IntelligenceFacet[] | undefined)[]): IntelligenceFacet[] {
  const seen = new Set<string>();
  const out: IntelligenceFacet[] = [];
  for (const facet of groups.flatMap((group) => group ?? [])) {
    const key = facetKey(facet);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(facet);
  }
  return out;
}

export function applyWorkIntelligence(
  works: CatalogWork[],
  file: WorkIntelligenceFile,
): CatalogWork[] {
  const byStableId = new Map<string, IntelligenceFacet[]>();
  for (const record of file.records ?? []) {
    for (const id of record.workIds ?? []) {
      const key = String(id ?? "").trim();
      if (!key) continue;
      byStableId.set(key, mergeFacets(byStableId.get(key), record.facets));
    }
  }

  return works.map((work) => {
    const stableIds = [String(work.id ?? ""), ...(work.catalogAliases ?? [])].filter(Boolean);
    const facets = mergeFacets(
      work.intelligence?.facets,
      ...stableIds.map((id) => byStableId.get(id)),
    );
    return facets.length ? { ...work, intelligence: { facets } } : work;
  });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
}

function aliasMatches(query: string, alias: string, kind: IntelligenceFacetKind): boolean {
  const q = normalize(query);
  const token = normalize(alias);
  if (!q || !token || token.length < 2) return false;

  if (kind !== "language" && /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(token)) {
    const withoutLanguagePhrase = q.replaceAll(`${token}語`, "");
    if (!withoutLanguagePhrase.includes(token) && q.includes(`${token}語`)) return false;
  }

  if (/^[a-z0-9]{1,3}$/i.test(token)) {
    return new RegExp(`(?:^|[^a-z0-9])${escapeRegex(token)}(?:$|[^a-z0-9])`, "i").test(q);
  }
  return q.includes(token);
}

export function scoreWorkIntelligenceQuery(
  work: CatalogWork,
  query: string,
): { score: number; reasons: string[]; matched: IntelligenceFacet[] } {
  const facets = work.intelligence?.facets ?? [];
  let score = 0;
  const matched: IntelligenceFacet[] = [];
  const reasons: string[] = [];

  for (const facet of facets) {
    const tokens = Array.from(new Set([facet.label, facet.value, ...(facet.aliases ?? [])].filter(Boolean)));
    if (!tokens.some((token) => aliasMatches(query, token, facet.kind))) continue;
    matched.push(facet);
    score += WEIGHTS[facet.kind];
    const prefix =
      facet.kind === "language" ? "言語"
      : facet.kind === "country" ? "国"
      : facet.kind === "region" ? "地域"
      : facet.kind === "place" ? "場所"
      : facet.kind === "culture" ? "文化"
      : facet.kind === "theme" ? "テーマ"
      : facet.kind === "visual" ? "ビジュアル"
      : facet.kind === "time" ? "時期"
      : "検索別名";
    reasons.push(`${prefix}:${facet.label}`);
  }

  return { score, reasons: Array.from(new Set(reasons)), matched };
}

export function intelligenceSearchText(work: CatalogWork): string {
  return (work.intelligence?.facets ?? [])
    .flatMap((facet) => [facet.value, facet.label, ...(facet.aliases ?? [])])
    .filter(Boolean)
    .join(" ");
}
