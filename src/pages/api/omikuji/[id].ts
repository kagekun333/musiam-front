import type { NextApiRequest, NextApiResponse } from 'next';
import { getById, normalizeLang } from '@/lib/omikuji';


export default function handler(req: NextApiRequest, res: NextApiResponse) {
const id = Number(req.query.id);
if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' });
const lang = normalizeLang(req.query.lang);
const item = getById(id);
if (!item) return res.status(404).json({ error: 'Not found' });
return res.status(200).json({ item, lang });
}