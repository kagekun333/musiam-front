// src/app/page.tsx — 没入アトラス・ホーム（リノベv2）。
// サーバーで地方サマリ＋件数を算出し、クライアントの RealmHome（入領ゲート＋地図）へ渡す。
// 旧ホームは /classic に退避（フォールバック）。
import type { Metadata } from "next";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import { dedupeWorks } from "@/lib/dedupeWorks";
import { buildAtlas, type AtlasWork } from "@/lib/atlas/regions";
import { getCatalogCounts } from "@/lib/catalog-counts";
import RealmHome from "@/components/realm/RealmHome";

export const metadata: Metadata = {
  title: "伯爵 MUSIAM — 作品でできた国を巡る",
  description:
    "伯爵MUSIAMは、作品でできた、ひとつの奇妙で美しい国。羊皮紙の天球図を歩いて、聴いて、発見する。地方を巡り、伯爵とAIの工房をのぞく。",
};

export const revalidate = 3600;

export default async function Home() {
  const merged = (await loadMergedWorksServer()) as AtlasWork[];
  const display = dedupeWorks(merged as Parameters<typeof dedupeWorks>[0]) as AtlasWork[];
  const regions = buildAtlas(display, (w) => `/works/${encodeURIComponent(String(w.id))}`).map((r) => ({
    id: r.id,
    ja: r.ja,
    en: r.en,
    glyph: r.glyph,
    accent: r.accent,
    count: r.count,
    landmark: r.landmark,
  }));
  const counts = await getCatalogCounts();

  return <RealmHome regions={regions} counts={counts} />;
}
