type RawLinks = Record<string, string | null | undefined>;

export type CatalogWork = {
  id?: string | number;
  title?: string;
  type?: string;
  cover?: string;
  tags?: string[];
  releasedAt?: string;
  href?: string;
  primaryHref?: string;
  salesHref?: string;
  moodTags?: string[];
  moodSeeds?: string[];
  matchInfo?: { summary?: string; reason?: string } | string;
  links?: RawLinks | { url?: string; label?: string }[] | null;
  canonicalMasterId?: string;
  canonicalMasterTitle?: string;
  ssd?: {
    albumuuid?: string;
    tracks?: { n?: number; title?: string; mood?: string; notes?: string }[];
    hyperfollow_url?: string;
    localCover?: string;
  };
};

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

function mergeLinks(
  master?: CatalogWork["links"],
  ssd?: CatalogWork["links"]
): CatalogWork["links"] | undefined {
  if (Array.isArray(master) || Array.isArray(ssd)) {
    return (ssd ?? master) || undefined;
  }
  const out = Object.fromEntries(
    Object.entries({
      ...((master as RawLinks) || {}),
      ...((ssd as RawLinks) || {}),
    }).filter(([, value]) => !!value)
  );
  return Object.keys(out).length ? out : undefined;
}

function mergeMasterAndSsd(master: CatalogWork, ssd: CatalogWork): CatalogWork {
  const mergedLinks = mergeLinks(master.links, ssd.links);
  const hyperfollow =
    ssd.href ||
    (ssd.links && !Array.isArray(ssd.links) ? ssd.links.hyperfollow || ssd.links.listen : "") ||
    ssd.ssd?.hyperfollow_url;

  return {
    ...master,
    ...ssd,
    id: master.id,
    type: master.type || "music",
    title: ssd.title || master.title,
    releasedAt: ssd.releasedAt || master.releasedAt,
    cover: ssd.cover || master.cover,
    tags: uniq([...(master.tags || []), ...(ssd.tags || [])]),
    moodTags: (ssd.moodTags && ssd.moodTags.length ? ssd.moodTags : master.moodTags) || [],
    links:
      mergedLinks && !Array.isArray(mergedLinks) && !mergedLinks.listen && hyperfollow
        ? { ...mergedLinks, listen: hyperfollow }
        : mergedLinks,
    href: master.href || ssd.href,
    primaryHref: master.primaryHref || master.href || ssd.primaryHref || ssd.href || hyperfollow,
    salesHref: master.salesHref || ssd.salesHref || ssd.href,
    matchInfo: ssd.matchInfo || master.matchInfo,
    canonicalMasterId: ssd.canonicalMasterId,
    canonicalMasterTitle: ssd.canonicalMasterTitle,
    ssd: ssd.ssd || master.ssd,
  };
}

function prepareStandaloneSsd(ssd: CatalogWork): CatalogWork {
  const links =
    ssd.links && !Array.isArray(ssd.links) && !ssd.links.listen && ssd.href
      ? { ...ssd.links, listen: ssd.href }
      : ssd.links;

  return {
    ...ssd,
    type: ssd.type || "music",
    tags: uniq(ssd.tags || []),
    links,
    primaryHref:
      String(
        ssd.primaryHref ||
          ssd.href ||
          (links && !Array.isArray(links) ? links.listen : "") ||
          ""
      ) || undefined,
  };
}

function asArray(json: unknown): CatalogWork[] {
  if (Array.isArray((json as { items?: unknown[] })?.items)) {
    return (json as { items: CatalogWork[] }).items;
  }
  return Array.isArray(json) ? (json as CatalogWork[]) : [];
}

export function mergeWorksCatalog(masterJson: unknown, ssdJson: unknown): CatalogWork[] {
  const masterItems = asArray(masterJson);
  const ssdItems = asArray(ssdJson);

  const merged = masterItems.map((item) => ({ ...item }));
  const byId = new Map<string, number>();
  const masterMusicByTitle = new Map<string, CatalogWork>();

  for (let i = 0; i < merged.length; i++) {
    const id = String(merged[i].id ?? "");
    if (id) byId.set(id, i);
    if (String(merged[i].type).toLowerCase() === "music") {
      masterMusicByTitle.set(normalizeTitle(merged[i].title), merged[i]);
    }
  }

  for (const ssd of ssdItems) {
    const canonicalId = ssd.canonicalMasterId ? String(ssd.canonicalMasterId) : "";
    const ownId = ssd.id ? String(ssd.id) : "";
    const titleMatch = masterMusicByTitle.get(normalizeTitle(ssd.title));
    const matchedId =
      (canonicalId && byId.has(canonicalId) && canonicalId) ||
      (ownId && byId.has(ownId) && ownId) ||
      (titleMatch?.id ? String(titleMatch.id) : "");

    if (matchedId && byId.has(matchedId)) {
      const idx = byId.get(matchedId)!;
      merged[idx] = mergeMasterAndSsd(merged[idx], ssd);
      continue;
    }

    merged.push(prepareStandaloneSsd(ssd));
  }

  return merged;
}
