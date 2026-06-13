// src/lib/letters.ts — 「伯爵の手紙」(/letters) のMarkdownローダー
// content/letters/*.md を読む。frontmatter は --- 区切りの簡易形式 (依存追加なし)。
//
// 記事の書き方: content/letters/my-first-letter.md
// ---
// title: 手紙の題
// date: 2026-06-13
// description: 一覧と検索結果に出る要約文
// ---
// 本文(Markdown)...

import fs from "node:fs/promises";
import path from "node:path";

export type Letter = {
  slug: string;
  title: string;
  date: string;
  description: string;
  body: string;
};

const DIR = path.join(process.cwd(), "content/letters");

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, body: m[2].trim() };
}

/** ごく簡易なMarkdown→HTML (見出し/段落/強調/リンクのみ。依存なし) */
export function renderMarkdown(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc(md)
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]*)\)/g, '<a href="$2">$1</a>')
    .split(/\n{2,}/)
    .map((block) => (block.startsWith("<h") ? block : `<p>${block.replace(/\n/g, "<br/>")}</p>`))
    .join("\n");
}

export async function getLetters(): Promise<Letter[]> {
  let files: string[] = [];
  try {
    files = (await fs.readdir(DIR)).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  const letters: Letter[] = [];
  for (const f of files) {
    const raw = await fs.readFile(path.join(DIR, f), "utf-8");
    const { meta, body } = parseFrontmatter(raw);
    letters.push({
      slug: f.replace(/\.md$/, ""),
      title: meta.title || f,
      date: meta.date || "",
      description: meta.description || body.slice(0, 80),
      body,
    });
  }
  return letters.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getLetter(slug: string): Promise<Letter | null> {
  const all = await getLetters();
  return all.find((l) => l.slug === slug) ?? null;
}
