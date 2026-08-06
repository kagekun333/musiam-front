import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const locale = process.env.METAL_PRINT_CAMPAIGN_LOCALE === "en" ? "en" : "ja";
const suffix = locale === "en" ? "-en" : "";
const planPath = path.join(root, "ops", "metal-print-vip", `campaign-distribution-plan${suffix}-2026-07.csv`);
const ledgerPath = path.join(root, "ops", "metal-print-vip", `campaign-execution-ledger${suffix}-2026-07.csv`);
const columns = ["placement_id", "asset_id", "channel", "approval_state", "approval_token", "scheduled_at", "published_at", "published_url", "spend_yen", "notes"] as const;
type Row = Record<(typeof columns)[number], string>;

const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
const plan = parse(fs.readFileSync(planPath, "utf8"), { columns: true, skip_empty_lines: true }) as Record<string, string>[];
const existing = fs.existsSync(ledgerPath)
  ? parse(fs.readFileSync(ledgerPath, "utf8"), { columns: true, skip_empty_lines: true }) as Row[]
  : [];
const byId = new Map(existing.map((row) => [row.placement_id, row]));

const rows: Row[] = plan.map((item) => {
  const placementId = `${item.asset_id}:${item.channel}`;
  return byId.get(placementId) ?? {
    placement_id: placementId,
    asset_id: item.asset_id,
    channel: item.channel,
    approval_state: "HUMAN_APPROVAL_REQUIRED",
    approval_token: "",
    scheduled_at: "",
    published_at: "",
    published_url: "",
    spend_yen: "0",
    notes: "",
  };
});

const output = [columns.join(","), ...rows.map((row) => columns.map((column) => escapeCsv(row[column] ?? "")).join(","))].join("\n") + "\n";
fs.writeFileSync(ledgerPath, output);
console.log(`metal-print campaign execution: ${rows.length} placements synchronized; ${rows.filter((row) => row.approval_state === "PUBLISHED").length} published`);
