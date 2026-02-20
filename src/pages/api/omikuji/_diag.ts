// src/pages/api/omikuji/_diag.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { OMIKUJI_COUNT, getById } from "../../../lib/omikuji";
import { pickRecommendedWorks } from "@/lib/reco";
import { loadWorks } from "../../../lib/loadWorks";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const first = getById(1);
    const last = getById(100);

    const sample = first
      ? {
          id: first.id,
          rank_ja: first.rank_ja,
          rank_en: first.rank_en,
          header_ja: first.header_ja,
          header_en: first.header_en,
          line_count: first.lines?.length ?? 0,
        }
      : null;

    // works 全体を取得 → loadWorks がすでに正規化済み
    const catalog = await loadWorks();

    // 「今日のランク」で 3 件ピック（moodTags ベース）
    const recoSample = first
      ? pickRecommendedWorks({ rankEn: first.rank_en, works: catalog, n: 3 })
      : [];

    res.status(200).json({
      ok: true,
      count: OMIKUJI_COUNT,
      hasFirst: !!first,
      hasLast: !!last,
      sample,
      recoSampleCount: recoSample.length,
      // 参考: 確認用に中身も返したければ以下を一時的に出す
      recoSampleFields: recoSample.map((w) => ({
        id: w.id,
        stableKey: w.stableKey,
        title: w.title,
        primaryHref: w.primaryHref,
        salesHref: w.salesHref,
        moodTags: w.moodTags?.slice(0, 3),
      })),
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
}
