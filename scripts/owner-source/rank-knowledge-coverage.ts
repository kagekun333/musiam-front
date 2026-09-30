import fs from "node:fs";
import path from "node:path";
import editorialJson from "../../public/works/editorial-knowledge.json";
import ownerIndexJson from "../../ops/product/owner-source-corpus-index-v1.json";
import { loadMergedWorksServer } from "../../src/lib/loadMergedWorksServer";
import { dedupeWorks } from "../../src/lib/dedupeWorks";

const REPO = process.cwd();
const LETTER_ROOT = path.join(REPO, "content/letters");
const OUT = path.join(REPO, "ops/product/owner-source-knowledge-coverage-v1.json");

type Letter = { file: string; slug: string; text: string };
type RankedRow = {
  workId: string;
  title: string;
  type: string;
  releasedAt: string;
  score: number;
  reasons: string[];
  letterSources: Array<{ file: string; href: string }>;
  ownerMessageCandidates: number;
  aiMessageCandidates: number;
  wrapperCandidates: number;
  reviewedPacket: null | {
    evidenceStrength: string;
    ownerIntentStatus: string;
    lyricsStatus: string;
  };
};

function daysSince(dateText: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return null;
  const ms = Date.parse("2026-09-30T00:00:00Z") - Date.parse(dateText + "T00:00:00Z");
  return Math.max(0, Math.floor(ms / 86_400_000));
}

function recencyScore(dateText: string): number {
  const days = daysSince(dateText);
  if (days == null) return 0;
  if (days <= 30) return 60;
  if (days <= 90) return 45;
  if (days <= 180) return 30;
  if (days <= 365) return 15;
  return 5;
}

function letterMentionsTitle(text: string, title: string): boolean {
  const normalizedText = text.normalize("NFKC");
  const haystack = normalizedText.toLocaleLowerCase();
  const normalizedTitle = title.normalize("NFKC");
  const needle = normalizedTitle.toLocaleLowerCase();
  if (!needle) return false;
  if (/^[a-z0-9 .&!?'’-]+$/i.test(needle) && needle.replace(/[^a-z0-9]/gi, "").length <= 4) {
    const explicitForms = [
      `『${normalizedTitle}』`,
      `「${normalizedTitle}」`,
      `**${normalizedTitle}**`,
      `**『${normalizedTitle}』**`,
      `**「${normalizedTitle}」**`,
    ].map((value) => value.toLocaleLowerCase());
    if (explicitForms.some((value) => haystack.includes(value))) return true;
    const keywords = normalizedText.match(/^keywords:\s*(.+)$/m)?.[1]
      ?.split(",")
      .map((value) => value.normalize("NFKC").trim().toLocaleLowerCase()) ?? [];
    return keywords.includes(needle);
  }
  return haystack.includes(needle);
}

function loadLetters(): Letter[] {
  return fs.readdirSync(LETTER_ROOT)
    .filter((name) => name.endsWith(".md"))
    .sort()
    .map((file) => {
      const text = fs.readFileSync(path.join(LETTER_ROOT, file), "utf8");
      const slug = text.match(/^slug:\s*(.+)$/m)?.[1]?.trim() ?? "";
      return { file, slug, text };
    });
}

(async () => {
  const works = dedupeWorks(await loadMergedWorksServer());
  const editorial = editorialJson as { items?: Array<{ workId?: unknown; workIds?: unknown[] }> };
  const covered = new Set<string>();
  for (const item of editorial.items ?? []) {
    const ids = [
      String(item.workId ?? "").trim(),
      ...((item.workIds ?? []).map((value) => String(value ?? "").trim())),
    ].filter(Boolean);
    for (const id of ids) covered.add(id);
  }

  const ownerIndex = ownerIndexJson as {
    works?: Array<{
      workId: string;
      reviewedPacket?: null | {
        evidenceStrength?: string;
        ownerIntentStatus?: string;
        lyricsStatus?: string;
      };
      candidateSummary?: {
        ownerMessageCandidates?: number;
        aiMessageCandidates?: number;
        wrapperCandidates?: number;
      };
    }>;
  };
  const indexById = new Map((ownerIndex.works ?? []).map((row) => [String(row.workId), row]));
  const letters = loadLetters();

  const ranked: RankedRow[] = [];
  for (const work of works) {
    const id = String(work.id ?? "").trim();
    const title = String(work.title ?? "").trim();
    if (!id || !title || covered.has(id)) continue;

    const lowerTitle = title.toLocaleLowerCase();
    const letterSources = letters
      .filter((letter) => letterMentionsTitle(letter.text, title))
      .map((letter) => ({ file: letter.file, href: letter.slug ? `/letters/${letter.slug}` : "" }));

    const idx = indexById.get(id);
    const ownerCandidates = Number(idx?.candidateSummary?.ownerMessageCandidates ?? 0);
    const aiCandidates = Number(idx?.candidateSummary?.aiMessageCandidates ?? 0);
    const wrapperCandidates = Number(idx?.candidateSummary?.wrapperCandidates ?? 0);
    const packet = idx?.reviewedPacket ?? null;

    let score = recencyScore(String(work.releasedAt ?? work.distribution?.releaseDate ?? ""));
    const reasons: string[] = [];
    if (score) reasons.push("recency");

    if (letterSources.length) {
      score += 120 + Math.min(letterSources.length - 1, 3) * 20;
      reasons.push(`ownerPublishedLetter:${letterSources.length}`);
    }
    if (ownerCandidates) {
      score += Math.min(ownerCandidates, 3) * 35;
      reasons.push(`ownerMessageCandidate:${ownerCandidates}`);
    }
    if (packet) {
      const strength = String(packet.evidenceStrength ?? "");
      score += strength === "STRONG" ? 100 : strength.includes("STRONG") ? 80 : 45;
      reasons.push(`reviewedPacket:${strength || "present"}`);
    }
    if (aiCandidates) {
      score += Math.min(aiCandidates, 3) * 5;
      reasons.push(`aiCandidate:${aiCandidates}`);
    }
    if (wrapperCandidates > ownerCandidates + aiCandidates) {
      score -= Math.min(wrapperCandidates, 20);
      reasons.push("wrapperHeavy");
    }

    ranked.push({
      workId: id,
      title,
      type: String(work.type ?? ""),
      releasedAt: String(work.releasedAt ?? work.distribution?.releaseDate ?? ""),
      score,
      reasons,
      letterSources,
      ownerMessageCandidates: ownerCandidates,
      aiMessageCandidates: aiCandidates,
      wrapperCandidates,
      reviewedPacket: packet ? {
        evidenceStrength: String(packet.evidenceStrength ?? ""),
        ownerIntentStatus: String(packet.ownerIntentStatus ?? ""),
        lyricsStatus: String(packet.lyricsStatus ?? ""),
      } : null,
    });
  }

  ranked.sort((a, b) => b.score - a.score || String(b.releasedAt).localeCompare(String(a.releasedAt)) || a.title.localeCompare(b.title, "ja"));

  const musicCovered = works.filter((work) => String(work.type) === "music" && covered.has(String(work.id ?? ""))).length;
  const musicTotal = works.filter((work) => String(work.type) === "music").length;
  const letterBacklog = ranked.filter((row) => row.letterSources.length > 0);
  const ownerCandidateBacklog = ranked.filter((row) => row.ownerMessageCandidates > 0);

  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: "COVERAGE_V2_LOCAL",
    snapshotDate: "2026-09-30",
    coverage: {
      editorialRows: (editorial.items ?? []).length,
      staticUniqueWorks: works.length,
      staticUniqueMusicWorks: musicTotal,
      staticMusicWorksWithEditorial: musicCovered,
      staticMusicEditorialCoveragePct: Number(((musicCovered / Math.max(musicTotal, 1)) * 100).toFixed(2)),
    },
    backlog: {
      uncoveredWorks: ranked.length,
      worksWithOwnerPublishedLetter: letterBacklog.length,
      worksWithOwnerMessageCandidates: ownerCandidateBacklog.length,
    },
    selectionPolicy: [
      "reviewed owner/official packet",
      "owner-published Letter",
      "owner-message candidate",
      "recency",
      "AI candidate only as locator, never owner intent",
      "wrapper-heavy sources are demoted",
    ],
    nextRecommended: ranked.slice(0, 50),
  };

  fs.writeFileSync(OUT, JSON.stringify(output, null, 2) + "\n");
  console.log(JSON.stringify({
    verdict: "OWNER_SOURCE_KNOWLEDGE_COVERAGE_RANKING=BUILT",
    coverage: output.coverage,
    backlog: output.backlog,
    top10: output.nextRecommended.slice(0, 10).map((row) => ({ workId: row.workId, title: row.title, score: row.score, reasons: row.reasons })),
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
