#!/usr/bin/env tsx
/**
 * Build script: content/exhibits/*.md → public/works/works.json
 *
 * Usage:  pnpm run build:exhibits
 *
 * Behaviour:
 *  1. Read all .md files in content/exhibits/ (excluding .files & example.md)
 *  2. Parse YAML frontmatter → Work objects
 *  3. Merge with existing works.json (new overrides by ID)
 *  4. Sort by releasedAt desc
 *  5. Write to public/works/works.json
 *  6. Print validation summary (counts, link gaps, date parse)
 */

import * as fs from "fs";
import * as path from "path";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Work {
  id: string;
  title: string;
  type: "music" | "video" | "art" | "book" | "article";
  cover: string;
  tags?: string[];
  links?: Partial<Record<"listen" | "watch" | "read" | "nft", string>>;
  releasedAt?: string;
  weight?: number;
  previewUrl?: string;
  moodTags?: string[];
  moodSeeds?: string[];
  href?: string;
  description?: string;
  aspect?: string;
  priority?: number;
}

interface WorksDoc {
  items: Work[];
}

/* ------------------------------------------------------------------ */
/*  Frontmatter parser                                                 */
/* ------------------------------------------------------------------ */

function parseFrontmatter(content: string): { data: Record<string, any>; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };

  const [, frontmatter, body] = match;
  const data: Record<string, any> = {};

  let currentKey = "";
  let currentArray: string[] = [];
  let currentObject: Record<string, string> = {};
  let inArray = false;
  let inObject = false;

  const flushCurrent = () => {
    if (currentKey) {
      if (inArray) data[currentKey] = currentArray;
      else if (inObject) data[currentKey] = currentObject;
    }
    currentKey = "";
    currentArray = [];
    currentObject = {};
    inArray = false;
    inObject = false;
  };

  for (const line of frontmatter.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Array item (indented "- value")
    if (trimmed.startsWith("- ")) {
      if (currentKey) {
        inArray = true;
        currentArray.push(trimmed.slice(2).replace(/^["']|["']$/g, ""));
      }
      continue;
    }

    // Indented key:value (for nested objects like links)
    if (/^\s{2,}/.test(line) && currentKey) {
      const nestedMatch = trimmed.match(/^(\w+):\s*(.*)$/);
      if (nestedMatch) {
        inObject = true;
        currentObject[nestedMatch[1]] = nestedMatch[2].replace(/^["']|["']$/g, "");
      }
      continue;
    }

    // Top-level key: value
    const kvMatch = trimmed.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      flushCurrent();
      const [, key, value] = kvMatch;
      currentKey = key;

      // Empty value → next lines decide array or object
      if (!value || value === "[]" || value === "{}") continue;

      // Inline array: [a, b, c]
      if (value.startsWith("[") && value.endsWith("]")) {
        const inner = value.slice(1, -1);
        data[key] = inner
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
        currentKey = "";
        continue;
      }

      // Simple value
      const cleaned = value.replace(/^["']|["']$/g, "");
      if (cleaned === "true") data[key] = true;
      else if (cleaned === "false") data[key] = false;
      else if (/^\d+$/.test(cleaned)) data[key] = parseInt(cleaned, 10);
      else if (/^\d+\.\d+$/.test(cleaned)) data[key] = parseFloat(cleaned);
      else data[key] = cleaned;

      currentKey = "";
      continue;
    }
  }

  flushCurrent();
  return { data, body: body.trim() };
}

/* ------------------------------------------------------------------ */
/*  MD → Work                                                          */
/* ------------------------------------------------------------------ */

function mdToWork(filePath: string): Work {
  const content = fs.readFileSync(filePath, "utf-8");
  const { data, body } = parseFrontmatter(content);
  const filename = path.basename(filePath, ".md");
  const id = data.id || filename;

  const work: Work = {
    id,
    title: data.title || filename,
    type: data.type || "article",
    cover: data.cover || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    releasedAt: data.releasedAt ? String(data.releasedAt) : new Date().toISOString().split("T")[0],
    weight: data.weight,
    previewUrl: data.previewUrl || "",
  };

  // Optional string fields
  if (data.description) work.description = String(data.description);
  if (data.aspect) work.aspect = String(data.aspect);
  if (data.href) work.href = String(data.href);
  if (data.priority !== undefined) work.priority = Number(data.priority);

  // Links object
  if (data.links && typeof data.links === "object") {
    work.links = {};
    for (const k of ["listen", "watch", "read", "nft"] as const) {
      if (data.links[k]) (work.links as Record<string, string>)[k] = data.links[k];
    }
  }

  // Mood tags
  if (Array.isArray(data.moodTags)) work.moodTags = data.moodTags;
  if (Array.isArray(data.moodSeeds)) work.moodSeeds = data.moodSeeds;

  // Use body as description if not set in frontmatter
  if (!work.description && body && body.length > 0 && !body.startsWith("#")) {
    work.description = body.slice(0, 200);
  }

  return work;
}

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

function validate(items: Work[], existingCount: number): void {
  console.log("\n════════════════════════════════════");
  console.log(" 📊 VALIDATION SUMMARY");
  console.log("════════════════════════════════════");

  // Total count
  console.log(`\n  Total items:       ${items.length}`);
  console.log(`  (Previous count:   ${existingCount})`);

  // By type
  const types: Record<string, number> = {};
  for (const w of items) types[w.type] = (types[w.type] || 0) + 1;
  console.log("\n  By type:");
  for (const [k, v] of Object.entries(types).sort()) {
    console.log(`    ${k.padEnd(12)} ${v}`);
  }

  // Link coverage
  let listenCount = 0;
  let readCount = 0;
  let watchCount = 0;
  let nftCount = 0;
  let hrefCount = 0;
  let noLinksCount = 0;
  for (const w of items) {
    const l = w.links || {};
    if (l.listen) listenCount++;
    if (l.read) readCount++;
    if (l.watch) watchCount++;
    if (l.nft) nftCount++;
    if (w.href) hrefCount++;
    if (!(l.listen || l.read || l.watch || l.nft || w.href)) noLinksCount++;
  }
  console.log("\n  Link coverage:");
  console.log(`    listen (Spotify)  ${listenCount}`);
  console.log(`    read (Amazon)     ${readCount}`);
  console.log(`    watch (YouTube)   ${watchCount}`);
  console.log(`    nft               ${nftCount}`);
  console.log(`    href (fallback)   ${hrefCount}`);
  console.log(`    ⚠  NO links       ${noLinksCount}`);

  // Date parse check
  let dateOk = 0;
  let dateFail = 0;
  const badDates: string[] = [];
  for (const w of items) {
    if (!w.releasedAt) {
      dateFail++;
      badDates.push(`  ${w.id}: (empty)`);
    } else if (isNaN(Date.parse(w.releasedAt))) {
      dateFail++;
      badDates.push(`  ${w.id}: "${w.releasedAt}"`);
    } else {
      dateOk++;
    }
  }
  console.log(`\n  releasedAt parse:  ${dateOk} OK, ${dateFail} FAIL`);
  if (badDates.length > 0) {
    console.log("  ⚠  Bad dates:");
    badDates.slice(0, 10).forEach((d) => console.log(`    ${d}`));
    if (badDates.length > 10) console.log(`    ... and ${badDates.length - 10} more`);
  }

  // Cover check
  let noCover = 0;
  for (const w of items) {
    if (!w.cover) noCover++;
  }
  if (noCover > 0) console.log(`\n  ⚠  Missing cover:  ${noCover}`);

  console.log("\n════════════════════════════════════\n");
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

async function buildExhibits() {
  const exhibitsDir = path.join(process.cwd(), "content/exhibits");
  const worksJsonPath = path.join(process.cwd(), "public/works/works.json");

  console.log("📦  Building exhibits...\n");

  // 1. Read existing works.json
  let existingWorks: Work[] = [];
  if (fs.existsSync(worksJsonPath)) {
    const json: WorksDoc = JSON.parse(fs.readFileSync(worksJsonPath, "utf-8"));
    existingWorks = json.items || [];
    console.log(`  ✓ Loaded ${existingWorks.length} existing works from works.json`);
  }
  const existingCount = existingWorks.length;

  // 2. Read MD files
  const newWorks: Work[] = [];
  if (fs.existsSync(exhibitsDir)) {
    const files = fs
      .readdirSync(exhibitsDir)
      .filter((f) => f.endsWith(".md") && !f.startsWith(".") && f !== "example.md");

    for (const file of files) {
      try {
        const work = mdToWork(path.join(exhibitsDir, file));
        newWorks.push(work);
        console.log(`  ✓ ${file} → ${work.id}`);
      } catch (error) {
        console.error(`  ✗ Error in ${file}:`, error);
      }
    }
    console.log(`\n  Converted ${newWorks.length} MD files`);
  } else {
    console.log(`  ℹ No content/exhibits/ directory – using existing data only`);
  }

  // 3. Merge: new works override existing
  const workMap = new Map<string, Work>();
  for (const work of existingWorks) workMap.set(work.id, work);
  for (const work of newWorks) workMap.set(work.id, work);

  const mergedWorks = Array.from(workMap.values());

  // 4. Sort by releasedAt desc (priority-boosted items first if same date)
  mergedWorks.sort((a, b) => {
    const pa = a.priority ?? 0;
    const pb = b.priority ?? 0;
    if (pa !== pb) return pb - pa;
    const da = a.releasedAt ? Date.parse(a.releasedAt) : 0;
    const db = b.releasedAt ? Date.parse(b.releasedAt) : 0;
    return db - da;
  });

  // 5. Write
  const output: WorksDoc = { items: mergedWorks };
  fs.writeFileSync(worksJsonPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\n  ✓ Wrote ${mergedWorks.length} works → ${worksJsonPath}`);

  // 6. Validate
  validate(mergedWorks, existingCount);

  console.log("✅  Build complete!");
}

buildExhibits().catch((error) => {
  console.error("❌ Build failed:", error);
  process.exit(1);
});
