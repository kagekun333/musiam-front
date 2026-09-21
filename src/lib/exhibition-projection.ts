import type { CatalogWork } from "@/lib/mergeWorksCatalog";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import editorialKnowledgeJson from "../../public/works/editorial-knowledge.json";

type RawLinks = Record<string, string | null | undefined>;

export type ExhibitionWork = {
  id: string;
  title: string;
  type: "music" | "video" | "art" | "book" | "article";
  cover: string;
  tags?: string[];
  links?: RawLinks;
  releasedAt?: string;
  weight?: number;
  previewUrl?: string;
  href?: string;
  description?: string;
  aspect?: string;
  primaryHref?: string;
  salesHref?: string;
};

type EditorialRow = { workId?: string | number; summaryJa?: string };

export type ExhibitionReleaseState = "RELEASED" | "FUTURE_OR_UNRELEASED" | "UNKNOWN_RELEASE_STATE";

export type ExhibitionCoverage = {
  canonicalRuntimeWorks: number;
  explicitReleasedWorks: number;
  displayedWorks: number;
  excludedFutureOrUnreleased: number;
  excludedIdentityConflict: number;
  unknownReleaseState: number;
  missingFromExhibitionReleasedWorks: number;
};

const INTERNAL_TAG_RE = /^(ssd-|canonical:|internal:|system:|source:|ops:)/i;
const ALLOWED_LINK_KEYS = new Set([
  "listen",
  "watch",
  "read",
  "nft",
  "spotify",
  "appleMusic",
  "itunesBuy",
  "amazonMusic",
]);

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

export function exhibitionTokyoYmd(now = new Date()) {
  const tokyo = new Date(now.getTime() + (9 * 60 - now.getTimezoneOffset()) * 60_000);
  return tokyo.toISOString().slice(0, 10);
}

/** A recorded release date is the only publication field presently available. */
export function classifyExhibitionRelease(work: CatalogWork, today = exhibitionTokyoYmd()): ExhibitionReleaseState {
  const releasedAt = String(work.releasedAt ?? "").slice(0, 10);
  if (!isValidDate(releasedAt)) return "UNKNOWN_RELEASE_STATE";
  return releasedAt <= today ? "RELEASED" : "FUTURE_OR_UNRELEASED";
}

function publicTags(tags?: string[]) {
  return (tags ?? []).filter((tag) => {
    const value = String(tag).trim();
    return Boolean(value) && !INTERNAL_TAG_RE.test(value);
  });
}

function publicLinks(links: CatalogWork["links"]): RawLinks | undefined {
  if (!links || Array.isArray(links) || typeof links !== "object") return undefined;
  const filtered = Object.fromEntries(
    Object.entries(links as RawLinks).filter(([key, value]) => {
      const href = String(value ?? "").trim();
      return ALLOWED_LINK_KEYS.has(key) && (/^https?:\/\//i.test(href) || href.startsWith("/"));
    })
  );
  return Object.keys(filtered).length ? filtered : undefined;
}

function publicHref(value?: string) {
  const href = String(value ?? "").trim();
  return /^https?:\/\//i.test(href) || href.startsWith("/") ? href : undefined;
}

function editorialSummaryFor(workId: string, rows: EditorialRow[]) {
  return rows.find((row) => String(row.workId ?? "") === workId)?.summaryJa;
}

function publicWork(work: CatalogWork, editorialRows: EditorialRow[]): ExhibitionWork {
  const id = String(work.id ?? "");
  const type = ["music", "video", "art", "book", "article"].includes(String(work.type))
    ? (work.type as ExhibitionWork["type"])
    : "article";
  const description =
    (typeof (work as CatalogWork & { description?: unknown }).description === "string" &&
      String((work as CatalogWork & { description?: unknown }).description).trim()) ||
    editorialSummaryFor(id, editorialRows);

  return {
    id,
    title: String(work.title ?? ""),
    type,
    cover: String(work.cover ?? ""),
    tags: publicTags(work.tags),
    links: publicLinks(work.links),
    releasedAt: String(work.releasedAt ?? "") || undefined,
    weight: typeof (work as CatalogWork & { weight?: unknown }).weight === "number" ? (work as CatalogWork & { weight: number }).weight : undefined,
    previewUrl: publicHref((work as CatalogWork & { previewUrl?: string }).previewUrl),
    href: publicHref(work.href),
    primaryHref: publicHref(work.primaryHref),
    salesHref: publicHref(work.salesHref),
    description: description || undefined,
    aspect: typeof (work as CatalogWork & { aspect?: unknown }).aspect === "string" ? (work as CatalogWork & { aspect: string }).aspect : undefined,
  };
}

export function projectExhibitionWorks(
  works: CatalogWork[],
  editorialRows: EditorialRow[] = (editorialKnowledgeJson.items ?? []) as EditorialRow[],
  today = exhibitionTokyoYmd()
): { works: ExhibitionWork[]; coverage: ExhibitionCoverage } {
  const displayed: ExhibitionWork[] = [];
  let explicitReleasedWorks = 0;
  let excludedFutureOrUnreleased = 0;
  let excludedIdentityConflict = 0;
  let unknownReleaseState = 0;

  for (const work of works) {
    const state = classifyExhibitionRelease(work, today);
    if (state === "UNKNOWN_RELEASE_STATE") {
      unknownReleaseState += 1;
      continue;
    }
    if (state === "FUTURE_OR_UNRELEASED") {
      excludedFutureOrUnreleased += 1;
      continue;
    }
    explicitReleasedWorks += 1;
    if (work.catalogStatus?.identityConflict) {
      excludedIdentityConflict += 1;
      continue;
    }
    displayed.push(publicWork(work, editorialRows));
  }

  return {
    works: displayed,
    coverage: {
      canonicalRuntimeWorks: works.length,
      explicitReleasedWorks,
      displayedWorks: displayed.length,
      excludedFutureOrUnreleased,
      excludedIdentityConflict,
      unknownReleaseState,
      missingFromExhibitionReleasedWorks: explicitReleasedWorks - excludedIdentityConflict - displayed.length,
    },
  };
}

export async function loadExhibitionProjection() {
  return projectExhibitionWorks(await loadMergedWorksServer());
}
