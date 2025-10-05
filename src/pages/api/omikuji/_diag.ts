import type { NextApiRequest, NextApiResponse } from "next";
import { OMIKUJI_COUNT, getById } from "../../../lib/omikuji";
import { recommendWorks } from "../../../lib/reco";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
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
    const recoSample = first ? recommendWorks(first, 3, "diag") : [];
    res.status(200).json({
      ok: true,
      count: OMIKUJI_COUNT,
      hasFirst: !!first,
      hasLast: !!last,
      sample,
      recoSampleCount: recoSample.length,
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: String(e?.message ?? e) });
  }
}
