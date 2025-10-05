import type { NextApiRequest, NextApiResponse } from 'next';
import { OMIKUJI_COUNT, getById, normalizeLang } from '@/lib/omikuji';
import { seededIndex } from '@/lib/hash';


export default function handler(req: NextApiRequest, res: NextApiResponse) {
const seedRaw = (req.query.seed ?? '').toString() || 'global';
const lang = normalizeLang(req.query.lang);
const idx = seededIndex(seedRaw, OMIKUJI_COUNT);
const id = idx + 1; // 1-based
const item = getById(id);
if (!item) return res.status(404).json({ error: 'Not found', id });
return res.status(200).json({ item, lang });
}