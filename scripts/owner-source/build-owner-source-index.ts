import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { loadMergedWorksServer } from "../../src/lib/loadMergedWorksServer";
import { dedupeWorks } from "../../src/lib/dedupeWorks";

type CandidateClass =
  | "OWNER_MESSAGE_CANDIDATE"
  | "AI_MESSAGE_CANDIDATE"
  | "WRAPPER_OR_APPROVAL_CONTEXT"
  | "MIXED_ARCHIVE_CANDIDATE";

type SourceCandidate = {
  archive: string;
  relativePath: string;
  role: "USER" | "ASSISTANT" | "MIXED";
  sectionMeta: string;
  classification: CandidateClass;
  lineStart: number;
  lineEnd: number;
  matchedTitle: string;
  signals: string[];
  score: number;
  sectionSha256: string;
  bindingStatus: "UNVERIFIED_TITLE_CANDIDATE";
};

type WorkRow = {
  workId: string;
  title: string;
  type: string;
  releasedAt: string;
  catalogAliases: string[];
  reviewedPacket: null | {
    evidenceStrength: string;
    ownerIntentStatus: string;
    lyricsStatus: string;
    sourceClasses: string[];
    bindingStatus: "REVIEWED_STABLE_ID_PACKET";
  };
  candidateSummary: {
    total: number;
    ownerMessageCandidates: number;
    aiMessageCandidates: number;
    wrapperCandidates: number;
    mixedCandidates: number;
  };
  candidates: SourceCandidate[];
};

const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const PROBE_PATH = path.join(REPO, "ops/product/owner-source-corpus-probe-20260930.json");
const OUT_PATH = path.join(REPO, "ops/product/owner-source-corpus-index-v1.json");

const archiveRoots = [
  {
    name: "MUSIAM_CODEX_EXPORT_MESSAGES",
    path: "/Users/kagekun/Desktop/MUSIAM_CODEX_EXPORT/messages",
    mode: "message_sections" as const,
  },
];

const SIGNALS: { id: string; re: RegExp }[] = [
  { id: "lyrics", re: /歌詞|lyrics?|lyric sheet|official_lyrics/i },
  { id: "suno", re: /\bSuno\b/i },
  { id: "prompt", re: /style prompt|negative prompt|プロンプト|\bprompt\b/i },
  { id: "cover", re: /ジャケット|cover art|cover image|album cover/i },
  { id: "mv", re: /MV|music video|映像|video plan/i },
  { id: "creation", re: /制作|作った|作りたい|作成|compose|composed|create|created/i },
  { id: "revision", re: /修正|直して|変更|revise|revision|adjust/i },
  { id: "theme", re: /テーマ|世界観|theme|concept|motif/i },
  { id: "audio", re: /BPM|楽器|instrument|melody|メロディ|rhythm|リズム|audio/i },
  { id: "reason", re: /なぜ|理由|きっかけ|inspir|because|why/i },
  { id: "title", re: /タイトル|曲名|title/i },
  { id: "language", re: /語で|language|ドイツ語|英語|日本語|中国語|韓国語|フランス語|スペイン語/i },
];

const WRAPPER = /The following is the Codex agent history|APPROVAL REQUEST|Assess the exact planned action|<recommended_plugins>|AGENTS\.md instructions/i;

function sha(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
}

function sectionClass(role: "USER" | "ASSISTANT", text: string): CandidateClass {
  if (WRAPPER.test(text)) return "WRAPPER_OR_APPROVAL_CONTEXT";
  return role === "USER" ? "OWNER_MESSAGE_CANDIDATE" : "AI_MESSAGE_CANDIDATE";
}

function signalIds(text: string): string[] {
  return SIGNALS.filter((signal) => signal.re.test(text)).map((signal) => signal.id);
}

function scoreCandidate(classification: CandidateClass, signals: string[], textLength: number): number {
  const roleBase =
    classification === "OWNER_MESSAGE_CANDIDATE" ? 60
    : classification === "AI_MESSAGE_CANDIDATE" ? 22
    : classification === "MIXED_ARCHIVE_CANDIDATE" ? 12
    : 2;
  return Number((roleBase + Math.min(signals.length * 5, 45) + Math.min(textLength / 1200, 10)).toFixed(2));
}

function parseSections(text: string) {
  const lines = text.split(/\r?\n/);
  const sections: { role: "USER" | "ASSISTANT"; meta: string; lineStart: number; lineEnd: number; text: string }[] = [];
  let current: null | { role: "USER" | "ASSISTANT"; meta: string; lineStart: number; body: string[] } = null;
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^## (USER|ASSISTANT)\s*(.*)$/);
    if (match) {
      if (current) {
        sections.push({
          role: current.role,
          meta: current.meta,
          lineStart: current.lineStart,
          lineEnd: i,
          text: current.body.join("\n").trim(),
        });
      }
      current = {
        role: match[1] as "USER" | "ASSISTANT",
        meta: match[2].trim(),
        lineStart: i + 1,
        body: [],
      };
    } else if (current) {
      current.body.push(lines[i]);
    }
  }
  if (current) {
    sections.push({
      role: current.role,
      meta: current.meta,
      lineStart: current.lineStart,
      lineEnd: lines.length,
      text: current.body.join("\n").trim(),
    });
  }
  return sections;
}

function listMarkdownFiles(root: string) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root)
    .filter((name) => name.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => path.join(root, name));
}

(async () => {
  const probe = JSON.parse(fs.readFileSync(PROBE_PATH, "utf8"));
  const staticWorks = dedupeWorks(await loadMergedWorksServer());

  const byId = new Map<string, WorkRow>();
  for (const work of staticWorks) {
    const id = String(work.id ?? "").trim();
    const title = String(work.title ?? "").trim();
    if (!id || !title) continue;
    byId.set(id, {
      workId: id,
      title,
      type: String(work.type ?? ""),
      releasedAt: String(work.releasedAt ?? work.distribution?.releaseDate ?? ""),
      catalogAliases: (work.catalogAliases ?? []).map(String),
      reviewedPacket: null,
      candidateSummary: { total: 0, ownerMessageCandidates: 0, aiMessageCandidates: 0, wrapperCandidates: 0, mixedCandidates: 0 },
      candidates: [],
    });
  }

  for (const packet of probe.works ?? []) {
    const id = String(packet.primaryRuntimeId ?? "").trim();
    if (!id) continue;
    const row = byId.get(id) ?? {
      workId: id,
      title: String(packet.title ?? ""),
      type: "music",
      releasedAt: String(packet.releaseDate ?? ""),
      catalogAliases: (packet.additionalStableIds ?? []).map(String),
      reviewedPacket: null,
      candidateSummary: { total: 0, ownerMessageCandidates: 0, aiMessageCandidates: 0, wrapperCandidates: 0, mixedCandidates: 0 },
      candidates: [],
    };
    const classes = Array.from(new Set((packet.sources ?? []).map((source: any) => String(source.class ?? "")).filter(Boolean)));
    row.reviewedPacket = {
      evidenceStrength: String(packet.evidenceStrength ?? "UNKNOWN"),
      ownerIntentStatus: String(packet.ownerIntentStatus ?? "UNKNOWN"),
      lyricsStatus: String(packet.lyricsStatus ?? "UNKNOWN"),
      sourceClasses: classes,
      bindingStatus: "REVIEWED_STABLE_ID_PACKET",
    };
    byId.set(id, row);
  }

  const titleMap = new Map<string, WorkRow[]>();
  for (const row of byId.values()) {
    const title = row.title.normalize("NFKC").trim();
    if (!title || title.length < 3) continue;
    const list = titleMap.get(title) ?? [];
    list.push(row);
    titleMap.set(title, list);
  }

  const titlePatterns = [...titleMap.keys()].sort((a, b) => b.length - a.length);
  const titleRegex = new RegExp(titlePatterns.map(escapeRegex).join("|"), "gu");

  let filesScanned = 0;
  let sectionsScanned = 0;
  let titleMentions = 0;

  for (const archive of archiveRoots) {
    for (const file of listMarkdownFiles(archive.path)) {
      filesScanned += 1;
      const full = fs.readFileSync(file, "utf8");
      const sections = parseSections(full);
      sectionsScanned += sections.length;
      for (const section of sections) {
        const normalizedText = section.text.normalize("NFKC");
        const matchedTitles = new Set<string>();
        titleRegex.lastIndex = 0;
        for (const match of normalizedText.matchAll(titleRegex)) {
          matchedTitles.add(match[0]);
        }
        if (!matchedTitles.size) continue;
        const classification = sectionClass(section.role, section.text);
        const signals = signalIds(section.text);
        for (const matchedTitle of matchedTitles) {
          const targets = titleMap.get(matchedTitle) ?? [];
          for (const target of targets) {
            titleMentions += 1;
            target.candidates.push({
              archive: archive.name,
              relativePath: path.relative(archive.path, file),
              role: section.role,
              sectionMeta: section.meta,
              classification,
              lineStart: section.lineStart,
              lineEnd: section.lineEnd,
              matchedTitle,
              signals,
              score: scoreCandidate(classification, signals, section.text.length),
              sectionSha256: sha(section.text),
              bindingStatus: "UNVERIFIED_TITLE_CANDIDATE",
            });
          }
        }
      }
    }
  }

  let worksWithCandidates = 0;
  let ownerMessageCandidates = 0;
  let aiMessageCandidates = 0;
  let wrapperCandidates = 0;

  const works = [...byId.values()]
    .map((row) => {
      row.candidates.sort((a, b) => b.score - a.score || a.relativePath.localeCompare(b.relativePath));
      const deduped: SourceCandidate[] = [];
      const seen = new Set<string>();
      for (const candidate of row.candidates) {
        const key = [candidate.archive, candidate.relativePath, candidate.lineStart, candidate.sectionSha256].join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(candidate);
        if (deduped.length >= 12) break;
      }
      row.candidates = deduped;
      row.candidateSummary = {
        total: deduped.length,
        ownerMessageCandidates: deduped.filter((c) => c.classification === "OWNER_MESSAGE_CANDIDATE").length,
        aiMessageCandidates: deduped.filter((c) => c.classification === "AI_MESSAGE_CANDIDATE").length,
        wrapperCandidates: deduped.filter((c) => c.classification === "WRAPPER_OR_APPROVAL_CONTEXT").length,
        mixedCandidates: deduped.filter((c) => c.classification === "MIXED_ARCHIVE_CANDIDATE").length,
      };
      if (deduped.length) worksWithCandidates += 1;
      ownerMessageCandidates += row.candidateSummary.ownerMessageCandidates;
      aiMessageCandidates += row.candidateSummary.aiMessageCandidates;
      wrapperCandidates += row.candidateSummary.wrapperCandidates;
      return row;
    })
    .sort((a, b) => a.title.localeCompare(b.title, "ja"));

  const core = {
    status: "INDEX_V1_NON_RUNTIME",
    bindingPolicy: {
      reviewedPacket: "REVIEWED_STABLE_ID_PACKET",
      archiveTitleMatch: "UNVERIFIED_TITLE_CANDIDATE",
      titleOnlyMayEnterRuntime: false,
      aiMessageMayBecomeOwnerIntentAutomatically: false,
    },
    archives: archiveRoots.map((root) => ({ name: root.name, path: root.path, exists: fs.existsSync(root.path) })),
    summary: {
      worksIndexed: works.length,
      reviewedPackets: works.filter((w) => w.reviewedPacket).length,
      worksWithCandidates,
      filesScanned,
      sectionsScanned,
      titleMentions,
      ownerMessageCandidates,
      aiMessageCandidates,
      wrapperCandidates,
    },
    works,
  };
  const output = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    indexFingerprint: sha(JSON.stringify(core)),
    ...core,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + "\n");
  console.log(JSON.stringify({ verdict: "OWNER_SOURCE_CORPUS_INDEX_V1=BUILT", ...output.summary, out: OUT_PATH }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
