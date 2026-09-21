import type { NextApiRequest, NextApiResponse } from "next";
import { loadExhibitionProjection } from "@/lib/exhibition-projection";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end();
  }

  const projection = await loadExhibitionProjection();
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ items: projection.works });
}
