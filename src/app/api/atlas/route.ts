// src/app/api/atlas/route.ts
//
// アトラス（F2）: 地方サマリを軽量に返す API。
// - merged works を地方へ自動割当（タグ駆動）し、地方ごとの件数・名所・最近ひらかれた土地・巡る入口を返す。
// - 作品リンクは内部 /works/[id]（領内に留め、SEO作品ページへ誘導）。
// - 重い結合はサーバー側で1回だけ。トップは軽い JSON を読むのみ（SEO/速度を守る）。
//
// GET /api/atlas  →  JSON

import { NextResponse } from "next/server";
import { loadMergedWorksServer } from "@/lib/loadMergedWorksServer";
import { dedupeWorks } from "@/lib/dedupeWorks";
import { buildAtlas, type AtlasWork } from "@/lib/atlas/regions";

export const runtime = "nodejs";

export async function GET() {
  const merged = (await loadMergedWorksServer()) as AtlasWork[];
  // 表示集合と一致させるため重複除去（/works と同じ畳み込み）。
  const display = dedupeWorks(merged as Parameters<typeof dedupeWorks>[0]) as AtlasWork[];

  // 領内に留める内部リンク。
  const hrefResolver = (w: AtlasWork) => `/works/${encodeURIComponent(String(w.id))}`;

  const regions = buildAtlas(display, hrefResolver);
  const totalWorks = display.length;
  const totalRegions = regions.length;

  return NextResponse.json(
    { ok: true, totalWorks, totalRegions, regions },
    {
      status: 200,
      headers: {
        // 作品データ更新まで安定。新作取り込み後に自然反映。
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
      },
    }
  );
}
