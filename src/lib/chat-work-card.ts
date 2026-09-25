import { getPublicLinksForCard } from "@/lib/work-links";
import type { CatalogWork } from "@/lib/mergeWorksCatalog";

export type ChatApiWorkCard = {
  id: string;
  title: string;
  cover: string;
  links: { kind: "open" | "listen" | "buy" | "read"; url: string }[];
  moodTags?: string[];
  type?: string;
  reason?: string;
};

/** Serialize a current Catalog work for Chat; identity always comes from its stable ID. */
export function buildChatWorkCard(work: CatalogWork, reason?: string): ChatApiWorkCard | null {
  const id = String(work.id ?? "");
  const title = String(work.title ?? "").trim();
  const cover = String(work.cover ?? "").trim();
  if (!id || id.length > 180 || !title || !cover) return null;

  const links = getPublicLinksForCard(work).map((link) => ({
    kind: (link.kind === "spotify" || link.kind === "appleMusic" || link.kind === "amazonMusic" ? "listen" : link.kind) as ChatApiWorkCard["links"][number]["kind"],
    url: link.url,
  }));
  if (!links.length) return null;

  return {
    id,
    title,
    cover,
    links,
    moodTags: (work.moodTags ?? work.tags ?? []).slice(0, 4),
    ...(work.type ? { type: work.type } : {}),
    ...(reason?.trim() ? { reason: reason.trim() } : {}),
  };
}
