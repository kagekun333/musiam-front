// src/app/api/works/route.ts
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs"; // ← fs を使うので必須

type Work = {
  slug: string;
  kind: string;
  titleJa: string;
  titleEn: string;
  href: string;
  cover?: string;     // /works/covers/... or https://...
  tags?: string[];
  noteJa?: string;
  noteEn?: string;
};

function norm(h: string) { return h.trim().toLowerCase().replace(/\s+/g, "_"); }

export async function GET() {
  try {
    const file = path.join(process.cwd(), "import", "all.tsv");
    const raw = await fs.readFile(file, "utf8");
    const lines = raw.split(/\r?\n/).filter(l => l && !/^\s*[#;]/.test(l));
    if (!lines.length) return NextResponse.json([]);

    const header = lines[0].split("\t").map(norm);
    const idx = (name: string, alts: string[] = []) => {
      const keys = [name, ...alts].map(norm);
      return header.findIndex(h => keys.includes(h));
    };

    const iSlug = idx("slug");
    const iKind = idx("type", ["kind"]);
    const iJa   = idx("title_ja", ["ja","title"]);
    const iEn   = idx("title_en", ["en"]);
    const iHref = idx("href", ["listenurl","sourceurl","url","link"]);
    const iCover= idx("cover");
    const iTags = idx("tags", ["tag","keywords"]);
    const iNJa  = idx("note_ja", ["noteja"]);
    const iNEn  = idx("note_en", ["noteen"]);

    const works: Work[] = lines.slice(1).map(line => {
      const c = line.split("\t");
      const href = (iHref >= 0 ? c[iHref] : "").trim();
      const titleJa = (iJa >= 0 ? c[iJa] : "").trim();
      const titleEn = (iEn >= 0 ? c[iEn] : "").trim() || titleJa;

      return {
        slug: iSlug >= 0 ? c[iSlug].trim() : (href ? href.replace(/^https?:\/\//, "") : ""),
        kind: (iKind >= 0 ? c[iKind] : "exhibit").trim().toLowerCase(),
        titleJa, titleEn,
        href,
        cover: iCover >= 0 ? (c[iCover]?.trim() || undefined) : undefined,
        tags: iTags >= 0 ? (c[iTags]?.split(",").map(s=>s.trim()).filter(Boolean) || []) : [],
        noteJa: iNJa >= 0 ? (c[iNJa]?.trim() || undefined) : undefined,
        noteEn: iNEn >= 0 ? (c[iNEn]?.trim() || undefined) : undefined,
      };
    }).filter(w => w.href && (w.titleJa || w.titleEn));

    return NextResponse.json(works);
  } catch (e:any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
