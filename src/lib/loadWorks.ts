// src/lib/loadWorks.ts
export type Work = {
  id: string;
  title: string;
  type: "music" | "book" | "art" | "video" | "article";
  cover: string;               // e.g. "/gates/torii.jpg"
  summary?: string;
  tags: string[];
  links: {
    listen?: string;
    watch?: string;
    read?: string;
    nft?: string;
  };
  releasedAt: string;          // ISO date
  weight?: number;             // 0.1–1.5 (default 1.0)
  previewUrl?: string;         // short media/thumbnail
  og?: string;                 // share text
};

type WorksFile = { items: Work[] };

const PUBLIC_PATH = "/works/works.json";

/** Server/Client両対応で /public/works/works.json を読み込む */
export async function loadWorks(): Promise<Work[]> {
  // ブラウザ（Client）
  if (typeof window !== "undefined") {
    const res = await fetch(PUBLIC_PATH, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch ${PUBLIC_PATH}`);
    const data = (await res.json()) as WorksFile;
    return data.items ?? [];
  }
  // サーバ（SSR/Node）
  const fs = await import("fs/promises");
  const path = await import("path");
  const file = await fs.readFile(
    path.join(process.cwd(), "public", "works", "works.json"),
    "utf8"
  );
  const data = JSON.parse(file) as WorksFile;
  return data.items ?? [];
}
