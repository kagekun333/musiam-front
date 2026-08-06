import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=")];
}));
if (!args.input) throw new Error("usage: node scripts/build-daily-music-publication-queue.mjs --input=<manifest.json> [--now=<ISO>] [--output=<json>]");

const manifest = JSON.parse(fs.readFileSync(path.resolve(args.input), "utf8"));
const now = args.now ? new Date(args.now) : new Date();
assert.ok(Number.isFinite(now.getTime()), "invalid --now timestamp");
const rows = [];

for (const release of manifest.releases) {
  const candidate = JSON.parse(fs.readFileSync(path.resolve(release.candidatePath), "utf8"));
  assert.equal(candidate.work.id, release.workId);
  for (const placement of candidate.placements) {
    const approved = placement.publicationState === "APPROVED_WAITING_SCHEDULE";
    const published = placement.publicationState === "PUBLISHED";
    const due = approved && Date.parse(placement.scheduledAt) <= now.getTime();
    const ingressReady = placement.ingress?.status === "READY";
    let mediaPath = null;
    if (["vertical_video", "long_form_video"].includes(placement.media?.kind)) mediaPath = path.resolve(placement.media.path || "");
    if (placement.media?.kind === "cover_image") mediaPath = path.join(process.cwd(), "public", String(placement.media.path || "").replace(/^\/+/, ""));
    const mediaExists = Boolean(mediaPath && fs.existsSync(mediaPath));
    const mediaSha256 = mediaExists ? crypto.createHash("sha256").update(fs.readFileSync(mediaPath)).digest("hex") : null;
    const approvedSha256 = placement.approvedMediaSha256 ?? null;
    const mediaHashMatches = mediaExists && mediaSha256 === approvedSha256;
    const executable = due && ingressReady && mediaHashMatches && !published;
    const reasons = [];
    if (published) reasons.push("ALREADY_PUBLISHED");
    else if (!approved) reasons.push("HUMAN_APPROVAL_REQUIRED");
    else if (!due) reasons.push("WAITING_SCHEDULE");
    if (!ingressReady) reasons.push(placement.ingress?.status || "INGRESS_NOT_READY");
    if (!mediaExists) reasons.push("MEDIA_MISSING");
    else if (!mediaHashMatches) reasons.push("MEDIA_HASH_MISMATCH");
    if (executable) reasons.push("EXECUTABLE_APPROVED_DUE_READY");
    rows.push({
      placementId: placement.placementId,
      platform: placement.platform,
      workId: candidate.work.id,
      scheduledAt: placement.scheduledAt,
      publicationState: placement.publicationState,
      due,
      ingressReady,
      ingressStatus: placement.ingress?.status ?? "MISSING",
      mediaPath: placement.media?.path ?? null,
      mediaSha256,
      approvedMediaSha256: approvedSha256,
      mediaHashMatches,
      chatUrl: placement.chatUrl,
      publicationFormat: placement.publicationFormat ?? null,
      publicationRequirements: placement.publicationRequirements ?? null,
      executable,
      reasons,
    });
  }
}

const executableRows = rows.filter((row) => row.executable);
const result = {
  schemaVersion: 1,
  generatedAt: now.toISOString(),
  waveId: manifest.waveId,
  summary: {
    placements: rows.length,
    due: rows.filter((row) => row.due).length,
    executable: executableRows.length,
    blockedDue: rows.filter((row) => row.due && !row.executable).length,
    published: rows.filter((row) => row.publicationState === "PUBLISHED").length,
  },
  executablePlacementIds: executableRows.map((row) => row.placementId),
  rows,
  executionRule: "Only executablePlacementIds may proceed to external publication. Rebuild immediately before each post, then register exact public evidence before proceeding to another placement.",
};
if (args.output) fs.writeFileSync(path.resolve(args.output), `${JSON.stringify(result, null, 2)}\n`, { flag: "w" });
console.log(JSON.stringify(result, null, 2));
