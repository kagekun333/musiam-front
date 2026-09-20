import { getPrimaryPublicHref } from "@/lib/work-links";

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
  /** Explicit, stable aliases only. A display title is never an alias. */
  catalogAliases?: string[];
  identifiers?: {
    release?: { albumuuid?: string | null; upc?: string | null };
    recordings?: { isrc: string; trackNumber: number | null }[];
  };
  contentEvidence?: {
    description: string;
    source: string;
    reviewedAt: string;
    assetSha256: string;
  };
  catalogStatus?: {
    identityConflict: boolean;
    recommendationReady?: boolean;
    recommendationEligible?: boolean;
    source?: string;
  };
  ssd?: {
    albumuuid?: string;
    tracks?: { n?: number; title?: string; mood?: string; notes?: string }[];
    hyperfollow_url?: string;
    localCover?: string;
  };
};

function uniq(values: (string | undefined)[] | undefined): string[] {
  return Array.from(new Set((values || []).map((x) => String(x || "").trim()).filter(Boolean)));
}

function mergeLinks(
  master?: CatalogWork["links"],
  ssd?: CatalogWork["links"]
): CatalogWork["links"] | undefined {
  if (Array.isArray(master) || Array.isArray(ssd)) {
    return (master ?? ssd) || undefined;
  }
  const out = Object.fromEntries(
    Object.entries({
      ...((ssd as RawLinks) || {}),
      ...Object.fromEntries(Object.entries((master as RawLinks) || {}).filter(([, value]) => !!value)),
    }).filter(([, value]) => !!value)
  );
  return Object.keys(out).length ? out : undefined;
}

function mergeMasterAndSsd(master: CatalogWork, ssd: CatalogWork): CatalogWork {
  const mergedLinks = mergeLinks(master.links, ssd.links);

  const merged: CatalogWork = {
    ...ssd,
    ...master,
    id: master.id,
    type: master.type || "music",
    title: master.title || ssd.title,
    releasedAt: master.releasedAt || ssd.releasedAt,
    cover: master.cover || ssd.cover,
    tags: uniq([...(master.tags || []), ...(ssd.tags || [])]),
    moodTags: uniq([...(master.moodTags || []), ...(ssd.moodTags || [])]),
    links: mergedLinks,
    href: master.href || ssd.href,
    primaryHref: master.primaryHref || master.href || ssd.primaryHref || ssd.href,
    salesHref: master.salesHref || ssd.salesHref,
    matchInfo: master.matchInfo || ssd.matchInfo,
    canonicalMasterId: ssd.canonicalMasterId,
    canonicalMasterTitle: ssd.canonicalMasterTitle,
    catalogAliases: uniq([
      ...(master.catalogAliases ?? []),
      ...(ssd.catalogAliases ?? []),
      ...(ssd.id != null && String(ssd.id) !== String(master.id) ? [String(ssd.id)] : []),
    ]),
    ssd: ssd.ssd || master.ssd,
  };

  return {
    ...merged,
    primaryHref: getPrimaryPublicHref(merged),
  };
}

function prepareStandaloneSsd(ssd: CatalogWork): CatalogWork {
  const links = ssd.links;

  const prepared: CatalogWork = {
    ...ssd,
    type: ssd.type || "music",
    tags: uniq(ssd.tags || []),
    links,
    primaryHref: ssd.primaryHref,
  };

  return {
    ...prepared,
    primaryHref: getPrimaryPublicHref(prepared),
  };
}

function asArray(json: unknown): CatalogWork[] {
  if (Array.isArray((json as { items?: unknown[] })?.items)) {
    return (json as { items: CatalogWork[] }).items;
  }
  return Array.isArray(json) ? (json as CatalogWork[]) : [];
}

function releaseIdentity(work: CatalogWork): string | null {
  if (work.type && work.type !== "music") return null;
  const value = String(work.identifiers?.release?.albumuuid ?? work.ssd?.albumuuid ?? "")
    .replace(/-/g, "")
    .toLowerCase();
  return /^[a-f0-9]{32}$/.test(value) ? value : null;
}

export function mergeWorksCatalog(masterJson: unknown, ssdJson: unknown): CatalogWork[] {
  const masterItems = asArray(masterJson);
  const ssdItems = asArray(ssdJson);

  const merged = masterItems.map((item) => ({ ...item }));
  const byId = new Map<string, number>();

  for (let i = 0; i < merged.length; i++) {
    const id = String(merged[i].id ?? "");
    if (id) byId.set(id, i);
  }

  for (const ssd of ssdItems) {
    const canonicalId = ssd.canonicalMasterId ? String(ssd.canonicalMasterId) : "";
    const ownId = ssd.id ? String(ssd.id) : "";
    const matchedId =
      (canonicalId && byId.has(canonicalId) && canonicalId) ||
      (ownId && byId.has(ownId) && ownId);

    if (matchedId && byId.has(matchedId)) {
      const idx = byId.get(matchedId)!;
      merged[idx] = mergeMasterAndSsd(merged[idx], ssd);
      continue;
    }

    // A title helps people find a work, but is never identity proof.
    if (ownId) byId.set(ownId, merged.length);
    merged.push(prepareStandaloneSsd(ssd));
  }

  // Older exports can use different work IDs for the exact same release UUID.
  // Track ISRCs and title equality deliberately do not take part in this join.
  const releases = new Map<string, number>();
  const stable: CatalogWork[] = [];
  for (const work of merged) {
    const uuid = releaseIdentity(work);
    const prior = uuid ? releases.get(uuid) : undefined;
    if (prior !== undefined) {
      stable[prior] = mergeMasterAndSsd(stable[prior], work);
    } else {
      if (uuid) releases.set(uuid, stable.length);
      stable.push(work);
    }
  }
  return stable;
}
