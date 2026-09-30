import editorialKnowledgeJson from "../../public/works/editorial-knowledge.json";
import type { CatalogWork } from "@/lib/mergeWorksCatalog";

export type EditorialSourceClass =
  | "OWNER_PUBLISHED_MEDIA"
  | "OFFICIAL_EDITORIAL"
  | "APPROVED_ARTIFACT"
  | "AI_DERIVED_FROM_OFFICIAL_SOURCE";

export type OwnerIntentStatus = "EXPLICIT" | "NOT_EXPLICIT" | "UNKNOWN";

export type EditorialKnowledgeRow = {
  workId?: string | number;
  workIds?: Array<string | number>;
  title?: string;
  summaryJa?: string;
  ownerIntentSummaryJa?: string;
  facets?: string[];
  sourceClass?: EditorialSourceClass;
  ownerIntentStatus?: OwnerIntentStatus;
  sourceFileHash?: string;
  sourceHref?: string;
};

type EditorialFile = {
  schemaVersion?: number;
  evidenceKind?: string;
  items?: EditorialKnowledgeRow[];
};

const FILE = editorialKnowledgeJson as EditorialFile;

function normalize(value: unknown) {
  return String(value ?? "").normalize("NFKC").trim();
}

function normalizeSearch(value: unknown) {
  return normalize(value).toLocaleLowerCase();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function queryMentionsReviewedTitle(query: string, title: string): boolean {
  const q = normalizeSearch(query);
  const t = normalizeSearch(title);
  if (!q || !t) return false;
  if (t.length >= 4) return q.includes(t);

  const quoted = [
    `「${t}」`, `『${t}』`, `“${t}”`, `"${t}"`, `'${t}'`, `\`${t}\``,
  ];
  if (quoted.some((value) => q.includes(value))) return true;

  if (/^[a-z0-9]+$/i.test(t)) {
    const escaped = escapeRegex(t);
    const japaneseTitleContext = new RegExp(
      `^${escaped}(?=(?:は|って|とは|について|の(?:曲|作品|意味|テーマ)|を(?:聴|聞|読|見)|が(?:好き|何)|で(?:何|どんな)|[ 、。！？!?：:,]))`,
      "i",
    );
    return japaneseTitleContext.test(q);
  }

  return false;
}

function explicitIds(row: EditorialKnowledgeRow): string[] {
  return Array.from(new Set([
    normalize(row.workId),
    ...(row.workIds ?? []).map(normalize),
  ].filter(Boolean)));
}

export function getEditorialKnowledgeRows(): EditorialKnowledgeRow[] {
  return (FILE.items ?? []) as EditorialKnowledgeRow[];
}

export function getEditorialKnowledgeForWorkId(
  workId: string,
  rows: EditorialKnowledgeRow[] = getEditorialKnowledgeRows(),
): EditorialKnowledgeRow | null {
  const id = normalize(workId);
  if (!id) return null;
  return rows.find((row) => explicitIds(row).includes(id)) ?? null;
}

export function resolveEditorialKnowledgeFromQuery(
  query: string,
  works: CatalogWork[],
  rows: EditorialKnowledgeRow[] = getEditorialKnowledgeRows(),
): { row: EditorialKnowledgeRow; work: CatalogWork } | null {
  const q = normalizeSearch(query);
  if (!q) return null;

  const matchedRows = rows.filter((row) => queryMentionsReviewedTitle(q, normalize(row.title)));
  if (matchedRows.length !== 1) return null;

  const row = matchedRows[0];
  const ids = explicitIds(row);
  if (!ids.length) return null;

  const preferredId = normalize(row.workId);
  const candidates = works.filter((work) => ids.includes(normalize(work.id)));
  if (!candidates.length) return null;

  const preferred = candidates.find((work) => normalize(work.id) === preferredId) ?? candidates[0];
  return { row, work: preferred };
}

export function editorialSourceClass(row: EditorialKnowledgeRow): EditorialSourceClass {
  return row.sourceClass ?? "OFFICIAL_EDITORIAL";
}
