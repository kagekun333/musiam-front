import type { GatesManifest, GateItem } from "@/types/gates";
import gates from "@/../public/gates/manifest.json";

export function getGates(sort: GatesManifest["defaultSort"] = "order"): GateItem[] {
  const items = (gates as GatesManifest).items.slice();
  const by = sort || (gates as GatesManifest).defaultSort || "order";
  return items.sort((a, b) => {
    if (by === "order") return (a.order ?? 0) - (b.order ?? 0);
    if (by === "title") return a.title.localeCompare(b.title, "ja");
    if (by === "createdAt" || by === "updatedAt") {
      return new Date(a[by] ?? 0).getTime() - new Date(b[by] ?? 0).getTime();
    }
    return 0;
  });
}
