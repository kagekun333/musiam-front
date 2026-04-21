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
  moodTags?: string[];
  matchInfo?: { summary?: string; reason?: string } | string;
  canonicalMasterId?: string;
  canonicalMasterTitle?: string;
  ssd?: {
    tracks?: { notes?: string }[];
  };
};

const WORKS_PATH = "/works/works.json";
const WORKS_SSD_PATH = "/works/works-ssd.json";

function asArray(json: any): ExhibitionWork[] {
  return Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : [];
}

function normalizeTitle(s?: string): string {
  return String(s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[「」『』"'“”‘’]/g, "")
    .replace(/[—–―]/g, "-")
    .trim();
}

function uniq(values: (string | undefined)[] | undefined): string[] {
  return Array.from(new Set((values || []).map((x) => String(x || "").trim()).filter(Boolean)));
}

function mergeLinks(master?: RawLinks, ssd?: RawLinks): RawLinks | undefined {
  const out = Object.fromEntries(
    Object.entries({
      ...(master || {}),
      ...(ssd || {}),
    }).filter(([, value]) => !!value)
  );
  return Object.keys(out).length ? out : undefined;
}

function stripExhibitionMeta(text?: string): string | undefined {
  if (!text) return undefined;

  const cleaned = String(text)
    .replace(
      /\s*(?:MV(?:映像)?イメージ|MV映像イメージ|映像イメージ|映像案|動画案|動画戦略|ショート動画戦略|ショート動画案|ショート戦略|プロモ戦略|プロモ案|Visual concept|MV image|Short-form strategy)\s*[:：][\s\S]*$/i,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || undefined;
}

function pickSummary(work: ExhibitionWork): string | undefined {
  const summary =
    typeof work.matchInfo === "string"
      ? work.matchInfo
      : work.matchInfo && typeof work.matchInfo === "object"
      ? work.matchInfo.summary || work.matchInfo.reason
      : "";
  return stripExhibitionMeta(summary ? String(summary) : "");
}

function toDescription(work: ExhibitionWork): string | undefined {
  const summary = pickSummary(work);
  if (summary) return summary;

  const note = work?.ssd?.tracks?.[0]?.notes;
  return stripExhibitionMeta(typeof note === "string" ? note : "");
}

function mergeMasterAndSsd(master: ExhibitionWork, ssd: ExhibitionWork): ExhibitionWork {
  const mergedLinks = mergeLinks(master.links, ssd.links);
  const hyperfollow = ssd.href || ssd.links?.hyperfollow || ssd.links?.listen;

  return {
    ...master,
    ...ssd,
    id: master.id,
    type: "music",
    title: ssd.title || master.title,
    releasedAt: ssd.releasedAt || master.releasedAt,
    cover: ssd.cover || master.cover,
    tags: uniq([...(master.tags || []), ...(ssd.tags || [])]),
    moodTags: (ssd.moodTags && ssd.moodTags.length ? ssd.moodTags : master.moodTags) || [],
    links:
      mergedLinks && !mergedLinks.listen && hyperfollow
        ? { ...mergedLinks, listen: hyperfollow }
        : mergedLinks,
    href: master.href || ssd.href,
    primaryHref: master.primaryHref || master.href || ssd.primaryHref || ssd.href,
    salesHref: master.salesHref || ssd.salesHref || ssd.href,
    matchInfo: ssd.matchInfo || master.matchInfo,
    canonicalMasterId: ssd.canonicalMasterId,
    canonicalMasterTitle: ssd.canonicalMasterTitle,
    ssd: ssd.ssd || master.ssd,
    description: toDescription(ssd) || toDescription(master),
  };
}

function prepareStandaloneSsd(ssd: ExhibitionWork): ExhibitionWork {
  const links = mergeLinks(ssd.links, !ssd.links?.listen && ssd.href ? { listen: ssd.href } : undefined);
  return {
    ...ssd,
    type: "music",
    tags: uniq(ssd.tags || []),
    links,
    description: toDescription(ssd),
  };
}

export async function loadExhibitionWorks(): Promise<ExhibitionWork[]> {
  const [worksRes, ssdRes] = await Promise.all([
    fetch(WORKS_PATH, { cache: "no-store" }),
    fetch(WORKS_SSD_PATH, { cache: "no-store" }),
  ]);

  if (!worksRes.ok) {
    throw new Error(`Failed to fetch ${WORKS_PATH}`);
  }

  const worksJson = await worksRes.json();
  const ssdJson = ssdRes.ok ? await ssdRes.json() : { items: [] };

  const masterItems = asArray(worksJson);
  const ssdItems = asArray(ssdJson);

  const merged: ExhibitionWork[] = masterItems.map((item) => ({
    ...item,
    description: item.description || toDescription(item),
  }));

  const byId = new Map<string, number>();
  const masterMusicByTitle = new Map<string, ExhibitionWork>();
  for (let i = 0; i < merged.length; i++) {
    byId.set(String(merged[i].id), i);
    if (merged[i].type === "music") {
      masterMusicByTitle.set(normalizeTitle(merged[i].title), merged[i]);
    }
  }

  for (const ssd of ssdItems) {
    const canonicalId = ssd.canonicalMasterId;
    const titleMatch = masterMusicByTitle.get(normalizeTitle(ssd.title));
    const matchedId =
      (canonicalId && byId.has(String(canonicalId)) && String(canonicalId)) ||
      (byId.has(String(ssd.id)) && String(ssd.id)) ||
      (titleMatch ? String(titleMatch.id) : "");

    if (matchedId && byId.has(matchedId)) {
      const idx = byId.get(matchedId)!;
      merged[idx] = mergeMasterAndSsd(merged[idx], ssd);
      continue;
    }

    merged.push(prepareStandaloneSsd(ssd));
  }

  return merged;
}
