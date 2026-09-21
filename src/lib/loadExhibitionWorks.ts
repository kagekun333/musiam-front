import type { ExhibitionWork } from "@/lib/exhibition-projection";

export type { ExhibitionWork } from "@/lib/exhibition-projection";

const EXHIBITION_PATH = "/api/exhibition";

/**
 * The browser consumes the server's R7-A canonical exhibition projection.
 * It never joins catalog files or resolves identities client-side.
 */
export async function loadExhibitionWorks(): Promise<ExhibitionWork[]> {
  const response = await fetch(EXHIBITION_PATH, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to fetch ${EXHIBITION_PATH}`);
  const body = await response.json();
  return Array.isArray(body?.items) ? body.items : [];
}
