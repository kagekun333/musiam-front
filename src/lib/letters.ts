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
  /** frontmatterの `keywords: a,b,c` をカンマ分割したもの。SEO(meta keywords)/GEO(JSON-LD keywords)で使う。 */
  keywords: string[];
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

/** ごく簡易なMarkdown→HTML (見出し/段落/強調/リンクのみ。依存なし)
 *  アフィリエイト/PRリンク記法: [表示テキスト](https://example.com){sponsored}
 *  通常のリンクの末尾に `{sponsored}` を付けるだけで、
 *  - 目に見える「PR」バッジ
 *  - rel="sponsored nofollow noopener"（ステマ規制/検索エンジン向けの明示）
 *  - target="_blank"
 *  が自動的に付与される。手紙の本文を書くときにこれだけ覚えればよい。 */
export function renderMarkdown(md: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc(md)
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]+|\/[^)]*)\)(\{sponsored\})?/g,
      (_full, text: string, href: string, sponsored?: string) =>
        sponsored
          ? `<a href="${href}" rel="sponsored nofollow noopener" target="_blank">${text}<span class="letter-pr-badge">PR</span></a>`
          : `<a href="${href}">${text}</a>`
    )
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
      keywords: meta.keywords
        ? meta.keywords.split(/[、,]/).map((k) => k.trim()).filter(Boolean)
        : [],
    });
  }
  return letters.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getLetter(slug: string): Promise<Letter | null> {
  const all = await getLetters();
  return all.find((l) => l.slug === slug) ?? null;
}

/** slug指定の手紙の、時系列で1つ前/1つ後の手紙を返す(一覧は新しい順)。 */
export async function getAdjacentLetters(
  slug: string
): Promise<{ prev: Letter | null; next: Letter | null }> {
  const all = await getLetters();
  const i = all.findIndex((l) => l.slug === slug);
  if (i === -1) return { prev: null, next: null };
  // all は新しい順。next=より新しい手紙(1つ前の要素)、prev=より古い手紙(1つ後の要素)。
  return { prev: all[i + 1] ?? null, next: all[i - 1] ?? null };
}

/** 本文中の「## よくある質問」ブロックから Q&A を抜き出す (GEO用 FAQPage JSON-LD の元データ)。
 *  手紙は `**Q. 質問文**\n\n回答文` という形式で書かれている前提。存在しない/形式が違う場合は空配列。 */
export function extractLetterFaq(body: string): { q: string; a: string }[] {
  const parts = body.split(/^## よくある質問\s*$/m);
  if (parts.length < 2) return [];
  let section = parts[1];
  const sigIdx = section.search(/^\*\*ABI伯爵\*\*\s*$/m);
  if (sigIdx >= 0) section = section.slice(0, sigIdx);

  const qas: { q: string; a: string }[] = [];
  const re = /\*\*Q\.\s*([^\n*]+?)\*\*\s*\n+([\s\S]*?)(?=\n{2,}\*\*Q\.|\n{2,}##|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section))) {
    const q = m[1].trim();
    const a = m[2].trim().replace(/\n+/g, " ");
    if (q && a) qas.push({ q, a });
  }
  return qas;
}

export type LetterMonthGroup = { key: string; label: string; letters: Letter[] };

/** 手紙を年月ごとにグルーピングする(新しい月順)。年代記を辿る動線用。 */
export function groupLettersByMonth(letters: Letter[]): LetterMonthGroup[] {
  const map = new Map<string, Letter[]>();
  for (const l of letters) {
    const key = /^\d{4}-\d{2}/.test(l.date) ? l.date.slice(0, 7) : "その他";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(l);
  }
  return Array.from(map.entries()).map(([key, group]) => {
    const m = key.match(/^(\d{4})-(\d{2})$/);
    const label = m ? `${m[1]}年${Number(m[2])}月` : key;
    return { key, label, letters: group };
  });
}
