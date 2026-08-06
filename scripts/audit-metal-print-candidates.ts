import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scoreSalesCandidate } from "../src/lib/metal-print-sales-engine";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type Work = {
  id?: string;
  title?: string;
  cover?: string;
  type?: string;
  tags?: string[];
  moodTags?: string[];
  matchInfo?: { summary?: string; reason?: string } | string;
  ssd?: { tracks?: { notes?: string }[] };
};

function jpegDimensions(filePath: string): { width: number; height: number } | null {
  const data = fs.readFileSync(filePath);
  if (data.length < 10 || data[0] !== 0xff || data[1] !== 0xd8) return null;
  let offset = 2;
  const sofMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  while (offset + 9 < data.length) {
    if (data[offset] !== 0xff) { offset += 1; continue; }
    let marker = data[offset + 1];
    offset += 2;
    while (marker === 0xff && offset < data.length) {
      marker = data[offset];
      offset += 1;
    }
    if (marker === 0xd8 || marker === 0xd9) continue;
    const length = data.readUInt16BE(offset);
    if (length < 2 || offset + length > data.length) return null;
    if (sofMarkers.has(marker)) {
      return { height: data.readUInt16BE(offset + 3), width: data.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  return null;
}

function readWorks(relativePath: string): Work[] {
  const json = JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
  return Array.isArray(json) ? json : json.items ?? json.works ?? [];
}

function descriptionLength(work: Work): number {
  const matchInfo = typeof work.matchInfo === "string"
    ? work.matchInfo
    : `${work.matchInfo?.summary ?? ""} ${work.matchInfo?.reason ?? ""}`;
  const notes = work.ssd?.tracks?.map((track) => track.notes ?? "").join(" ") ?? "";
  return `${matchInfo} ${notes}`.trim().length;
}

const baseWorks = readWorks("public/works/works.json");
const ssdWorks = readWorks("public/works/works-ssd.json");
const state = JSON.parse(fs.readFileSync(path.join(root, "ops/metal-print-vip/state.json"), "utf8"));
const verifiedMasterTitles = new Set<string>(
  (state.editionLocks ?? []).map((lock: { workTitle?: string }) => String(lock.workTitle ?? "").toLowerCase()),
);
const merged = new Map<string, Work>();
for (const work of baseWorks) if (work.id) merged.set(work.id, work);
for (const work of ssdWorks) {
  if (!work.id) continue;
  merged.set(work.id, { ...merged.get(work.id), ...work, tags: work.tags ?? merged.get(work.id)?.tags });
}

const candidates = [...merged.values()]
  .map((work) => {
    const cover = String(work.cover ?? "");
    const coverPath = path.join(root, "public", cover);
    const localCover = cover.startsWith("/") && fs.existsSync(coverPath);
    const pixels = localCover ? jpegDimensions(coverPath) : null;
    const longSide = pixels ? Math.max(pixels.width, pixels.height) : 0;
    const moodTags = work.moodTags ?? [];
    const description = descriptionLength(work);
    const narrative = typeof work.matchInfo === "string"
      ? work.matchInfo
      : `${work.matchInfo?.summary ?? ""} ${work.matchInfo?.reason ?? ""}`.trim();
    const scored = scoreSalesCandidate({
      id: String(work.id),
      title: String(work.title),
      moodTags,
      narrative,
      hasLocalCover: localCover,
      previewLongSide: longSide,
      hasPrintMaster: verifiedMasterTitles.has(String(work.title ?? "").toLowerCase()),
    });
    return {
      id: work.id,
      title: work.title,
      type: work.type,
      cover,
      localCover,
      previewPixels: pixels,
      requiresPrintMaster: longSide < 4000,
      moodTags,
      descriptionLength: description,
      salesHypothesis: scored,
      score: scored.score,
    };
  })
  .filter((candidate) => candidate.localCover && candidate.title && candidate.id)
  .sort((a, b) => b.score - a.score || String(a.title).localeCompare(String(b.title), "en"));

const output = {
  eligibleCount: candidates.length,
  reviewShortlist: candidates.slice(0, 24),
  note: "This is a catalog-based sales-hypothesis shortlist, not demand proof or an approved Edition selection. Rights, physical proof, vendor capability, customer evidence, and visual review remain required."
};

console.log(JSON.stringify(output, null, 2));
