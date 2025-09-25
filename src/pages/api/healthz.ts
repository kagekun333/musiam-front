// src/pages/api/healthz.ts
import type { NextApiRequest, NextApiResponse } from "next";

import { loadAllWorksCached } from "../../../lib/works";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
try {
if (!process.env.GROQ_API_KEY) throw new Error("no_groq_key");
const works = await loadAllWorksCached();
if (!Array.isArray(works) || works.length === 0) throw new Error("no_works");
return res.status(200).json({ ok: true, env: "ok", works: works.length });
} catch (e: any) {
return res.status(500).json({ ok: false, error: e?.message ?? "failed" });
}
}