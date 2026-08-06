import fs from "node:fs";
import path from "node:path";

const ledgerPath = path.join(process.cwd(), "ops/audience-engine/abi-hakusyaku-launch-wave-01-ledger.csv");
const lines = fs.readFileSync(ledgerPath, "utf8").trim().split("\n");

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

const escapeCsv = (value) => `"${String(value).replaceAll('"', '""')}"`;
const header = parseCsv(lines[0]);
const now = Date.now();
let cleared24h = 0;
let cleared72h = 0;
let clearedUnpublishedDownstream = 0;
const output = [header.map(escapeCsv).join(",")];

for (const line of lines.slice(1)) {
  const values = parseCsv(line);
  const status = values[3];
  const publishedAt = values[5];
  const ageMs = publishedAt ? now - Date.parse(publishedAt) : Number.NEGATIVE_INFINITY;
  if (status !== "PUBLISHED" || ageMs < 24 * 60 * 60 * 1000) {
    for (let index = 7; index <= 13; index += 1) {
      if (values[index] !== "") cleared24h += 1;
      values[index] = "";
    }
  }
  if (status !== "PUBLISHED" || ageMs < 72 * 60 * 60 * 1000) {
    for (let index = 14; index <= 18; index += 1) {
      if (values[index] !== "") cleared72h += 1;
      values[index] = "";
    }
  }
  if (status !== "PUBLISHED") {
    for (let index = 19; index <= 24; index += 1) {
      if (values[index] !== "") clearedUnpublishedDownstream += 1;
      values[index] = "";
    }
  }
  output.push(values.map(escapeCsv).join(","));
}

fs.writeFileSync(ledgerPath, `${output.join("\n")}\n`);
console.log(JSON.stringify({ status: "PASS", rows: output.length - 1, cleared24h, cleared72h, clearedUnpublishedDownstream }, null, 2));
