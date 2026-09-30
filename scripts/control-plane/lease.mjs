import fs from "node:fs";
import path from "node:path";
import { config, currentState, REPO } from "./_shared.mjs";

const cfg = config();
const leasePath = path.join(REPO, cfg.leasePath);
fs.mkdirSync(path.dirname(leasePath), { recursive: true });

const [action = "status", ...argv] = process.argv.slice(2);

function arg(name, fallback = null) {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] ?? fallback : fallback;
}

function readLease() {
  if (!fs.existsSync(leasePath)) return null;
  try { return JSON.parse(fs.readFileSync(leasePath, "utf8")); }
  catch { return { invalid: true }; }
}

function expired(lease) {
  return Boolean(lease?.expiresAt && Date.parse(lease.expiresAt) <= Date.now());
}

if (action === "status") {
  const lease = readLease();
  console.log(JSON.stringify({ active: Boolean(lease && !expired(lease)), expired: Boolean(lease && expired(lease)), lease }, null, 2));
  process.exit(0);
}

if (action === "acquire") {
  const task = arg("task");
  const owner = arg("owner");
  const allow = (arg("allow", "") || "").split(",").map((x) => x.trim()).filter(Boolean);
  const deny = (arg("deny", "") || "").split(",").map((x) => x.trim()).filter(Boolean);
  const ttlMinutes = Math.max(5, Math.min(1440, Number(arg("ttl-minutes", "120")) || 120));
  if (!task || !owner) {
    console.error("Usage: lease.mjs acquire --task <id> --owner <agent> [--allow a,b] [--deny x,y] [--ttl-minutes 120]");
    process.exit(2);
  }
  const prior = readLease();
  if (prior && !expired(prior)) {
    console.error(JSON.stringify({ error: "LEASE_CONFLICT", lease: prior }, null, 2));
    process.exit(3);
  }
  if (prior && expired(prior)) fs.rmSync(leasePath, { force: true });
  const state = currentState();
  const now = new Date();
  const lease = {
    schemaVersion: 1,
    task,
    owner,
    startingHead: state.head,
    branch: state.branch,
    allowedPaths: allow,
    deniedPaths: Array.from(new Set([...cfg.humanOwnedPaths, ...cfg.protectedRoots, ...deny])),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMinutes * 60_000).toISOString(),
  };
  try {
    const fd = fs.openSync(leasePath, "wx", 0o600);
    fs.writeFileSync(fd, JSON.stringify(lease, null, 2) + "\n");
    fs.closeSync(fd);
  } catch (error) {
    console.error(JSON.stringify({ error: "LEASE_ACQUIRE_FAILED", message: error?.code ?? "UNKNOWN" }, null, 2));
    process.exit(4);
  }
  console.log(JSON.stringify({ acquired: true, lease }, null, 2));
  process.exit(0);
}

if (action === "release") {
  const task = arg("task");
  const lease = readLease();
  if (!lease) {
    console.log(JSON.stringify({ released: false, reason: "NO_ACTIVE_LEASE" }, null, 2));
    process.exit(0);
  }
  if (!task || lease.task !== task) {
    console.error(JSON.stringify({ error: "LEASE_TASK_MISMATCH", expectedTask: lease.task }, null, 2));
    process.exit(3);
  }
  fs.rmSync(leasePath, { force: true });
  console.log(JSON.stringify({ released: true, task }, null, 2));
  process.exit(0);
}

console.error(`Unknown action: ${action}`);
process.exit(2);
