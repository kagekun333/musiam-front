#!/usr/bin/env tsx
/**
 * Interactive CLI to add a new exhibition work.
 *
 * Usage:  pnpm run add:exhibit
 *
 * Creates content/exhibits/<slug>.md with frontmatter.
 * After creation, run:  pnpm run build:exhibits
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(answer.trim()));
  });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

const VALID_TYPES = ["music", "book", "video", "art", "article", "nft", "other"] as const;
const VALID_ASPECTS = ["1:1", "2:3", "3:4", "4:3", "16:9", "auto"] as const;

async function addExhibit() {
  console.log("\n  ╔═══════════════════════════════╗");
  console.log("  ║   Add New Exhibition Work     ║");
  console.log("  ╚═══════════════════════════════╝\n");

  /* --- Required --- */

  const title = await ask("  Title (required): ");
  if (!title) {
    console.log("  ✗ Title is required"); process.exit(1);
  }

  const typeInput = await ask(`  Type [${VALID_TYPES.join("/")}] (default: music): `);
  const type = typeInput || "music";
  if (!VALID_TYPES.includes(type as any)) {
    console.log(`  ✗ Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`); process.exit(1);
  }

  const cover = await ask("  Cover image URL or path (required): ");
  if (!cover) {
    console.log("  ✗ Cover is required"); process.exit(1);
  }

  const today = new Date().toISOString().split("T")[0];
  const releasedAt = (await ask(`  Release date [YYYY-MM-DD] (default: ${today}): `)) || today;

  /* --- Optional --- */

  console.log("\n  ── Optional fields (Enter to skip) ──\n");

  const tagsInput = await ask("  Tags (comma-separated, e.g. spotify,single,gospel): ");
  const tags = tagsInput ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean) : [];

  const description = await ask("  Short description: ");

  const aspectInput = await ask(`  Aspect ratio [${VALID_ASPECTS.join("/")}] (default: auto): `);
  const aspect = aspectInput && VALID_ASPECTS.includes(aspectInput as any) ? aspectInput : undefined;

  /* --- Links --- */

  console.log("\n  ── Links (Enter to skip) ──\n");

  const listen = await ask("  Spotify / Listen URL: ");
  const watch  = await ask("  YouTube / Watch URL:  ");
  const read   = await ask("  Amazon / Read URL:    ");
  const nft    = await ask("  NFT marketplace URL:  ");
  const website = await ask("  Website URL (href):   ");

  /* --- Generate slug & check duplicates --- */

  const exhibitsDir = path.join(process.cwd(), "content/exhibits");
  if (!fs.existsSync(exhibitsDir)) fs.mkdirSync(exhibitsDir, { recursive: true });

  let slug = slugify(title);
  const existing = fs.readdirSync(exhibitsDir).map((f) => f.replace(/\.md$/, ""));
  if (existing.includes(slug)) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  /* --- Build frontmatter --- */

  const lines: string[] = ["---"];
  lines.push(`title: "${title.replace(/"/g, '\\"')}"`);
  lines.push(`type: "${type}"`);
  lines.push(`cover: "${cover}"`);
  lines.push(`releasedAt: "${releasedAt}"`);

  if (tags.length > 0) {
    lines.push("tags:");
    tags.forEach((t) => lines.push(`  - "${t}"`));
  }

  if (description) lines.push(`description: "${description.replace(/"/g, '\\"')}"`);
  if (aspect) lines.push(`aspect: "${aspect}"`);

  const hasLinks = listen || watch || read || nft;
  if (hasLinks) {
    lines.push("links:");
    if (listen) lines.push(`  listen: "${listen}"`);
    if (watch)  lines.push(`  watch: "${watch}"`);
    if (read)   lines.push(`  read: "${read}"`);
    if (nft)    lines.push(`  nft: "${nft}"`);
  }

  if (website) lines.push(`href: "${website}"`);

  lines.push("---");
  lines.push("");

  const content = lines.join("\n");
  const filePath = path.join(exhibitsDir, `${slug}.md`);

  /* --- Write --- */

  fs.writeFileSync(filePath, content, "utf-8");

  console.log("\n  ┌─────────────────────────────────┐");
  console.log(`  │  ✅ Created: ${slug}.md`);
  console.log("  └─────────────────────────────────┘");
  console.log(`\n  📁  ${filePath}\n`);
  console.log("  Next steps:");
  console.log("    1. pnpm run build:exhibits   # rebuild JSON");
  console.log("    2. pnpm dev                  # preview locally");
  console.log("    3. git add . && git commit -m 'chore: add exhibit ${slug}'");
  console.log("    4. git push\n");

  rl.close();
}

addExhibit().catch((error) => {
  console.error("  ✗ Error:", error);
  process.exit(1);
});
