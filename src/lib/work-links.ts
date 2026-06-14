type RawLinks = Record<string, string | null | undefined>;

type WorkLike = {
  type?: string;
  href?: string;
  primaryHref?: string;
  salesHref?: string;
  links?: RawLinks | { url?: string; label?: string }[] | null;
};

export type PublicLinkKind = "spotify" | "appleMusic" | "amazonMusic" | "listen" | "read" | "open";
export type PublicLink = { kind: PublicLinkKind; url: string };

function asLinkMap(links: WorkLike["links"]): RawLinks | null {
  if (!links || Array.isArray(links) || typeof links !== "object") return null;
  return links as RawLinks;
}

export function isHyperfollowUrl(url?: string) {
  return /distrokid\.com\/hyperfollow/i.test(String(url || ""));
}

export function isApplePurchaseUrl(url?: string) {
  const value = String(url || "");
  return /itunes\.apple\.com/i.test(value) || (/music\.apple\.com/i.test(value) && /[?&]app=itunes/i.test(value));
}

export function isSpotifyUrl(url?: string) {
  return /open\.spotify\.com|spotify:/i.test(String(url || ""));
}

export function isAppleMusicStreamingUrl(url?: string) {
  const value = String(url || "");
  return /music\.apple\.com/i.test(value) && !/[?&]app=itunes/i.test(value);
}

export function isAmazonMusicUrl(url?: string) {
  return /music\.amazon\.(co\.jp|com)/i.test(String(url || ""));
}

function isAudioStreamUrl(url?: string) {
  const value = String(url || "");
  return (
    isSpotifyUrl(value) ||
    isAppleMusicStreamingUrl(value) ||
    isAmazonMusicUrl(value) ||
    /soundcloud\.com/i.test(value) ||
    /youtube\.com|youtu\.be/i.test(value)
  );
}

function normalizeType(type?: string) {
  const value = String(type || "").toLowerCase();
  if (value === "music" || value.includes("album") || value.includes("track") || value.includes("song")) return "music";
  if (value === "book" || value.includes("book") || value.includes("novel") || value.includes("pdf")) return "book";
  return "other";
}

export function getMusicStreamingLinks(work: WorkLike): PublicLink[] {
  const links = asLinkMap(work.links);
  const out: PublicLink[] = [];
  const push = (kind: PublicLinkKind, url?: string | null) => {
    const value = String(url || "").trim();
    if (!value || isHyperfollowUrl(value) || isApplePurchaseUrl(value)) return;
    if (!isAudioStreamUrl(value)) return;
    if (out.some((item) => item.url === value)) return;
    out.push({ kind, url: value });
  };

  push("spotify", links?.spotify || work.primaryHref || work.href);
  push("appleMusic", links?.appleMusic);
  push("amazonMusic", links?.amazonMusic);
  push("listen", links?.listen);
  push("listen", work.primaryHref);
  push("listen", work.href);

  return out;
}

export function getPrimaryPublicHref(work: WorkLike): string | undefined {
  const type = normalizeType(work.type);
  const links = asLinkMap(work.links);

  if (type === "music") {
    return getMusicStreamingLinks(work)[0]?.url;
  }

  if (type === "book") {
    return (
      String(
        work.primaryHref ||
          work.href ||
          links?.read ||
          links?.amazon ||
          ""
      ).trim() || undefined
    );
  }

  return (
    String(
        work.primaryHref ||
        work.href ||
        links?.listen ||
        links?.watch ||
        links?.read ||
        ""
    ).trim() || undefined
  );
}

export function getPublicLinksForCard(work: WorkLike): PublicLink[] {
  const type = normalizeType(work.type);

  if (type === "music") {
    return getMusicStreamingLinks(work);
  }

  const links = asLinkMap(work.links);
  const href = getPrimaryPublicHref(work);

  if (type === "book") {
    return href ? [{ kind: "read", url: href }] : [];
  }

  return href ? [{ kind: "open", url: href }] : links?.watch ? [{ kind: "open", url: String(links.watch) }] : [];
}
