import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ledgerPath = path.join(root, "ops/audience-engine/abi-hakusyaku-launch-wave-01-ledger.csv");
const outputPath = path.join(root, "ops/audience-engine/abi-hakusyaku-launch-wave-01-maturity-queue.json");

function parseCsv(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) { values.push(value); value = ""; }
    else value += character;
  }
  values.push(value);
  return values;
}

const lines = fs.readFileSync(ledgerPath, "utf8").trim().split("\n");
const header = parseCsv(lines[0]);
const index = Object.fromEntries(header.map((name, position) => [name, position]));
const metric24h = header.slice(index.views_24h, index.views_72h);
const metric72h = header.slice(index.views_72h, index.chat_sessions);
const now = Date.now();

const placements = lines.slice(1).map((line) => {
  const values = parseCsv(line);
  const status = values[index.status];
  const publishedAt = values[index.published_at];
  const notes = values[index.notes] ?? "";
  const ageMs = status === "PUBLISHED" && publishedAt ? now - Date.parse(publishedAt) : Number.NEGATIVE_INFINITY;
  const resolved24h = notes.includes("[24h-resolved]") || metric24h.every((name) => values[index[name]] !== "");
  const resolved72h = notes.includes("[72h-resolved]") || metric72h.every((name) => values[index[name]] !== "");
  const state = (hours, resolved) => status !== "PUBLISHED"
    ? "NOT_PUBLISHED"
    : ageMs < hours * 60 * 60 * 1000
      ? "WAITING"
      : resolved
        ? "RESOLVED"
        : "DUE";
  return {
    placementId: values[index.placement_id],
    platform: values[index.platform],
    publicUrl: values[index.public_url],
    publishedAt: publishedAt || null,
    ageHours: Number.isFinite(ageMs) ? Number((ageMs / 3_600_000).toFixed(2)) : null,
    measurement24h: {
      state: state(24, resolved24h),
      missingFields: metric24h.filter((name) => values[index[name]] === ""),
    },
    measurement72h: {
      state: state(72, resolved72h),
      missingFields: metric72h.filter((name) => values[index[name]] === ""),
    },
  };
});

const due24h = placements.filter((item) => item.measurement24h.state === "DUE");
const due72h = placements.filter((item) => item.measurement72h.state === "DUE");
const waitingTimes = placements.flatMap((item) => {
  if (!item.publishedAt) return [];
  const published = Date.parse(item.publishedAt);
  return [24, 72].flatMap((hours) => {
    const field = hours === 24 ? item.measurement24h : item.measurement72h;
    return field.state === "WAITING" ? [published + hours * 3_600_000] : [];
  });
});
const output = {
  schemaVersion: 1,
  generatedAt: new Date(now).toISOString(),
  evidenceClass: "LEDGER_MATURITY_DERIVATION",
  summary: {
    published: placements.filter((item) => item.publishedAt).length,
    due24h: due24h.length,
    due72h: due72h.length,
    resolved24h: placements.filter((item) => item.measurement24h.state === "RESOLVED").length,
    resolved72h: placements.filter((item) => item.measurement72h.state === "RESOLVED").length,
    nextMaturityAt: waitingTimes.length > 0 ? new Date(Math.min(...waitingTimes)).toISOString() : null,
  },
  duePlacementIds: [...new Set([...due24h, ...due72h].map((item) => item.placementId))],
  placements,
  resolutionContract: "After a mature owner-insights attempt, preserve unavailable metrics as blank and append [24h-resolved] and/or [72h-resolved] to notes with a short unavailable-field explanation. Never use zero to mean unavailable.",
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ status: "PASS", ...output.summary, duePlacementIds: output.duePlacementIds }, null, 2));
