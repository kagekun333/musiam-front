import type { NextApiRequest, NextApiResponse } from "next";

const BASE  = process.env.GROQ_API_BASE_URL || "https://api.groq.com/openai/v1";
const MODEL = process.env.GROQ_MODEL || "llama-3.1-70b-versatile";
const KEY   = process.env.GROQ_API_KEY || "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!KEY) return res.status(400).json({ error: "Missing GROQ_API_KEY" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const messages = Array.isArray(body?.messages)
      ? body.messages
      : [{ role: "user", content: String(body?.message ?? "") }];

    const r = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${KEY}` },
      body: JSON.stringify({ model: MODEL, messages, temperature: 0.7 }),
    });

    const j = await r.json();
    if (!r.ok) return res.status(r.status).json(j);
    res.status(200).json({ message: j?.choices?.[0]?.message });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "internal error" });
  }
}
