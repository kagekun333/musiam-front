import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=")];
}));
const startDate = String(args["start-date"] || "").trim();
const days = Number(args.days || 7);
if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !Number.isInteger(days) || days < 1 || days > 31) {
  throw new Error("usage: node scripts/build-daily-music-release-wave.mjs --start-date=YYYY-MM-DD [--days=7] [--output-dir=<path>]");
}

const outputDir = path.resolve(args["output-dir"] || "ops/audience-engine/daily-music-release-candidates");
fs.mkdirSync(outputDir, { recursive: true });
const waveId = `DMW-${startDate.replaceAll("-", "")}-${days}D`;
const manifestPath = path.join(outputDir, `${waveId}--manifest.json`);
const catalogRaw = JSON.parse(fs.readFileSync("public/works/works.json", "utf8"));
const catalog = Array.isArray(catalogRaw) ? catalogRaw : catalogRaw.items ?? catalogRaw.works ?? [];
const alreadyCandidate = new Set();
for (const name of fs.readdirSync(outputDir).filter((name) => name.endsWith(".json"))) {
  try {
    const value = JSON.parse(fs.readFileSync(path.join(outputDir, name), "utf8"));
    if (value.work?.id) alreadyCandidate.add(String(value.work.id));
    for (const entry of value.releases || []) if (entry.workId) alreadyCandidate.add(String(entry.workId));
  } catch { /* validator will reject malformed files when selected explicitly */ }
}

const eligible = catalog
  .filter((work) => String(work.type || "").toLowerCase() === "music")
  .filter((work) => work.id && work.title && work.cover)
  .filter((work) => /^https:\/\//.test(String(work.links?.spotify || work.links?.listen || work.primaryHref || work.href || "")))
  .filter((work) => !alreadyCandidate.has(String(work.id)))
  .sort((a, b) => String(b.releasedAt || "").localeCompare(String(a.releasedAt || "")) || String(a.id).localeCompare(String(b.id)));
if (eligible.length < days) throw new Error(`only ${eligible.length} unused canonical music works are eligible for ${days} days`);
let selected = eligible.slice(0, days);
if (args.overwrite === "true" && fs.existsSync(manifestPath)) {
  const existingManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  selected = existingManifest.releases.map((release) => catalog.find((work) => String(work.id) === String(release.workId)));
  if (selected.some((work) => !work) || selected.length !== days) throw new Error("existing wave cannot be safely regenerated from the canonical catalog");
}

const dateAt = (offset) => {
  const value = new Date(`${startDate}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offset);
  return value.toISOString().slice(0, 10);
};
const releases = [];
for (let index = 0; index < days; index += 1) {
  const work = selected[index];
  const date = dateAt(index);
  const scheduledAt = `${date}T03:15:00.000Z`;
  const compactWorkId = String(work.id).replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
  const output = path.join(outputDir, `${date}--${compactWorkId}.json`);
  const childArgs = ["scripts/build-daily-music-release-pack.mjs", `--work-id=${work.id}`, `--date=${date}`, `--output=${output}`];
  if (args.overwrite === "true") childArgs.push("--overwrite=true");
  const run = spawnSync(process.execPath, childArgs, { cwd: root, encoding: "utf8" });
  if (run.status !== 0) throw new Error(run.stderr || run.stdout || `pack generation failed: ${work.id}`);
  const pack = JSON.parse(fs.readFileSync(output, "utf8"));
  for (const placement of pack.placements) placement.scheduledAt = scheduledAt;
  fs.writeFileSync(output, `${JSON.stringify(pack, null, 2)}\n`);
  releases.push({ date, scheduledAt, workId: work.id, title: work.title, releasedAt: work.releasedAt || null, candidatePath: path.relative(root, output), releaseId: pack.releaseId, placementIds: pack.placements.map((item) => item.placementId), approvalTokens: pack.placements.map((item) => item.approvalToken) });
}

const manifest = {
  schemaVersion: 1,
  waveId,
  createdAt: new Date().toISOString(),
  startDate,
  days,
  selection: "newest unused canonical music works with cover and public listen URL; copy never claims a historical work is a new release",
  schedulePolicy: "One canonical work per day at 12:15 JST; a placement is due only after scheduledAt, exact Human approval and immediate media preflight.",
  releases,
  batchApprovalToken: `APPROVE_DAILY_MUSIC_WAVE:${waveId}`,
  publicationState: "HUMAN_APPROVAL_REQUIRED",
  externalPublicationPerformed: false,
  evidenceBoundary: "Candidate preparation only. No publication, reach, demand, pipeline or revenue is asserted.",
};
if (fs.existsSync(manifestPath) && args.overwrite !== "true") throw new Error(`wave manifest already exists: ${path.relative(root, manifestPath)}`);
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: "WAVE_CANDIDATE_READY", waveId, manifest: path.relative(root, manifestPath), releases: releases.length, placements: releases.reduce((sum, item) => sum + item.placementIds.length, 0), externalPublication: "NOT_PERFORMED" }, null, 2));
